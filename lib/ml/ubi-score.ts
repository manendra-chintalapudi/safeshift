// ============================================================================
// UBI (Usage-Based Insurance) Score Calculator
// Analyzes GPS history against historically disrupted zones
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { isWithinCircle } from '@/lib/utils/geo';
import { PREMIUM } from '@/lib/config/constants';

interface UBIResult {
  ubiAddon: number;
  riskExposureScore: number;
  totalPositions: number;
  riskyPositions: number;
}

/**
 * Calculate UBI addon based on driver's historical GPS proximity to disrupted zones
 * - Pull last 4 weeks of driver_activity_logs
 * - For each position, check proximity to historically disrupted zones
 * - risk_exposure_score = 0 to 1
 * - ubi_addon = score * 15, clamped [0, 15]
 */
export async function calculateUBIScore(profileId: string): Promise<UBIResult> {
  const supabase = createAdminClient();

  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  // Get driver activity logs with GPS data
  const { data: logsRaw } = await supabase
    .from('driver_activity_logs')
    .select('latitude, longitude, recorded_at')
    .eq('profile_id', profileId)
    .gte('recorded_at', fourWeeksAgo)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('recorded_at', { ascending: false })
    .limit(500);

  const logs = (logsRaw ?? []) as unknown as Array<{
    latitude: number;
    longitude: number;
    recorded_at: string;
  }>;

  if (logs.length === 0) {
    return {
      ubiAddon: PREMIUM.UBI_MIN,
      riskExposureScore: 0,
      totalPositions: 0,
      riskyPositions: 0,
    };
  }

  // Get historically disrupted zones from live_disruption_events
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

  const { data: eventsRaw } = await supabase
    .from('live_disruption_events')
    .select('zone_latitude, zone_longitude, geofence_radius_km')
    .gte('created_at', sixMonthsAgo)
    .not('zone_latitude', 'is', null)
    .not('zone_longitude', 'is', null);

  const events = (eventsRaw ?? []) as unknown as Array<{
    zone_latitude: number;
    zone_longitude: number;
    geofence_radius_km: number;
  }>;

  if (events.length === 0) {
    return {
      ubiAddon: PREMIUM.UBI_MIN,
      riskExposureScore: 0,
      totalPositions: logs.length,
      riskyPositions: 0,
    };
  }

  // Count how many driver positions fall within historically disrupted zones
  let riskyPositions = 0;

  for (const log of logs) {
    const inDisruptedZone = events.some((event) =>
      isWithinCircle(
        log.latitude,
        log.longitude,
        event.zone_latitude,
        event.zone_longitude,
        event.geofence_radius_km || 15
      )
    );
    if (inDisruptedZone) {
      riskyPositions++;
    }
  }

  // risk_exposure_score = ratio of risky positions, capped at 1
  const riskExposureScore = Math.min(1, riskyPositions / logs.length);

  // UBI addon = score * max addon, clamped [0, 15]
  const rawAddon = riskExposureScore * PREMIUM.UBI_MAX;
  const ubiAddon = Math.round(
    Math.min(PREMIUM.UBI_MAX, Math.max(PREMIUM.UBI_MIN, rawAddon))
  );

  return {
    ubiAddon,
    riskExposureScore,
    totalPositions: logs.length,
    riskyPositions,
  };
}
