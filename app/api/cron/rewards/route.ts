// ============================================================================
// GET /api/cron/rewards — Check and award weekly login + consecutive week bonuses
// ============================================================================

import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/utils/admin-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkAndAwardWeeklyLogin, checkAndAwardConsecutiveWeeks } from '@/lib/rewards/engine';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Get all active drivers who logged activity this week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    // Find drivers who have activity this week
    const { data: activeDriversRaw } = await supabase
      .from('driver_activity_logs')
      .select('profile_id')
      .gte('recorded_at', weekStart.toISOString());

    const activeDrivers = (activeDriversRaw ?? []) as unknown as Array<{ profile_id: string }>;

    // Deduplicate
    const uniqueProfileIds = [...new Set(activeDrivers.map((d) => d.profile_id))];

    let weeklyLoginAwarded = 0;
    let consecutiveWeeksAwarded = 0;
    let errors = 0;

    for (const profileId of uniqueProfileIds) {
      try {
        const loginResult = await checkAndAwardWeeklyLogin(profileId);
        if (loginResult.awarded) weeklyLoginAwarded++;

        const consecutiveResult = await checkAndAwardConsecutiveWeeks(profileId);
        if (consecutiveResult.awarded) consecutiveWeeksAwarded++;
      } catch (error) {
        console.error(`[Cron/Rewards] Error for profile ${profileId}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      status: 'ok',
      active_drivers: uniqueProfileIds.length,
      weekly_login_awarded: weeklyLoginAwarded,
      consecutive_weeks_awarded: consecutiveWeeksAwarded,
      errors,
    });
  } catch (error) {
    console.error('[Cron/Rewards] Error:', error);
    return NextResponse.json(
      { error: 'Rewards cron failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
