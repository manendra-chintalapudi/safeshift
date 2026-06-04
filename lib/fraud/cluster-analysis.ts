// ============================================================================
// Cluster Analysis — Detect syndicate-style coordinated claims
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { FRAUD } from '@/lib/config/constants';

interface ClusterAnalysisResult {
  isSuspicious: boolean;
  claimCount: number;
  uniqueDevices: number;
  suspiciousDimensions: string[];
  reason?: string;
}

/**
 * Check for cluster anomalies on an event:
 * - Count claims in last 10 minutes for the event
 * - If >= 10: check unique devices, shared IPs, GPS entropy
 * - If >= 3 dimensions suspicious: return syndicate alert
 */
export async function checkClusterAnomaly(eventId: string): Promise<ClusterAnalysisResult> {
  const supabase = createAdminClient();

  const windowStart = new Date(
    Date.now() - FRAUD.CLUSTER_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  // Get recent claims for this event
  const { data: claimsRaw } = await supabase
    .from('parametric_claims')
    .select('id, profile_id, device_fingerprint, created_at')
    .eq('disruption_event_id', eventId)
    .gte('created_at', windowStart);

  const claims = (claimsRaw ?? []) as unknown as Array<{
    id: string;
    profile_id: string;
    device_fingerprint: string | null;
    created_at: string;
  }>;

  const claimCount = claims.length;

  if (claimCount < FRAUD.CLUSTER_THRESHOLD) {
    return {
      isSuspicious: false,
      claimCount,
      uniqueDevices: 0,
      suspiciousDimensions: [],
    };
  }

  const suspiciousDimensions: string[] = [];

  // Check unique devices
  const devices = new Set(claims.map((c) => c.device_fingerprint).filter(Boolean));
  const uniqueDevices = devices.size;

  // If device count is much less than claim count, suspicious
  if (uniqueDevices > 0 && uniqueDevices < claimCount * 0.5) {
    suspiciousDimensions.push('shared_devices');
  }

  // Check shared IPs via activity logs
  const profileIds = claims.map((c) => c.profile_id);
  const { data: logsRaw } = await supabase
    .from('driver_activity_logs')
    .select('profile_id, ip_address')
    .in('profile_id', profileIds)
    .gte('recorded_at', windowStart);

  const logs = (logsRaw ?? []) as unknown as Array<{
    profile_id: string;
    ip_address: string | null;
  }>;

  // Count IP addresses shared across profiles
  const ipToProfiles = new Map<string, Set<string>>();
  for (const log of logs) {
    if (!log.ip_address) continue;
    if (!ipToProfiles.has(log.ip_address)) {
      ipToProfiles.set(log.ip_address, new Set());
    }
    ipToProfiles.get(log.ip_address)!.add(log.profile_id);
  }

  const sharedIps = Array.from(ipToProfiles.values()).filter((profiles) => profiles.size > 1);
  if (sharedIps.length > 0) {
    suspiciousDimensions.push('shared_ips');
  }

  // Check GPS entropy: get activity log coordinates for claiming profiles
  const { data: gpsLogsRaw } = await supabase
    .from('driver_activity_logs')
    .select('profile_id, latitude, longitude')
    .in('profile_id', profileIds)
    .gte('recorded_at', windowStart)
    .not('latitude', 'is', null);

  const gpsLogs = (gpsLogsRaw ?? []) as unknown as Array<{
    profile_id: string;
    latitude: number;
    longitude: number;
  }>;

  if (gpsLogs.length > 2) {
    // Compute GPS entropy: standard deviation of lat/lng
    const lats = gpsLogs.map((l) => l.latitude);
    const lngs = gpsLogs.map((l) => l.longitude);
    const latStd = standardDeviation(lats);
    const lngStd = standardDeviation(lngs);

    // Very low GPS spread = suspicious (everyone at same spot)
    if (latStd < 0.001 && lngStd < 0.001) {
      suspiciousDimensions.push('low_gps_entropy');
    }
  }

  const isSuspicious = suspiciousDimensions.length >= 3;

  return {
    isSuspicious,
    claimCount,
    uniqueDevices,
    suspiciousDimensions,
    reason: isSuspicious
      ? `Syndicate alert: ${suspiciousDimensions.join(', ')}`
      : undefined,
  };
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}
