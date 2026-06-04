// ============================================================================
// Dual-Gate Claim Verification Engine
// Gate 1: Already done by adjudicator (environmental verification)
// Gate 2: Check driver_activity_logs for >= 45 min online + GPS within zone
// Cap enforcement: 1/day, weekly max payout, asset lock check
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { isWithinCircle } from '@/lib/utils/geo';
import { toCell, isInDisk } from '@/lib/utils/h3';
import { CLAIM_RULES, FRAUD } from '@/lib/config/constants';
import { runAllFraudChecks, updateTrustScore } from '@/lib/fraud/detector';
import { simulatePayout } from '@/lib/payments/simulate-payout';
import type { ParametricClaim, LiveDisruptionEvent, Profile, WeeklyPolicy } from '@/lib/types/database';

interface Gate2Result {
  passed: boolean;
  activityMinutes: number;
  gpsWithinZone: boolean;
  reason?: string;
}

interface CapCheckResult {
  passed: boolean;
  reason?: string;
}

interface ClaimVerificationResult {
  success: boolean;
  claimId: string;
  status: string;
  gate2: Gate2Result;
  fraudScore: number;
  fraudSignals: Record<string, boolean>;
  payoutTriggered: boolean;
  reason?: string;
}

/**
 * Gate 2: Check driver activity logs for minimum online time and GPS within zone
 */
export async function verifyGate2(claimId: string): Promise<Gate2Result> {
  const supabase = createAdminClient();

  // Get claim with event details
  const { data: claimRaw } = await supabase
    .from('parametric_claims')
    .select('*, live_disruption_events(*)')
    .eq('id', claimId)
    .single();

  if (!claimRaw) {
    return { passed: false, activityMinutes: 0, gpsWithinZone: false, reason: 'Claim not found' };
  }

  const claim = claimRaw as unknown as ParametricClaim & { live_disruption_events: LiveDisruptionEvent };
  const event = claim.live_disruption_events;

  // Get profile for zone coordinates
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', claim.profile_id)
    .single();

  if (!profileRaw) {
    return { passed: false, activityMinutes: 0, gpsWithinZone: false, reason: 'Profile not found' };
  }

  const profile = profileRaw as unknown as Profile;

  // Check activity logs in last 4 hours
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  const { data: logsRaw } = await supabase
    .from('driver_activity_logs')
    .select('*')
    .eq('profile_id', claim.profile_id)
    .gte('recorded_at', fourHoursAgo)
    .order('recorded_at', { ascending: true });

  const logs = (logsRaw ?? []) as unknown as Array<{
    status: string;
    latitude: number | null;
    longitude: number | null;
    h3_cell: string | null;
    recorded_at: string;
  }>;

  // Count minutes where status != 'offline'
  // Each log entry represents ~5 minutes of activity
  const activeEntries = logs.filter((l) => l.status !== 'offline');
  const activityMinutes = activeEntries.length * 5;

  // Check GPS within disruption zone.
  //
  // Primary check: H3 cell membership — is any active heartbeat's h3_cell
  // inside the event's disk? This is O(1) per heartbeat (gridDistance check)
  // and resolves zones at ~0.9 km granularity instead of city-wide circles.
  //
  // Fallback 1: old haversine against event.zone_latitude/longitude (for
  // legacy events that pre-date the H3 migration).
  //
  // Fallback 2: driver's registered profile zone (should almost never hit).
  const eventCenter = event?.center_h3_cell ?? null;
  const eventRing = event?.h3_ring_size ?? null;

  let gpsWithinZone = false;
  if (eventCenter != null && eventRing != null) {
    gpsWithinZone = activeEntries.some((l) => {
      const cell = l.h3_cell ?? (l.latitude != null && l.longitude != null ? toCell(l.latitude, l.longitude) : null);
      return cell != null && isInDisk(cell, eventCenter, eventRing);
    });
  } else if (event?.zone_latitude != null && event?.zone_longitude != null) {
    gpsWithinZone = activeEntries.some(
      (l) =>
        l.latitude != null &&
        l.longitude != null &&
        isWithinCircle(
          l.latitude,
          l.longitude,
          event.zone_latitude!,
          event.zone_longitude!,
          event.geofence_radius_km || 15
        )
    );
  } else if (profile.zone_latitude != null && profile.zone_longitude != null) {
    gpsWithinZone = activeEntries.some(
      (l) =>
        l.latitude != null &&
        l.longitude != null &&
        isWithinCircle(l.latitude, l.longitude, profile.zone_latitude!, profile.zone_longitude!, 15)
    );
  } else {
    // No geofence data — FAIL GPS check (require zone verification)
    gpsWithinZone = false;
  }

  const passed = activityMinutes >= CLAIM_RULES.MIN_ACTIVITY_MINUTES && gpsWithinZone;

  return {
    passed,
    activityMinutes,
    gpsWithinZone,
    reason: !passed
      ? `Activity: ${activityMinutes}min (need ${CLAIM_RULES.MIN_ACTIVITY_MINUTES}), GPS in zone: ${gpsWithinZone}`
      : undefined,
  };
}

/**
 * Enforce cap checks: daily limit, weekly cap, asset lock
 */
export async function enforceCapChecks(
  profileId: string,
  policyId: string,
  payoutAmount: number
): Promise<CapCheckResult> {
  const supabase = createAdminClient();

  // Check daily claim limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: claimsToday } = await supabase
    .from('parametric_claims')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .in('status', ['approved', 'paid', 'gate2_passed'])
    .gte('created_at', todayStart.toISOString());

  if ((claimsToday ?? 0) >= CLAIM_RULES.MAX_CLAIMS_PER_DAY) {
    return { passed: false, reason: 'Daily claim limit reached' };
  }

  // Check weekly payout cap
  const { data: policyRaw } = await supabase
    .from('weekly_policies')
    .select('*, plan_packages(max_weekly_payout_inr)')
    .eq('id', policyId)
    .single();

  if (!policyRaw) {
    return { passed: false, reason: 'Policy not found' };
  }

  const policy = policyRaw as unknown as WeeklyPolicy & {
    plan_packages: { max_weekly_payout_inr: number };
  };

  const weeklyMax = policy.plan_packages?.max_weekly_payout_inr ?? 0;
  if (policy.total_payout_this_week + payoutAmount > weeklyMax) {
    return { passed: false, reason: 'Weekly payout cap exceeded' };
  }

  // Check vehicle asset lock
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('vehicle_hash')
    .eq('id', profileId)
    .single();

  const profile = profileRaw as unknown as { vehicle_hash: string | null } | null;

  if (profile?.vehicle_hash) {
    const { data: activeLock } = await supabase
      .from('vehicle_asset_locks')
      .select('id, profile_id')
      .eq('vehicle_hash', profile.vehicle_hash)
      .gt('expires_at', new Date().toISOString())
      .neq('profile_id', profileId)
      .limit(1)
      .single();

    if (activeLock) {
      return { passed: false, reason: 'Vehicle locked by another profile' };
    }
  }

  return { passed: true };
}

/**
 * Main orchestrator: runs Gate 2 + cap checks + fraud routing
 */
export async function processClaimVerification(
  claimId: string,
  lat: number,
  lng: number
): Promise<ClaimVerificationResult> {
  const supabase = createAdminClient();

  // Get claim details
  const { data: claimRaw } = await supabase
    .from('parametric_claims')
    .select('*')
    .eq('id', claimId)
    .single();

  if (!claimRaw) {
    return {
      success: false,
      claimId,
      status: 'not_found',
      gate2: { passed: false, activityMinutes: 0, gpsWithinZone: false },
      fraudScore: 0,
      fraudSignals: {},
      payoutTriggered: false,
      reason: 'Claim not found',
    };
  }

  const claim = claimRaw as unknown as ParametricClaim;

  // Run Gate 2 verification
  const gate2 = await verifyGate2(claimId);

  // Update claim with Gate 2 results
  await supabase
    .from('parametric_claims')
    .update({
      gate2_passed: gate2.passed,
      gate2_checked_at: new Date().toISOString(),
      activity_minutes: gate2.activityMinutes,
      gps_within_zone: gate2.gpsWithinZone,
    } as never)
    .eq('id', claimId);

  if (!gate2.passed) {
    await supabase
      .from('parametric_claims')
      .update({ status: 'rejected', flag_reason: gate2.reason ?? 'Gate 2 failed' } as never)
      .eq('id', claimId);

    return {
      success: false,
      claimId,
      status: 'rejected',
      gate2,
      fraudScore: 0,
      fraudSignals: {},
      payoutTriggered: false,
      reason: gate2.reason,
    };
  }

  // Update status to gate2_passed
  await supabase
    .from('parametric_claims')
    .update({ status: 'gate2_passed' } as never)
    .eq('id', claimId);

  // Run fraud checks
  const fraudResult = await runAllFraudChecks(claimId);

  // Update claim with fraud results
  await supabase
    .from('parametric_claims')
    .update({
      fraud_score: fraudResult.fraudScore,
      fraud_signals: fraudResult.signals as never,
      is_flagged: fraudResult.isFlagged,
    } as never)
    .eq('id', claimId);

  // Run cap checks
  const capResult = await enforceCapChecks(claim.profile_id, claim.policy_id, claim.payout_amount_inr);

  if (!capResult.passed) {
    await supabase
      .from('parametric_claims')
      .update({ status: 'rejected', flag_reason: capResult.reason ?? 'Cap check failed' } as never)
      .eq('id', claimId);

    return {
      success: false,
      claimId,
      status: 'rejected',
      gate2,
      fraudScore: fraudResult.fraudScore,
      fraudSignals: fraudResult.signals,
      payoutTriggered: false,
      reason: capResult.reason,
    };
  }

  // Route based on fraud score thresholds
  let payoutTriggered = false;

  if (fraudResult.fraudScore >= FRAUD.MANUAL_REVIEW_THRESHOLD) {
    // High fraud score — auto-REJECT (zero-touch = no manual queue)
    await supabase
      .from('parametric_claims')
      .update({
        status: 'rejected',
        is_flagged: true,
        flag_reason: fraudResult.reasons.length > 0
          ? fraudResult.reasons.join('; ')
          : 'Auto-rejected: fraud score exceeded threshold',
      } as never)
      .eq('id', claimId);

    // Decay trust score for fraud-rejected claims
    await updateTrustScore(claim.profile_id, false);

    return {
      success: false,
      claimId,
      status: 'rejected',
      gate2,
      fraudScore: fraudResult.fraudScore,
      fraudSignals: fraudResult.signals,
      payoutTriggered: false,
      reason: 'Auto-rejected: fraud score too high',
    };
  }

  if (fraudResult.fraudScore < FRAUD.AUTO_APPROVE_THRESHOLD) {
    // Low fraud score — auto-approve and pay, boost trust score
    await supabase
      .from('parametric_claims')
      .update({ status: 'approved' } as never)
      .eq('id', claimId);

    const payoutResult = await simulatePayout(claimId, claim.profile_id, claim.payout_amount_inr);
    payoutTriggered = payoutResult.success;

    // Reward clean claim with trust score boost
    await updateTrustScore(claim.profile_id, true);

    return {
      success: true,
      claimId,
      status: payoutTriggered ? 'paid' : 'approved',
      gate2,
      fraudScore: fraudResult.fraudScore,
      fraudSignals: fraudResult.signals,
      payoutTriggered,
    };
  }

  // Medium fraud score — approve but flag
  await supabase
    .from('parametric_claims')
    .update({
      status: 'approved',
      is_flagged: true,
      flag_reason: fraudResult.reasons.length > 0
        ? fraudResult.reasons.join('; ')
        : 'Medium fraud score — approved with flag',
    } as never)
    .eq('id', claimId);

  const payoutResult = await simulatePayout(claimId, claim.profile_id, claim.payout_amount_inr);
  payoutTriggered = payoutResult.success;

  return {
    success: true,
    claimId,
    status: payoutTriggered ? 'paid' : 'approved',
    gate2,
    fraudScore: fraudResult.fraudScore,
    fraudSignals: fraudResult.signals,
    payoutTriggered,
  };
}
