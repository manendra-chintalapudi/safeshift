import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateDynamicPremium } from '@/lib/ml/premium-calc';
import { getNextMonday, formatDate, isSundayPaymentWindow } from '@/lib/utils/date';
import { PLAN_PACKAGES } from '@/lib/config/constants';
import { getBalance } from '@/lib/rewards/redemption';

/**
 * POST /api/driver/reinstate-policy
 * Re-activates a policy using the ML-calculated dynamic premium.
 * Only allowed during the Sunday payment window (6 AM – 11:59 PM IST).
 * Creates a next-week policy with is_active = false (Monday cron activates it).
 */
export async function POST(request: Request) {
  try {
    // Enforce Sunday payment window
    if (!isSundayPaymentWindow()) {
      return NextResponse.json(
        { error: 'Payment window is only open on Sundays (6 AM – 11:59 PM IST).' },
        { status: 403 },
      );
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tier, coinsToRedeem } = await request.json();
    if (!tier) return NextResponse.json({ error: 'tier required' }, { status: 400 });

    const admin = createAdminClient();

    // Get plan_id from plan_packages table
    const { data: plan } = await admin
      .from('plan_packages')
      .select('id')
      .eq('slug', tier)
      .single();

    const planRow = plan as unknown as { id: string } | null;
    if (!planRow) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    // Policy is for next week (Mon-Sun)
    const nextMonday = getNextMonday();
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    const weekStart = formatDate(nextMonday);
    const weekEnd = formatDate(nextSunday);

    // Check if policy already exists for next week
    const { data: existing } = await admin
      .from('weekly_policies')
      .select('id')
      .eq('profile_id', user.id)
      .eq('week_start_date', weekStart)
      .single();

    if (existing) {
      return NextResponse.json({
        status: 'ok',
        message: 'Policy already paid for next week',
        policy_id: (existing as unknown as { id: string }).id,
      });
    }

    // Calculate dynamic premium via ML service
    const premium = await calculateDynamicPremium(user.id, tier);
    const planConfig = PLAN_PACKAGES.find((p) => p.slug === tier);

    // Apply coin discount if requested
    let coinDiscount = 0;
    let coinsDeducted = 0;
    if (coinsToRedeem && coinsToRedeem > 0) {
      const validAmounts = [100, 200, 300, 400, 500];
      const amount = validAmounts.includes(coinsToRedeem) ? coinsToRedeem : 0;
      if (amount > 0) {
        const balance = await getBalance(user.id);
        if (balance >= amount) {
          if (amount === 500) {
            // 500 coins = 50% off premium
            coinDiscount = Math.round(premium.finalPremium * 0.5);
          } else {
            // 100 coins = ₹5 off, scales linearly
            coinDiscount = (amount / 100) * 5;
          }
          // Deduct coins from ledger
          await admin.from('coins_ledger').insert({
            profile_id: user.id,
            activity: 'redeemed_discount',
            coins: -amount,
            description: amount === 500
              ? `Redeemed ${amount} coins for 50% off (₹${coinDiscount} discount)`
              : `Redeemed ${amount} coins for ₹${coinDiscount} discount`,
          } as never);
          coinsDeducted = amount;
        }
      }
    }

    const chargedPremium = Math.max(0, premium.finalPremium - coinDiscount);

    // Create policy as pending_activation (Monday cron will activate)
    const { data: policy, error } = await admin
      .from('weekly_policies')
      .insert({
        profile_id: user.id,
        plan_id: planRow.id,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        claim_active_from: weekStart,
        base_premium_inr: premium.basePremium,
        weather_risk_addon: premium.weatherRisk,
        ubi_addon: premium.ubiAddon,
        final_premium_inr: chargedPremium,
        premium_reasoning: premium.reasoning,
        is_active: false,
        payment_status: 'demo',
        total_payout_this_week: 0,
      } as never)
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      status: 'ok',
      policy_id: (policy as unknown as { id: string })?.id,
      coin_discount: coinDiscount,
      coins_deducted: coinsDeducted,
      week_start: weekStart,
      premium: {
        base: premium.basePremium,
        weatherRisk: premium.weatherRisk,
        ubiAddon: premium.ubiAddon,
        final: chargedPremium,
        reasoning: premium.reasoning,
      },
      plan: planConfig?.name ?? tier,
    });
  } catch (error) {
    console.error('[ReinstatePolicy] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
