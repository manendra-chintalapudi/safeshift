import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  checkAndAwardWeeklyLogin,
  checkAndAwardConsecutiveWeeks,
  checkAndAwardCompleteProfile,
  checkAndAwardCleanClaims,
} from '@/lib/rewards/engine';

/**
 * POST /api/driver/check-in
 * Called on dashboard load. Checks and awards all eligible coin bonuses.
 */
export async function POST() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const results = await Promise.allSettled([
      checkAndAwardWeeklyLogin(user.id),
      checkAndAwardConsecutiveWeeks(user.id),
      checkAndAwardCompleteProfile(user.id),
      checkAndAwardCleanClaims(user.id),
    ]);

    const awarded: string[] = [];
    const names = ['weekly_login', 'consecutive_weeks', 'complete_profile', 'clean_claims'];

    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.awarded) awarded.push(names[i]);
    });

    return NextResponse.json({ status: 'ok', awarded });
  } catch (error) {
    console.error('[CheckIn] Error:', error);
    return NextResponse.json({ error: 'Check-in failed' }, { status: 500 });
  }
}
