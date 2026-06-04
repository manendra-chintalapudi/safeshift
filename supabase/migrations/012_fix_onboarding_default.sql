-- ============================================================================
-- Migration 012: Fix onboarding default status
-- Add 'registered' as the initial status for newly created profiles so that
-- new users always start at the Language step (step 0) instead of being
-- skipped to AadhaarKYC because 'language_selected' was both the DB default
-- and the status set after completing the Language step.
-- ============================================================================

ALTER TYPE onboarding_status ADD VALUE IF NOT EXISTS 'registered';

ALTER TABLE profiles ALTER COLUMN onboarding_status SET DEFAULT 'registered';
