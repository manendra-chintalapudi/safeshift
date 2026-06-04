-- ============================================================================
-- Migration 003: Plan Packages + Seed Data
-- ============================================================================

CREATE TABLE plan_packages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  tier                  tier_type NOT NULL,
  weekly_premium_inr    NUMERIC(10,2) NOT NULL,
  max_weekly_payout_inr NUMERIC(10,2) NOT NULL,
  payout_schedule       JSONB NOT NULL,
  razorpay_plan_id      TEXT,
  is_active             BOOLEAN DEFAULT true,
  sort_order            INT DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER plan_packages_updated_at
  BEFORE UPDATE ON plan_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: everyone can read plans, only service_role can modify
ALTER TABLE plan_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active plans"
  ON plan_packages FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access"
  ON plan_packages FOR ALL USING (auth.role() = 'service_role');

-- Seed the 3 tiers
INSERT INTO plan_packages (slug, name, tier, weekly_premium_inr, max_weekly_payout_inr, payout_schedule, sort_order) VALUES
(
  'normal', 'Normal', 'normal', 80, 2000,
  '{"heavy_rainfall": 1000, "aqi_grap_iv": 1000, "cyclone": 1200, "curfew_bandh": 900, "platform_outage": 500}'::JSONB,
  1
),
(
  'medium', 'Medium', 'medium', 120, 3000,
  '{"heavy_rainfall": 1500, "aqi_grap_iv": 1500, "cyclone": 1800, "curfew_bandh": 1350, "platform_outage": 750}'::JSONB,
  2
),
(
  'high', 'High', 'high', 160, 4000,
  '{"heavy_rainfall": 2000, "aqi_grap_iv": 2000, "cyclone": 2400, "curfew_bandh": 1800, "platform_outage": 1000}'::JSONB,
  3
);
