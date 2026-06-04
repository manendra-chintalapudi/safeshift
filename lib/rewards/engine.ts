// ============================================================================
// Rewards & Coins Engine
// Award coins for driver engagement activities
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { COINS } from '@/lib/config/constants';

/**
 * Award coins to a driver profile
 */
export async function awardCoins(
  profileId: string,
  activity: string,
  coins: number,
  description: string,
  referenceId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('coins_ledger')
    .insert({
      profile_id: profileId,
      activity,
      coins,
      description,
      reference_id: referenceId ?? null,
    } as never);

  if (error) {
    console.error('[Rewards] Error awarding coins:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Award weekly login bonus if not already awarded this week
 */
export async function checkAndAwardWeeklyLogin(
  profileId: string
): Promise<{ awarded: boolean }> {
  const supabase = createAdminClient();

  // Calculate current week start (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  // Check if already awarded this week
  const { count } = await supabase
    .from('coins_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('activity', 'weekly_login')
    .gte('created_at', weekStart.toISOString());

  if ((count ?? 0) > 0) {
    return { awarded: false };
  }

  await awardCoins(
    profileId,
    'weekly_login',
    COINS.WEEKLY_LOGIN,
    'Weekly login bonus'
  );

  return { awarded: true };
}

/**
 * Check if driver has 4 consecutive active weeks and award bonus
 */
export async function checkAndAwardConsecutiveWeeks(
  profileId: string
): Promise<{ awarded: boolean }> {
  const supabase = createAdminClient();

  // Check last 4 weeks for weekly_login entries
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const { data: loginsRaw } = await supabase
    .from('coins_ledger')
    .select('created_at')
    .eq('profile_id', profileId)
    .eq('activity', 'weekly_login')
    .gte('created_at', fourWeeksAgo)
    .order('created_at', { ascending: true });

  const logins = (loginsRaw ?? []) as unknown as Array<{ created_at: string }>;

  // Group by ISO week
  const weeks = new Set<string>();
  for (const login of logins) {
    const date = new Date(login.created_at);
    const weekNumber = getISOWeek(date);
    const year = date.getFullYear();
    weeks.add(`${year}-W${weekNumber}`);
  }

  if (weeks.size < 4) {
    return { awarded: false };
  }

  // Check if consecutive_weeks bonus already awarded recently
  const { count } = await supabase
    .from('coins_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('activity', 'consecutive_weeks')
    .gte('created_at', fourWeeksAgo);

  if ((count ?? 0) > 0) {
    return { awarded: false };
  }

  await awardCoins(
    profileId,
    'consecutive_weeks',
    COINS.CONSECUTIVE_WEEKS_4,
    '4 consecutive active weeks bonus'
  );

  return { awarded: true };
}

/**
 * Award referral bonus to the referrer
 */
export async function awardReferral(
  referrerId: string,
  refereeId: string
): Promise<{ awarded: boolean }> {
  // Avoid duplicate referral awards
  const supabase = createAdminClient();

  const { count } = await supabase
    .from('coins_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', referrerId)
    .eq('activity', 'referral')
    .eq('reference_id', refereeId);

  if ((count ?? 0) > 0) {
    return { awarded: false };
  }

  await awardCoins(
    referrerId,
    'referral',
    COINS.REFERRAL,
    'Referral bonus',
    refereeId
  );

  return { awarded: true };
}

/**
 * Award coins for completing profile (all key fields filled)
 */
export async function checkAndAwardCompleteProfile(
  profileId: string
): Promise<{ awarded: boolean }> {
  const supabase = createAdminClient();

  // Check if already awarded
  const { count } = await supabase
    .from('coins_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('activity', 'complete_profile');

  if ((count ?? 0) > 0) return { awarded: false };

  // Check if profile is actually complete
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('full_name, city, dl_number, upi_id')
    .eq('id', profileId)
    .single();

  const profile = profileRaw as unknown as {
    full_name: string | null; city: string | null;
    dl_number: string | null; upi_id: string | null;
  } | null;

  if (!profile?.full_name || !profile.city || !profile.dl_number || !profile.upi_id) {
    return { awarded: false };
  }

  await awardCoins(profileId, 'complete_profile', COINS.COMPLETE_PROFILE, 'Profile completed bonus');
  return { awarded: true };
}

/**
 * Award coins for 6 months of clean claims (no fraud flags)
 */
export async function checkAndAwardCleanClaims(
  profileId: string
): Promise<{ awarded: boolean }> {
  const supabase = createAdminClient();

  // Check if already awarded in last 6 months
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

  const { count: alreadyAwarded } = await supabase
    .from('coins_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('activity', 'clean_claims')
    .gte('created_at', sixMonthsAgo);

  if ((alreadyAwarded ?? 0) > 0) return { awarded: false };

  // Check for any fraud-flagged claims in last 6 months
  const { count: fraudClaims } = await supabase
    .from('parametric_claims')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('is_flagged', true)
    .gte('created_at', sixMonthsAgo);

  if ((fraudClaims ?? 0) > 0) return { awarded: false };

  // Must have been a member for at least 6 months
  const { data: profileData } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', profileId)
    .single();

  if (!profileData) return { awarded: false };
  const memberSince = new Date((profileData as { created_at: string }).created_at);
  if (Date.now() - memberSince.getTime() < 180 * 24 * 60 * 60 * 1000) return { awarded: false };

  // Must have at least 20 weeks of policy history (roughly 5 months active)
  const { count: policyCount } = await supabase
    .from('weekly_policies')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .in('payment_status', ['paid', 'demo']);

  if ((policyCount ?? 0) < 20) return { awarded: false };

  await awardCoins(profileId, 'clean_claims', COINS.CLEAN_CLAIMS_6_MONTHS, '6 months clean claims bonus');
  return { awarded: true };
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
