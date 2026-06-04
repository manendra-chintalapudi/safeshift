import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getNextMonday, formatDate } from '@/lib/utils/date';
import { redeemDiscount } from '@/lib/rewards/redemption';

/**
 * POST /api/payments/simulate-payout
 * Creates a demo weekly policy for the current week (skips Razorpay)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan_slug, useCoins } = await request.json();
    if (!plan_slug) return NextResponse.json({ error: 'plan_slug required' }, { status: 400 });

    const admin = createAdminClient();

    // Get plan
    const { data: plan } = await admin
      .from('plan_packages')
      .select('*')
      .eq('slug', plan_slug)
      .single();

    const p = plan as unknown as { id: string; weekly_premium_inr: number } | null;
    if (!p) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    // Policy starts next Monday, ends following Sunday
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
      return NextResponse.json({ status: 'ok', message: 'Policy already exists for next week', policy_id: (existing as unknown as { id: string }).id });
    }

    // Apply coin discount if requested
    let coinDiscount = 0;
    if (useCoins) {
      const redemption = await redeemDiscount(user.id);
      if (redemption.success) coinDiscount = redemption.discountInr ?? 0;
    }

    const chargedPremium = Math.max(0, p.weekly_premium_inr - coinDiscount);

    // Create policy as pending_activation (Monday cron will activate)
    const { data: policy, error } = await admin
      .from('weekly_policies')
      .insert({
        profile_id: user.id,
        plan_id: p.id,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        claim_active_from: weekStart,
        base_premium_inr: p.weekly_premium_inr,
        weather_risk_addon: 0,
        ubi_addon: 0,
        final_premium_inr: chargedPremium,
        is_active: false,
        payment_status: 'demo',
        total_payout_this_week: 0,
      } as never)
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark onboarding complete
    await admin
      .from('profiles')
      .update({ onboarding_status: 'complete' } as never)
      .eq('id', user.id);

    return NextResponse.json({
      status: 'ok',
      policy_id: (policy as unknown as { id: string })?.id,
      message: 'Demo policy created',
    });
  } catch (error) {
    console.error('[Payment] Simulate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
