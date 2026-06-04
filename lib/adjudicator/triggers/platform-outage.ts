// ============================================================================
// Trigger: Platform Outage (>3 hrs downtime)
// Source: Mock endpoint (for hackathon)
// ============================================================================

import { getPlatformStatus } from '@/lib/clients/statusgator';
import { TRIGGERS } from '@/lib/config/constants';
import { calculateSeverity } from '@/lib/utils/geo';
import type { TriggerCandidate } from '../types';

const CONFIG = TRIGGERS.platform_outage;

export async function checkOutageTrigger(
  city: string,
  lat: number,
  lng: number
): Promise<TriggerCandidate | null> {
  const status = await getPlatformStatus();

  // Check threshold: >3 hours downtime
  if (status.status === 'up' || status.downtime_hours < CONFIG.threshold) {
    return null;
  }

  return {
    event_type: 'platform_outage',
    city,
    latitude: lat,
    longitude: lng,
    severity_score: calculateSeverity(status.downtime_hours, CONFIG.severity_range, CONFIG.severity_min, CONFIG.severity_max),
    trigger_value: status.downtime_hours,
    trigger_threshold: CONFIG.threshold,
    geofence_radius_km: CONFIG.geofence_radius_km, // 0 = city-wide
    data_sources: ['statusgator-mock'],
    raw_api_data: { platform_status: status },
    verified_by_api: true,
    verified_by_llm: false,
  };
}
