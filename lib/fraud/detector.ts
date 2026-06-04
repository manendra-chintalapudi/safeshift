// ============================================================================
// Fraud Detection — gathers signal inputs and runs the scoring model
//
// Signals the driver/ring can actually control:
//   trust_history    40%   (prior flags + trust score)
//   location_anomaly 35%   (GPS vs IP + impossible travel)
//   cluster          25%   (shared devices/IPs/GPS across accounts)
//
// Signals we previously (wrongly) counted as fraud but that drivers don't
// control — duplicate claim, rapid claims, weather mismatch — are removed from
// the fraud path. They remain system-health concerns to be surfaced elsewhere.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { FRAUD } from '@/lib/config/constants';
import {
  computeFraudScore,
  type FraudScoreResult,
  type FraudSignalsInput,
} from '@/lib/fraud/scoring';
import { getTrustHistoryInput } from '@/lib/fraud/trust-history';
import { checkLocationIntegrity, checkImpossibleTravel } from '@/lib/fraud/location-integrity';
import { checkClusterAnomaly } from '@/lib/fraud/cluster-analysis';
import { haversineDistance } from '@/lib/utils/geo';
import type { ParametricClaim, LiveDisruptionEvent } from '@/lib/types/database';

export interface FraudCheckResult {
  isFlagged: boolean;
  fraudScore: number;
  // Flat boolean view — shape preserved for engine.ts / fraud_signals JSONB column.
  // Legacy signal keys (duplicate, rapid_claims, weather_mismatch, daily_limit_exceeded)
  // are kept as `false` so any existing consumer (fraud-center page) still compiles.
  signals: Record<string, boolean>;
  reasons: string[];
  // Rich detail — not persisted but returned for the admin simulator.
  breakdown: FraudScoreResult['contributions'];
  decision: FraudScoreResult['decision'];
}

/**
 * Update trust score after a fraud determination. Preserved for
 * lib/claims/engine.ts and lib/adjudicator/claims.ts which import it.
 */
export async function updateTrustScore(
  profileId: string,
  isClean: boolean
): Promise<void> {
  const supabase = createAdminClient();

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('trust_score')
    .eq('id', profileId)
    .single();

  const profile = profileRaw as unknown as { trust_score: number } | null;
  const currentScore = profile?.trust_score ?? FRAUD.TRUST_SCORE_DEFAULT;

  const adjustment = isClean
    ? FRAUD.TRUST_SCORE_CLEAN_CLAIM
    : FRAUD.TRUST_SCORE_FRAUD_CONFIRMED;

  const newScore = Math.min(1.0, Math.max(0.0, currentScore + adjustment));

  await supabase
    .from('profiles')
    .update({ trust_score: newScore } as never)
    .eq('id', profileId);
}

export async function runAllFraudChecks(
  claimId: string,
  ipAddress?: string
): Promise<FraudCheckResult> {
  const supabase = createAdminClient();

  const { data: claimRaw } = await supabase
    .from('parametric_claims')
    .select('*, live_disruption_events(*)')
    .eq('id', claimId)
    .single();

  if (!claimRaw) {
    return emptyResult();
  }

  const claim = claimRaw as unknown as ParametricClaim & {
    live_disruption_events: LiveDisruptionEvent;
  };
  const event = claim.live_disruption_events;

  // Latest GPS heartbeat — needed for location & impossible-travel checks
  const { data: lastLogRaw } = await supabase
    .from('driver_activity_logs')
    .select('latitude, longitude, ip_address, ip_geo_latitude, ip_geo_longitude')
    .eq('profile_id', claim.profile_id)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  const lastLog = lastLogRaw as unknown as {
    latitude: number | null;
    longitude: number | null;
    ip_address: string | null;
    ip_geo_latitude: number | null;
    ip_geo_longitude: number | null;
  } | null;

  const gpsLat = lastLog?.latitude ?? null;
  const gpsLng = lastLog?.longitude ?? null;
  const effectiveIp = ipAddress ?? lastLog?.ip_address ?? undefined;

  // Gather all signal inputs in parallel
  const [trust, locationIntegrity, impossibleTravel, cluster] = await Promise.all([
    getTrustHistoryInput(claim.profile_id),
    gpsLat != null && gpsLng != null
      ? checkLocationIntegrity(gpsLat, gpsLng, effectiveIp)
      : Promise.resolve({ locationAnomaly: false, gpsAccuracyFlag: false, reason: undefined as string | undefined }),
    gpsLat != null && gpsLng != null
      ? checkImpossibleTravel(claim.profile_id, gpsLat, gpsLng)
      : Promise.resolve(false),
    checkClusterAnomaly(claim.disruption_event_id),
  ]);

  // GPS↔IP distance if we already have both sides cached on the log
  let gpsToIpDistanceKm: number | null = null;
  if (
    gpsLat != null && gpsLng != null &&
    lastLog?.ip_geo_latitude != null && lastLog?.ip_geo_longitude != null
  ) {
    gpsToIpDistanceKm = haversineDistance(
      gpsLat, gpsLng,
      lastLog.ip_geo_latitude, lastLog.ip_geo_longitude
    );
  } else if (locationIntegrity.locationAnomaly) {
    // Fallback: live IP lookup already flagged it
    gpsToIpDistanceKm = 999;
  }

  const input: FraudSignalsInput = {
    trust_history: trust,
    location_anomaly: { gpsToIpDistanceKm, impossibleTravel },
    cluster: {
      claimCountInWindow: cluster.claimCount,
      uniqueDevices: cluster.uniqueDevices,
      sharedIpsAcrossProfiles: cluster.suspiciousDimensions.includes('shared_ips') ? 1 : 0,
      lowGpsEntropy: cluster.suspiciousDimensions.includes('low_gps_entropy'),
    },
  };

  const result = computeFraudScore(input);

  // Flatten signals + collect human-readable reasons
  const reasons: string[] = [];
  for (const c of result.contributions) {
    if (c.triggered) reasons.push(c.reason);
  }
  if (locationIntegrity.locationAnomaly && locationIntegrity.reason) {
    reasons.push(locationIntegrity.reason);
  }

  // Preserve the cluster audit side-effect: record ring alerts to the
  // fraud_cluster_signals table so the Fraud Center can show them.
  if (cluster.isSuspicious) {
    await logClusterSignal(claim.disruption_event_id, event, cluster);
  }

  const signals: Record<string, boolean> = {
    // New signals
    trust_history: result.triggeredSignals.trust_history,
    location_anomaly: result.triggeredSignals.location_anomaly,
    cluster: result.triggeredSignals.cluster,
    // Legacy keys — kept as false for backward-compat with older UI views
    duplicate: false,
    rapid_claims: false,
    weather_mismatch: false,
    daily_limit_exceeded: false,
  };

  return {
    isFlagged: result.decision !== 'auto_approve',
    fraudScore: result.score,
    signals,
    reasons,
    breakdown: result.contributions,
    decision: result.decision,
  };
}

async function logClusterSignal(
  eventId: string,
  event: LiveDisruptionEvent | null,
  clusterResult: { claimCount: number; uniqueDevices: number }
): Promise<void> {
  const supabase = createAdminClient();

  try {
    const windowStart = new Date(
      Date.now() - FRAUD.CLUSTER_WINDOW_MINUTES * 60 * 1000
    ).toISOString();

    const { data: firstClaim } = await supabase
      .from('parametric_claims')
      .select('created_at')
      .eq('disruption_event_id', eventId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const { data: lastClaim } = await supabase
      .from('parametric_claims')
      .select('created_at')
      .eq('disruption_event_id', eventId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!firstClaim || !lastClaim) return;

    const first = firstClaim as unknown as { created_at: string };
    const last = lastClaim as unknown as { created_at: string };
    const windowSeconds = Math.round(
      (new Date(last.created_at).getTime() - new Date(first.created_at).getTime()) / 1000
    );

    await supabase.from('fraud_cluster_signals').upsert(
      {
        disruption_event_id: eventId,
        event_type: event?.event_type ?? null,
        city: event?.city ?? null,
        claim_count: clusterResult.claimCount,
        first_claim_at: first.created_at,
        last_claim_at: last.created_at,
        window_seconds: windowSeconds,
        unique_devices: clusterResult.uniqueDevices,
        flag_rate: 1.0,
      } as never,
      { onConflict: 'disruption_event_id' }
    );
  } catch {
    // Best effort — don't fail the fraud check if cluster logging fails
  }
}

function emptyResult(): FraudCheckResult {
  return {
    isFlagged: false,
    fraudScore: 0,
    signals: {
      trust_history: false,
      location_anomaly: false,
      cluster: false,
      duplicate: false,
      rapid_claims: false,
      weather_mismatch: false,
      daily_limit_exceeded: false,
    },
    reasons: [],
    breakdown: [],
    decision: 'auto_approve',
  };
}
