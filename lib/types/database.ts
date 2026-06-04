// ============================================================================
// Database Types — mirrors Supabase schema
// ============================================================================

import type { DisruptionType, TierType, ClaimStatus, OnboardingStatus } from '@/lib/config/constants';

export interface Profile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  language: string;
  aadhaar_verified: boolean;
  aadhaar_hash: string | null;
  dl_number: string | null;
  dl_verified: boolean;
  dl_image_url: string | null;
  rc_number: string | null;
  rc_verified: boolean;
  rc_image_url: string | null;
  vehicle_hash: string | null;
  upi_id: string | null;
  upi_verified: boolean;
  city: string | null;
  zone_latitude: number | null;
  zone_longitude: number | null;
  onboarding_status: OnboardingStatus;
  role: 'driver' | 'admin';
  trust_score: number;
  referral_code: string | null;
  referred_by: string | null;
  device_fingerprint: string | null;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanPackageRow {
  id: string;
  slug: string;
  name: string;
  tier: TierType;
  weekly_premium_inr: number;
  max_weekly_payout_inr: number;
  payout_schedule: Record<DisruptionType, number>;
  razorpay_plan_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPolicy {
  id: string;
  profile_id: string;
  plan_id: string;
  week_start_date: string;
  week_end_date: string;
  base_premium_inr: number;
  weather_risk_addon: number;
  ubi_addon: number;
  final_premium_inr: number;
  premium_reasoning: string | null;
  is_active: boolean;
  payment_status: 'pending' | 'paid' | 'failed' | 'demo';
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_subscription_id: string | null;
  total_payout_this_week: number;
  created_at: string;
  updated_at: string;
}

export interface LiveDisruptionEvent {
  id: string;
  event_type: DisruptionType;
  severity_score: number;
  city: string;
  zone_latitude: number | null;
  zone_longitude: number | null;
  geofence_radius_km: number;
  // Zone (H3) footprint — present on events inserted after migration 014.
  center_h3_cell: string | null;
  h3_ring_size: number | null;
  affected_h3_cells: string[] | null;
  trigger_value: number | null;
  trigger_threshold: number | null;
  verified_by_api: boolean;
  verified_by_llm: boolean;
  raw_api_data: Record<string, unknown> | null;
  data_sources: string[];
  rule_version: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ParametricClaim {
  id: string;
  policy_id: string;
  profile_id: string;
  disruption_event_id: string;
  payout_amount_inr: number;
  status: ClaimStatus;
  gate1_passed: boolean | null;
  gate1_checked_at: string | null;
  gate2_passed: boolean | null;
  gate2_checked_at: string | null;
  activity_minutes: number | null;
  gps_within_zone: boolean | null;
  is_flagged: boolean;
  flag_reason: string | null;
  fraud_score: number;
  fraud_signals: Record<string, unknown>;
  device_fingerprint: string | null;
  admin_review_status: 'pending' | 'approved' | 'rejected' | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  gateway_transaction_id: string | null;
  payout_initiated_at: string | null;
  payout_completed_at: string | null;
  appeal_submitted_at: string | null;
  appeal_evidence_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverActivityLog {
  id: string;
  profile_id: string;
  status: 'online' | 'searching' | 'on_trip' | 'offline';
  latitude: number | null;
  longitude: number | null;
  ip_address: string | null;
  ip_geo_latitude: number | null;
  ip_geo_longitude: number | null;
  device_fingerprint: string | null;
  recorded_at: string;
}

export interface VehicleAssetLock {
  id: string;
  vehicle_hash: string;
  profile_id: string;
  claim_id: string | null;
  locked_at: string;
  expires_at: string;
}

export interface CoinsLedgerEntry {
  id: string;
  profile_id: string;
  activity: string;
  coins: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface PayoutLedgerEntry {
  id: string;
  claim_id: string;
  profile_id: string;
  amount_inr: number;
  payout_method: string;
  status: string;
  mock_upi_ref: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PremiumRecommendation {
  id: string;
  profile_id: string;
  week_start_date: string;
  base_premium: number;
  weather_risk: number;
  ubi_adjustment: number;
  final_premium: number;
  reasoning: string | null;
  forecast_data: Record<string, unknown> | null;
  created_at: string;
}

export interface SystemLog {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'error';
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ParametricTriggerLedger {
  id: string;
  adjudicator_run_id: string | null;
  event_type: DisruptionType | null;
  city: string | null;
  trigger_value: number | null;
  outcome: 'triggered' | 'no_pay' | 'deferred' | 'error' | null;
  claims_created: number;
  payouts_initiated: number;
  error_message: string | null;
  rule_version: string | null;
  latency_ms: number | null;
  created_at: string;
}

// --- Views ---
export interface DriverWallet {
  driver_id: string;
  total_earned_inr: number;
  total_claims: number;
  flagged_claims: number;
  last_payout_at: string | null;
  this_week_earned_inr: number;
}

export interface DriverCoinBalance {
  profile_id: string;
  balance: number;
}
