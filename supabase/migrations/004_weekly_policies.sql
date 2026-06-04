-- ============================================================================
-- Migration 004: Weekly Policies
-- ============================================================================

CREATE TABLE weekly_policies (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id                UUID REFERENCES plan_packages(id),
  week_start_date        DATE NOT NULL,
  week_end_date          DATE NOT NULL,
  base_premium_inr       NUMERIC(10,2) NOT NULL,
  weather_risk_addon     NUMERIC(10,2) DEFAULT 0,
  ubi_addon              NUMERIC(10,2) DEFAULT 0,
  final_premium_inr      NUMERIC(10,2) NOT NULL,
  premium_reasoning      TEXT,
  is_active              BOOLEAN DEFAULT true,
  payment_status         TEXT DEFAULT 'pending'
                         CHECK (payment_status IN ('pending','paid','failed','demo')),
  razorpay_order_id      TEXT,
  razorpay_payment_id    TEXT,
  razorpay_subscription_id TEXT,
  total_payout_this_week NUMERIC(10,2) DEFAULT 0,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_week CHECK (week_end_date > week_start_date)
);

CREATE TRIGGER weekly_policies_updated_at
  BEFORE UPDATE ON weekly_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_policies_profile_active ON weekly_policies(profile_id, is_active);
CREATE INDEX idx_policies_week ON weekly_policies(week_start_date, week_end_date);

-- RLS
ALTER TABLE weekly_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own policies"
  ON weekly_policies FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own policies"
  ON weekly_policies FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Admins can read all policies"
  ON weekly_policies FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role full access"
  ON weekly_policies FOR ALL USING (auth.role() = 'service_role');
