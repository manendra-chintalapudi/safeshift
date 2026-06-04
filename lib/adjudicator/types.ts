// ============================================================================
// Adjudicator Types
// ============================================================================

import type { DisruptionType } from '@/lib/config/constants';

export interface TriggerCandidate {
  event_type: DisruptionType;
  city: string;
  latitude: number;
  longitude: number;
  severity_score: number;
  trigger_value: number;
  trigger_threshold: number;
  geofence_radius_km: number;
  /** Optional override for H3 ring size; defaults to per-event-type value. */
  h3_ring_size?: number;
  data_sources: string[];
  raw_api_data: Record<string, unknown>;
  verified_by_api: boolean;
  verified_by_llm: boolean;
}

export interface AdjudicatorResult {
  run_id: string;
  started_at: string;
  completed_at: string;
  zones_checked: number;
  triggers_detected: TriggerCandidate[];
  events_created: number;
  claims_created: number;
  payouts_initiated: number;
  errors: string[];
}

export interface ZoneInfo {
  city: string;
  latitude: number;
  longitude: number;
  active_policy_count: number;
}
