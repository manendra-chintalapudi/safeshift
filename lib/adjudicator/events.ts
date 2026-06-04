// ============================================================================
// Event Management — Idempotent disruption event insertion
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { haversineDistance } from '@/lib/utils/geo';
import { CLAIM_RULES } from '@/lib/config/constants';
import { toCell, disk, defaultRingSize } from '@/lib/utils/h3';
import type { TriggerCandidate } from './types';

/**
 * Check if a duplicate event already exists (same type + location within window)
 */
export async function isDuplicateEvent(candidate: TriggerCandidate): Promise<boolean> {
  const supabase = createAdminClient();
  const windowStart = new Date(
    Date.now() - CLAIM_RULES.DUPLICATE_EVENT_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('live_disruption_events')
    .select('id, zone_latitude, zone_longitude')
    .eq('event_type', candidate.event_type)
    .eq('city', candidate.city)
    .gte('created_at', windowStart)
    .is('resolved_at', null);

  if (error || !data) return false;

  type EventRow = { id: string; zone_latitude: number | null; zone_longitude: number | null };
  for (const event of data as unknown as EventRow[]) {
    if (event.zone_latitude && event.zone_longitude) {
      const distance = haversineDistance(
        candidate.latitude, candidate.longitude,
        event.zone_latitude, event.zone_longitude
      );
      if (distance < CLAIM_RULES.DUPLICATE_EVENT_RADIUS_KM) return true;
    }
  }

  return false;
}

/**
 * Insert a new disruption event
 */
export async function insertDisruptionEvent(candidate: TriggerCandidate): Promise<string | null> {
  const supabase = createAdminClient();

  // Compute the H3 zone footprint for this disruption.
  const centerCell = toCell(candidate.latitude, candidate.longitude);
  const ringSize = candidate.h3_ring_size ?? defaultRingSize(candidate.event_type);
  const affectedCells = disk(centerCell, ringSize);

  const { data, error } = await supabase
    .from('live_disruption_events')
    .insert({
      event_type: candidate.event_type,
      severity_score: candidate.severity_score,
      city: candidate.city,
      zone_latitude: candidate.latitude,
      zone_longitude: candidate.longitude,
      geofence_radius_km: candidate.geofence_radius_km,
      center_h3_cell: centerCell,
      h3_ring_size: ringSize,
      affected_h3_cells: affectedCells,
      trigger_value: candidate.trigger_value,
      trigger_threshold: candidate.trigger_threshold,
      verified_by_api: candidate.verified_by_api,
      verified_by_llm: candidate.verified_by_llm,
      raw_api_data: candidate.raw_api_data as unknown as null,
      data_sources: candidate.data_sources,
      rule_version: '1.0',
    } as never)
    .select('id')
    .single();

  if (error) {
    console.error('[Events] Error inserting event:', error);
    return null;
  }

  return (data as unknown as { id: string }).id;
}
