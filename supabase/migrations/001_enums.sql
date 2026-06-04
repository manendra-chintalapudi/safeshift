-- ============================================================================
-- Migration 001: Create custom enums
-- ============================================================================

CREATE TYPE disruption_type AS ENUM (
  'heavy_rainfall', 'aqi_grap_iv', 'cyclone', 'platform_outage', 'curfew_bandh'
);

CREATE TYPE claim_status AS ENUM (
  'triggered', 'gate1_passed', 'gate2_passed', 'approved', 'paid',
  'rejected', 'pending_review', 'appealed'
);

CREATE TYPE tier_type AS ENUM ('normal', 'medium', 'high');

CREATE TYPE onboarding_status AS ENUM (
  'language_selected', 'aadhaar_verified', 'documents_uploaded',
  'upi_verified', 'city_selected', 'tier_selected', 'payment_done', 'complete'
);

CREATE TYPE coin_activity_type AS ENUM (
  'weekly_login', 'consecutive_weeks', 'disruption_active', 'referral',
  'complete_profile', 'clean_claims', 'redeemed_discount', 'redeemed_free_week'
);
