// ============================================================================
// GET /api/cron/auto-renew — Auto-create next-week policies for drivers
//                             with auto_renew_enabled = true
// ============================================================================
//
// Runs Sunday morning (6:30 AM IST) within the payment window.
// For each eligible driver:
//   1. Find their most recent policy to determine plan
//   2. Skip if next-week policy already exists (manual reinstate or prior run)
//   3. Use pre-calculated premium from premium_recommendations, or calculate live
//   4. Insert weekly_policies row (is_active=false, payment_status='demo')
//   5. Log result to system_logs
// ============================================================================

import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/utils/admin-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateDynamicPremium } from '@/lib/ml/premium-calc';
import { getNextMonday, formatDate } from '@/lib/utils/date';
import { logSystemEvent } from '@/lib/adjudicator/ledger';

interface DriverRow {
  id: string;
  city: string | null;
}

interface LastPolicyRow {
  plan_id: string;
  plan_packages: { slug: string } | null;
}

interface PremiumRecommendation {
  base_premium: number;
  weather_risk: number;
  ubi_adjustment: number;
  final_premium: number;
  reasoning: string | null;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Calculate next week boundaries
    const nextMonday = getNextMonday();
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    const weekStart = formatDate(nextMonday);
    const weekEnd = formatDate(nextSunday);

    // Fetch all drivers with auto-renew enabled
    const { data: driversRaw, error: driversError } = await supabase
      .from('profiles')
      .select('id, city')
      .eq('auto_renew_enabled', true)
      .eq('role', 'driver');

    if (driversError) {
      console.error('[AutoRenew] Error fetching drivers:', driversError);
      return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
    }

    const drivers = (driversRaw ?? []) as unknown as DriverRow[];
    if (drivers.length === 0) {
      return NextResponse.json({ status: 'ok', message: 'No auto-renew drivers', total: 0, processed: 0, skipped: 0, errors: 0 });
    }

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const driver of drivers) {
      try {
        // 1. Find most recent policy to get plan
        const { data: lastPolicyRaw } = await supabase
          .from('weekly_policies')
          .select('plan_id, plan_packages(slug)')
          .eq('profile_id', driver.id)
          .order('week_end_date', { ascending: false })
          .limit(1)
          .single();

        const lastPolicy = lastPolicyRaw as unknown as LastPolicyRow | null;

        if (!lastPolicy || !lastPolicy.plan_id) {
          // No previous policy — cannot auto-renew
          await logSystemEvent('auto_renew_skipped', 'info', {
            profile_id: driver.id,
            reason: 'no_previous_policy',
            week_start: weekStart,
          });
          skipped++;
          continue;
        }

        const planSlug = lastPolicy.plan_packages?.slug ?? 'normal';
        const planId = lastPolicy.plan_id;

        // 2. Check if policy already exists for next week (idempotency guard)
        const { data: existing } = await supabase
          .from('weekly_policies')
          .select('id')
          .eq('profile_id', driver.id)
          .eq('week_start_date', weekStart)
          .single();

        if (existing) {
          // Already reinstated (manually or by a prior run)
          skipped++;
          continue;
        }

        // 3. Get premium — try pre-calculated recommendation first
        let basePremium: number;
        let weatherRisk: number;
        let ubiAddon: number;
        let finalPremium: number;
        let reasoning: string;

        const { data: recoRaw } = await supabase
          .from('premium_recommendations')
          .select('base_premium, weather_risk, ubi_adjustment, final_premium, reasoning')
          .eq('profile_id', driver.id)
          .eq('week_start_date', weekStart)
          .single();

        const reco = recoRaw as unknown as PremiumRecommendation | null;

        if (reco) {
          basePremium = reco.base_premium;
          weatherRisk = reco.weather_risk;
          ubiAddon = reco.ubi_adjustment;
          finalPremium = reco.final_premium;
          reasoning = reco.reasoning || 'Pre-calculated premium';
        } else {
          // No recommendation — calculate live (ML service may be down, fallback is built-in)
          const calc = await calculateDynamicPremium(driver.id, planSlug);
          basePremium = calc.basePremium;
          weatherRisk = calc.weatherRisk;
          ubiAddon = calc.ubiAddon;
          finalPremium = calc.finalPremium;
          reasoning = calc.reasoning;
        }

        // 4. Create the policy
        const { data: policy, error: insertError } = await supabase
          .from('weekly_policies')
          .insert({
            profile_id: driver.id,
            plan_id: planId,
            week_start_date: weekStart,
            week_end_date: weekEnd,
            claim_active_from: weekStart,
            base_premium_inr: basePremium,
            weather_risk_addon: weatherRisk,
            ubi_addon: ubiAddon,
            final_premium_inr: finalPremium,
            premium_reasoning: `[Auto-renewed] ${reasoning}`,
            is_active: false,
            payment_status: 'demo',
            total_payout_this_week: 0,
          } as never)
          .select('id')
          .single();

        if (insertError) {
          console.error(`[AutoRenew] Insert error for ${driver.id}:`, insertError.message);
          await logSystemEvent('auto_renew_failed', 'error', {
            profile_id: driver.id,
            error: insertError.message,
            week_start: weekStart,
          });
          errors++;
          continue;
        }

        // 5. Log success
        const policyId = (policy as unknown as { id: string })?.id;
        await logSystemEvent('auto_renew_success', 'info', {
          profile_id: driver.id,
          policy_id: policyId,
          plan_slug: planSlug,
          premium: finalPremium,
          week_start: weekStart,
        });

        processed++;
      } catch (err) {
        console.error(`[AutoRenew] Unexpected error for ${driver.id}:`, err);
        await logSystemEvent('auto_renew_failed', 'error', {
          profile_id: driver.id,
          error: err instanceof Error ? err.message : 'Unknown error',
          week_start: weekStart,
        }).catch(() => {});
        errors++;
      }
    }

    return NextResponse.json({
      status: 'ok',
      week_start: weekStart,
      total_drivers: drivers.length,
      processed,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('[AutoRenew] Fatal error:', error);
    return NextResponse.json(
      { error: 'Auto-renew failed', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}
