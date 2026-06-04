// ============================================================================
// Trust History — fetch a driver's prior claim history + trust score
// Feeds the `trust_history` signal of the fraud model.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { FRAUD } from '@/lib/config/constants';
import type { TrustHistoryInput } from '@/lib/fraud/scoring';

export async function getTrustHistoryInput(profileId: string): Promise<TrustHistoryInput> {
  const supabase = createAdminClient();

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('trust_score, created_at')
    .eq('id', profileId)
    .single();

  const profile = profileRaw as unknown as {
    trust_score: number | null;
    created_at: string;
  } | null;

  const trustScore = profile?.trust_score ?? FRAUD.TRUST_SCORE_DEFAULT;
  const tenureMonths = profile?.created_at
    ? monthsBetween(new Date(profile.created_at), new Date())
    : 0;

  // Past claims belonging to this driver (exclude the current verification itself
  // by looking only at claims already in a terminal state).
  const { data: pastClaimsRaw } = await supabase
    .from('parametric_claims')
    .select('is_flagged, admin_review_status, status')
    .eq('profile_id', profileId)
    .in('status', ['approved', 'paid', 'rejected']);

  const pastClaims = (pastClaimsRaw ?? []) as unknown as Array<{
    is_flagged: boolean | null;
    admin_review_status: string | null;
    status: string;
  }>;

  const priorFlaggedCount = pastClaims.filter((c) => c.is_flagged).length;
  const confirmedFraudCount = pastClaims.filter(
    (c) => c.admin_review_status === 'rejected' || c.status === 'rejected'
  ).length;

  return { trustScore, priorFlaggedCount, confirmedFraudCount, tenureMonths };
}

function monthsBetween(a: Date, b: Date): number {
  const ms = Math.max(0, b.getTime() - a.getTime());
  return ms / (1000 * 60 * 60 * 24 * 30);
}
