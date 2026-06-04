// ============================================================================
// Fraud Scoring — pure function, no DB/network
// Given signal inputs, returns weighted score + per-signal breakdown + decision.
// Shared between the live detector and the admin simulator so they can't drift.
// ============================================================================

import { FRAUD } from '@/lib/config/constants';

export type SignalName = 'trust_history' | 'location_anomaly' | 'cluster';

export type Decision = 'auto_approve' | 'flag' | 'manual_review';

export interface TrustHistoryInput {
  trustScore: number;           // 0..1, profile default 0.50
  priorFlaggedCount: number;    // flagged (not yet confirmed) past claims
  confirmedFraudCount: number;  // admin-confirmed fraud on past claims
  tenureMonths: number;         // months since profile creation
}

export interface LocationInput {
  gpsToIpDistanceKm: number | null; // null = no IP data
  impossibleTravel: boolean;
}

export interface ClusterInput {
  claimCountInWindow: number;
  uniqueDevices: number;
  sharedIpsAcrossProfiles: number; // count of IPs used by >1 profile
  lowGpsEntropy: boolean;
}

export interface FraudSignalsInput {
  trust_history: TrustHistoryInput;
  location_anomaly: LocationInput;
  cluster: ClusterInput;
}

export interface SignalContribution {
  signal: SignalName;
  triggered: boolean;
  severity: number;       // 0..1 — how bad is this specific signal
  weight: number;         // from FRAUD.WEIGHTS
  contribution: number;   // severity * weight
  reason: string;
  detail: Record<string, unknown>;
}

export interface FraudScoreResult {
  score: number;                         // 0..1, clamped
  decision: Decision;
  contributions: SignalContribution[];
  triggeredSignals: Record<SignalName, boolean>;
}

// --- individual signal evaluators ------------------------------------------

function evalTrustHistory(i: TrustHistoryInput): SignalContribution {
  // Base severity is inverse of trust: low trust = high severity.
  let severity = 1 - clamp01(i.trustScore);

  // Confirmed fraud is the loudest signal — add up to +0.5.
  severity += Math.min(0.5, 0.15 * i.confirmedFraudCount);
  // Soft-flagged history adds less — up to +0.25.
  severity += Math.min(0.25, 0.05 * i.priorFlaggedCount);
  // Tenure discount — clean months reduce severity, up to -0.3.
  severity -= Math.min(0.3, 0.03 * i.tenureMonths);

  severity = clamp01(severity);
  const triggered = severity > 0.2;

  const weight = FRAUD.WEIGHTS.trust_history;
  return {
    signal: 'trust_history',
    triggered,
    severity,
    weight,
    contribution: severity * weight,
    reason: triggered
      ? `Trust ${i.trustScore.toFixed(2)}, ${i.confirmedFraudCount} confirmed + ${i.priorFlaggedCount} flagged, ${i.tenureMonths}mo tenure`
      : 'Clean history',
    detail: { ...i },
  };
}

function evalLocation(i: LocationInput): SignalContribution {
  let severity = 0;
  let reason = 'No anomaly';

  if (i.impossibleTravel) {
    severity = 1;
    reason = 'Impossible travel detected (>50km in <30min)';
  } else if (i.gpsToIpDistanceKm != null && i.gpsToIpDistanceKm > FRAUD.LOCATION_MISMATCH_KM) {
    // Ramp 50km → 0.5, 200km+ → 1.0
    severity = clamp01(i.gpsToIpDistanceKm / 200);
    reason = `GPS vs IP distance ${i.gpsToIpDistanceKm.toFixed(0)}km`;
  }

  const weight = FRAUD.WEIGHTS.location_anomaly;
  return {
    signal: 'location_anomaly',
    triggered: severity > 0,
    severity,
    weight,
    contribution: severity * weight,
    reason,
    detail: { ...i },
  };
}

function evalCluster(i: ClusterInput): SignalContribution {
  if (i.claimCountInWindow < FRAUD.CLUSTER_THRESHOLD) {
    return {
      signal: 'cluster',
      triggered: false,
      severity: 0,
      weight: FRAUD.WEIGHTS.cluster,
      contribution: 0,
      reason: `Below cluster threshold (${i.claimCountInWindow}/${FRAUD.CLUSTER_THRESHOLD})`,
      detail: { ...i },
    };
  }

  const dims: string[] = [];
  if (
    i.uniqueDevices > 0 &&
    i.uniqueDevices < i.claimCountInWindow * FRAUD.CLUSTER_SHARED_DEVICE_RATIO
  ) {
    dims.push('shared_devices');
  }
  if (i.sharedIpsAcrossProfiles > 0) dims.push('shared_ips');
  if (i.lowGpsEntropy) dims.push('low_gps_entropy');

  const severity = clamp01(dims.length / 3); // 3 dimensions = full severity
  const weight = FRAUD.WEIGHTS.cluster;
  return {
    signal: 'cluster',
    triggered: dims.length >= 2,
    severity,
    weight,
    contribution: severity * weight,
    reason: dims.length ? `Ring signals: ${dims.join(', ')}` : 'No ring signals',
    detail: { ...i, dimensions: dims },
  };
}

// --- orchestrator ----------------------------------------------------------

export function computeFraudScore(input: FraudSignalsInput): FraudScoreResult {
  const contributions: SignalContribution[] = [
    evalTrustHistory(input.trust_history),
    evalLocation(input.location_anomaly),
    evalCluster(input.cluster),
  ];

  const score = clamp01(
    contributions.reduce((sum, c) => sum + c.contribution, 0)
  );

  const decision: Decision =
    score >= FRAUD.MANUAL_REVIEW_THRESHOLD
      ? 'manual_review'
      : score < FRAUD.AUTO_APPROVE_THRESHOLD
        ? 'auto_approve'
        : 'flag';

  const triggeredSignals = contributions.reduce(
    (acc, c) => {
      acc[c.signal] = c.triggered;
      return acc;
    },
    {} as Record<SignalName, boolean>
  );

  return { score, decision, contributions, triggeredSignals };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
