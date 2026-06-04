// ============================================================================
// GET /api/cron/weekly-premium — Calculate dynamic premiums for active drivers
// ============================================================================

import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/utils/admin-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateDynamicPremium } from '@/lib/ml/premium-calc';
import { getNextMonday, formatDate } from '@/lib/utils/date';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Get all active drivers with auto_renew enabled
    const { data: driversRaw, error: driversError } = await supabase
      .from('profiles')
      .select('id, city, auto_renew_enabled')
      .eq('auto_renew_enabled', true)
      .eq('role', 'driver');

    if (driversError) {
      console.error('[Cron/Premium] Error fetching drivers:', driversError);
      return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
    }

    const drivers = (driversRaw ?? []) as unknown as Array<{
      id: string;
      city: string | null;
      auto_renew_enabled: boolean;
    }>;

    // Get each driver's current active policy to find their plan
    let processed = 0;
    let errors = 0;
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const today = formatDate(now);
    const nextMonday = getNextMonday();
    const weekStartDate = formatDate(nextMonday);

    for (const driver of drivers) {
      try {
        // Get current active policy to find plan slug
        const { data: policyRaw } = await supabase
          .from('weekly_policies')
          .select('plan_id, plan_packages(slug)')
          .eq('profile_id', driver.id)
          .eq('is_active', true)
          .lte('week_start_date', today)
          .gte('week_end_date', today)
          .limit(1)
          .single();

        if (!policyRaw) continue;

        const policy = policyRaw as unknown as {
          plan_id: string;
          plan_packages: { slug: string };
        };

        const planSlug = policy.plan_packages?.slug ?? 'normal';

        const premium = await calculateDynamicPremium(driver.id, planSlug);

        // Insert premium recommendation
        await supabase
          .from('premium_recommendations')
          .insert({
            profile_id: driver.id,
            week_start_date: weekStartDate,
            base_premium: premium.basePremium,
            weather_risk: premium.weatherRisk,
            ubi_adjustment: premium.ubiAddon,
            final_premium: premium.finalPremium,
            reasoning: premium.reasoning,
          } as never);

        processed++;
      } catch (error) {
        console.error(`[Cron/Premium] Error for driver ${driver.id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      status: 'ok',
      total_drivers: drivers.length,
      processed,
      errors,
      week_start_date: weekStartDate,
    });
  } catch (error) {
    console.error('[Cron/Premium] Error:', error);
    return NextResponse.json(
      { error: 'Premium calculation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
