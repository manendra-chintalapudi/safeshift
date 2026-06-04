-- ============================================================================
-- SafeShift — FULL MIGRATION + SEED DATA
-- Copy this entire file into Supabase SQL Editor and click "Run"
-- ============================================================================

-- ===================== ENUMS =====================

CREATE TYPE disruption_type AS ENUM (
  'heavy_rainfall', 'aqi_grap_iv', 'cyclone', 'platform_outage', 'curfew_bandh'
);

CREATE TYPE claim_status AS ENUM (
  'triggered', 'gate1_passed', 'gate2_passed', 'approved', 'paid',
  'rejected', 'pending_review', 'appealed'
);

CREATE TYPE tier_type AS ENUM ('normal', 'medium', 'high');

CREATE TYPE onboarding_status AS ENUM (
  'registered', 'language_selected', 'aadhaar_verified', 'documents_uploaded',
  'upi_verified', 'city_selected', 'tier_selected', 'payment_done', 'complete'
);

CREATE TYPE coin_activity_type AS ENUM (
  'weekly_login', 'consecutive_weeks', 'disruption_active', 'referral',
  'complete_profile', 'clean_claims', 'redeemed_discount', 'redeemed_free_week'
);

-- ===================== HELPER FUNCTIONS =====================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================== PROFILES =====================

CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT,
  phone_number          TEXT UNIQUE,
  language              TEXT DEFAULT 'en',
  aadhaar_verified      BOOLEAN DEFAULT false,
  aadhaar_hash          TEXT,
  dl_number             TEXT,
  dl_verified           BOOLEAN DEFAULT false,
  dl_image_url          TEXT,
  rc_number             TEXT,
  rc_verified           BOOLEAN DEFAULT false,
  rc_image_url          TEXT,
  vehicle_hash          TEXT,
  upi_id                TEXT,
  upi_verified          BOOLEAN DEFAULT false,
  city                  TEXT,
  zone_latitude         NUMERIC(10,6),
  zone_longitude        NUMERIC(10,6),
  onboarding_status     onboarding_status DEFAULT 'registered',
  role                  TEXT DEFAULT 'driver' CHECK (role IN ('driver', 'admin')),
  trust_score           NUMERIC(3,2) DEFAULT 0.50,
  referral_code         TEXT UNIQUE,
  referred_by           UUID REFERENCES profiles(id),
  device_fingerprint    TEXT,
  razorpay_customer_id  TEXT,
  razorpay_subscription_id TEXT,
  auto_renew_enabled    BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role full access"
  ON profiles FOR ALL USING (auth.role() = 'service_role');

-- ===================== PLAN PACKAGES =====================

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

ALTER TABLE plan_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active plans"
  ON plan_packages FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access on plans"
  ON plan_packages FOR ALL USING (auth.role() = 'service_role');

INSERT INTO plan_packages (slug, name, tier, weekly_premium_inr, max_weekly_payout_inr, payout_schedule, sort_order) VALUES
('normal', 'Normal', 'normal', 80, 2000, '{"heavy_rainfall": 1000, "aqi_grap_iv": 1000, "cyclone": 1200, "curfew_bandh": 900, "platform_outage": 500}'::JSONB, 1),
('medium', 'Medium', 'medium', 120, 3000, '{"heavy_rainfall": 1500, "aqi_grap_iv": 1500, "cyclone": 1800, "curfew_bandh": 1350, "platform_outage": 750}'::JSONB, 2),
('high', 'High', 'high', 160, 4000, '{"heavy_rainfall": 2000, "aqi_grap_iv": 2000, "cyclone": 2400, "curfew_bandh": 1800, "platform_outage": 1000}'::JSONB, 3);

-- ===================== WEEKLY POLICIES =====================

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
  payment_status         TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','demo')),
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

CREATE INDEX idx_policies_profile_active ON weekly_policies(profile_id, is_active);
CREATE INDEX idx_policies_week ON weekly_policies(week_start_date, week_end_date);

ALTER TABLE weekly_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own policies"
  ON weekly_policies FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own policies"
  ON weekly_policies FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Admins can read all policies"
  ON weekly_policies FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role full access on policies"
  ON weekly_policies FOR ALL USING (auth.role() = 'service_role');

-- ===================== DISRUPTION EVENTS =====================

CREATE TABLE live_disruption_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        disruption_type NOT NULL,
  severity_score    NUMERIC(4,2) NOT NULL CHECK (severity_score BETWEEN 0 AND 10),
  city              TEXT NOT NULL,
  zone_latitude     NUMERIC(10,6),
  zone_longitude    NUMERIC(10,6),
  geofence_radius_km NUMERIC(6,2) DEFAULT 15,
  trigger_value     NUMERIC(10,2),
  trigger_threshold NUMERIC(10,2),
  verified_by_api   BOOLEAN DEFAULT false,
  verified_by_llm   BOOLEAN DEFAULT false,
  raw_api_data      JSONB,
  data_sources      TEXT[],
  rule_version      TEXT,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_type_created ON live_disruption_events(event_type, created_at DESC);
CREATE INDEX idx_events_city ON live_disruption_events(city, created_at DESC);

ALTER TABLE live_disruption_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read events"
  ON live_disruption_events FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access on events"
  ON live_disruption_events FOR ALL USING (auth.role() = 'service_role');

-- ===================== PARAMETRIC CLAIMS =====================

CREATE TABLE parametric_claims (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id              UUID NOT NULL REFERENCES weekly_policies(id) ON DELETE CASCADE,
  profile_id             UUID NOT NULL REFERENCES profiles(id),
  disruption_event_id    UUID NOT NULL REFERENCES live_disruption_events(id),
  payout_amount_inr      NUMERIC(10,2) NOT NULL,
  status                 claim_status DEFAULT 'triggered',
  gate1_passed           BOOLEAN,
  gate1_checked_at       TIMESTAMPTZ,
  gate2_passed           BOOLEAN,
  gate2_checked_at       TIMESTAMPTZ,
  activity_minutes       INT,
  gps_within_zone        BOOLEAN,
  is_flagged             BOOLEAN DEFAULT false,
  flag_reason            TEXT,
  fraud_score            NUMERIC(3,2) DEFAULT 0,
  fraud_signals          JSONB DEFAULT '{}',
  device_fingerprint     TEXT,
  admin_review_status    TEXT CHECK (admin_review_status IN ('pending','approved','rejected')),
  reviewed_by            TEXT,
  reviewed_at            TIMESTAMPTZ,
  gateway_transaction_id TEXT,
  payout_initiated_at    TIMESTAMPTZ,
  payout_completed_at    TIMESTAMPTZ,
  appeal_submitted_at    TIMESTAMPTZ,
  appeal_evidence_url    TEXT,
  appeal_resolved_at     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER parametric_claims_updated_at
  BEFORE UPDATE ON parametric_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_claims_profile ON parametric_claims(profile_id, created_at DESC);
CREATE INDEX idx_claims_policy ON parametric_claims(policy_id);
CREATE INDEX idx_claims_status ON parametric_claims(status);
CREATE INDEX idx_claims_flagged ON parametric_claims(is_flagged) WHERE is_flagged;
CREATE INDEX idx_claims_event ON parametric_claims(disruption_event_id);

ALTER TABLE parametric_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own claims"
  ON parametric_claims FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Admins can read all claims"
  ON parametric_claims FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update claims"
  ON parametric_claims FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role full access on claims"
  ON parametric_claims FOR ALL USING (auth.role() = 'service_role');

-- ===================== ACTIVITY LOGS =====================

CREATE TABLE driver_activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id),
  status          TEXT NOT NULL CHECK (status IN ('online','searching','on_trip','offline')),
  latitude        NUMERIC(10,6),
  longitude       NUMERIC(10,6),
  ip_address      INET,
  ip_geo_latitude NUMERIC(10,6),
  ip_geo_longitude NUMERIC(10,6),
  device_fingerprint TEXT,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_profile_time ON driver_activity_logs(profile_id, recorded_at DESC);

ALTER TABLE driver_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own activity"
  ON driver_activity_logs FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can read own activity"
  ON driver_activity_logs FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Service role full access on activity"
  ON driver_activity_logs FOR ALL USING (auth.role() = 'service_role');

-- ===================== VEHICLE ASSET LOCKS =====================

CREATE TABLE vehicle_asset_locks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_hash    TEXT NOT NULL,
  profile_id      UUID NOT NULL REFERENCES profiles(id),
  claim_id        UUID REFERENCES parametric_claims(id),
  locked_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_asset_locks_hash ON vehicle_asset_locks(vehicle_hash, expires_at);

ALTER TABLE vehicle_asset_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on locks"
  ON vehicle_asset_locks FOR ALL USING (auth.role() = 'service_role');

-- ===================== COINS LEDGER =====================

CREATE TABLE coins_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id),
  activity        coin_activity_type NOT NULL,
  coins           INT NOT NULL,
  description     TEXT,
  reference_id    UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coins_profile ON coins_ledger(profile_id, created_at DESC);

ALTER TABLE coins_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own coins"
  ON coins_ledger FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Service role full access on coins"
  ON coins_ledger FOR ALL USING (auth.role() = 'service_role');

-- ===================== PAYOUT LEDGER =====================

CREATE TABLE payout_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        UUID NOT NULL REFERENCES parametric_claims(id),
  profile_id      UUID NOT NULL REFERENCES profiles(id),
  amount_inr      NUMERIC(10,2) NOT NULL,
  payout_method   TEXT DEFAULT 'upi_instant',
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  mock_upi_ref    TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payouts_profile ON payout_ledger(profile_id, created_at DESC);
CREATE INDEX idx_payouts_claim ON payout_ledger(claim_id);

ALTER TABLE payout_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payouts"
  ON payout_ledger FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Admins can read all payouts"
  ON payout_ledger FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role full access on payouts"
  ON payout_ledger FOR ALL USING (auth.role() = 'service_role');

-- ===================== PREMIUM RECOMMENDATIONS =====================

CREATE TABLE premium_recommendations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES profiles(id),
  week_start_date   DATE NOT NULL,
  base_premium      NUMERIC(10,2) NOT NULL,
  weather_risk      NUMERIC(10,2) DEFAULT 0,
  ubi_adjustment    NUMERIC(10,2) DEFAULT 0,
  final_premium     NUMERIC(10,2) NOT NULL,
  reasoning         TEXT,
  forecast_data     JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_premium_recs_profile ON premium_recommendations(profile_id, week_start_date DESC);

ALTER TABLE premium_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own recommendations"
  ON premium_recommendations FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Service role full access on recs"
  ON premium_recommendations FOR ALL USING (auth.role() = 'service_role');

-- ===================== SYSTEM LOGS =====================

CREATE TABLE system_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT NOT NULL,
  severity      TEXT DEFAULT 'info' CHECK (severity IN ('info','warning','error')),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_logs_type ON system_logs(event_type, created_at DESC);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read system logs"
  ON system_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role full access on logs"
  ON system_logs FOR ALL USING (auth.role() = 'service_role');

-- ===================== TRIGGER LEDGER =====================

CREATE TABLE parametric_trigger_ledger (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjudicator_run_id  UUID,
  event_type          disruption_type,
  city                TEXT,
  trigger_value       NUMERIC(10,2),
  outcome             TEXT CHECK (outcome IN ('triggered','no_pay','deferred','error')),
  claims_created      INT DEFAULT 0,
  payouts_initiated   INT DEFAULT 0,
  error_message       TEXT,
  rule_version        TEXT,
  latency_ms          INT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trigger_ledger_run ON parametric_trigger_ledger(adjudicator_run_id);
CREATE INDEX idx_trigger_ledger_time ON parametric_trigger_ledger(created_at DESC);

ALTER TABLE parametric_trigger_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read trigger ledger"
  ON parametric_trigger_ledger FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role full access on trigger ledger"
  ON parametric_trigger_ledger FOR ALL USING (auth.role() = 'service_role');

-- ===================== PAYMENT TRANSACTIONS =====================

CREATE TABLE payment_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES profiles(id),
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  razorpay_signature    TEXT,
  amount_inr            NUMERIC(10,2) NOT NULL,
  status                TEXT DEFAULT 'created' CHECK (status IN ('created','authorized','captured','failed','refunded')),
  policy_id             UUID REFERENCES weekly_policies(id),
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON payment_transactions FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Service role full access on transactions"
  ON payment_transactions FOR ALL USING (auth.role() = 'service_role');

-- ===================== RAZORPAY EVENTS =====================

CREATE TABLE razorpay_payment_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              TEXT UNIQUE NOT NULL,
  event_type            TEXT NOT NULL,
  payload               JSONB NOT NULL,
  processed             BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE razorpay_payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on rp events"
  ON razorpay_payment_events FOR ALL USING (auth.role() = 'service_role');

-- ===================== VIEWS =====================

CREATE VIEW driver_wallet AS
SELECT
  p.id AS driver_id,
  COALESCE(SUM(pc.payout_amount_inr) FILTER (WHERE pc.status = 'paid'), 0) AS total_earned_inr,
  COUNT(pc.id) FILTER (WHERE pc.status = 'paid') AS total_claims,
  COUNT(pc.id) FILTER (WHERE pc.is_flagged) AS flagged_claims,
  MAX(pc.payout_completed_at) AS last_payout_at,
  COALESCE(SUM(pc.payout_amount_inr) FILTER (
    WHERE pc.status = 'paid' AND pc.created_at >= date_trunc('week', NOW())
  ), 0) AS this_week_earned_inr
FROM profiles p
LEFT JOIN parametric_claims pc ON pc.profile_id = p.id
GROUP BY p.id;

CREATE VIEW driver_coin_balance AS
SELECT
  profile_id,
  COALESCE(SUM(coins), 0) AS balance
FROM coins_ledger
GROUP BY profile_id;

CREATE VIEW fraud_cluster_signals AS
SELECT
  pc.disruption_event_id,
  lde.event_type,
  lde.city,
  COUNT(pc.id) AS claim_count,
  MIN(pc.created_at) AS first_claim_at,
  MAX(pc.created_at) AS last_claim_at,
  EXTRACT(EPOCH FROM (MAX(pc.created_at) - MIN(pc.created_at))) AS window_seconds,
  COUNT(DISTINCT pc.device_fingerprint) FILTER (WHERE pc.device_fingerprint IS NOT NULL) AS unique_devices,
  (COUNT(pc.id) FILTER (WHERE pc.is_flagged))::FLOAT / NULLIF(COUNT(pc.id), 0) AS flag_rate
FROM parametric_claims pc
JOIN live_disruption_events lde ON lde.id = pc.disruption_event_id
GROUP BY pc.disruption_event_id, lde.event_type, lde.city
HAVING COUNT(pc.id) >= 5;

CREATE VIEW admin_analytics_summary AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE role = 'driver') AS total_drivers,
  (SELECT COUNT(*) FROM profiles WHERE role = 'driver' AND onboarding_status = 'complete') AS active_drivers,
  (SELECT COUNT(*) FROM weekly_policies WHERE is_active = true AND payment_status = 'paid') AS active_policies,
  (SELECT COUNT(*) FROM parametric_claims WHERE created_at >= CURRENT_DATE) AS claims_today,
  (SELECT COALESCE(SUM(payout_amount_inr), 0) FROM parametric_claims WHERE status = 'paid' AND payout_completed_at >= CURRENT_DATE) AS payouts_today_inr,
  (SELECT COALESCE(SUM(final_premium_inr), 0) FROM weekly_policies WHERE payment_status = 'paid') AS total_premium_revenue_inr,
  (SELECT COALESCE(SUM(payout_amount_inr), 0) FROM parametric_claims WHERE status = 'paid') AS total_payouts_inr,
  (SELECT COUNT(*) FROM live_disruption_events WHERE resolved_at IS NULL) AS active_triggers,
  (SELECT COUNT(*) FROM parametric_claims WHERE is_flagged = true AND admin_review_status = 'pending') AS pending_fraud_reviews;

-- ===================== SEED: DEMO DATA =====================

INSERT INTO live_disruption_events (event_type, severity_score, city, zone_latitude, zone_longitude, geofence_radius_km, trigger_value, trigger_threshold, verified_by_api, raw_api_data, data_sources, rule_version) VALUES
('heavy_rainfall', 7.5, 'mumbai', 19.076, 72.8777, 15, 85, 65, true, '{"demo": true}'::JSONB, ARRAY['openweathermap', 'open-meteo'], '1.0'),
('aqi_grap_iv', 8.0, 'delhi', 28.6139, 77.209, 20, 475, 450, true, '{"demo": true}'::JSONB, ARRAY['waqi'], '1.0'),
('cyclone', 9.0, 'chennai', 13.0827, 80.2707, 25, 95, 70, true, '{"demo": true}'::JSONB, ARRAY['open-meteo'], '1.0'),
('platform_outage', 6.0, 'mumbai', 19.076, 72.8777, 0, 4, 3, true, '{"demo": true}'::JSONB, ARRAY['statusgator-mock'], '1.0'),
('curfew_bandh', 7.0, 'pune', 18.5204, 73.8567, 20, 6, 4, true, '{"demo": true}'::JSONB, ARRAY['newsdata', 'openrouter-llm'], '1.0'),
('heavy_rainfall', 8.5, 'kolkata', 22.5726, 88.3639, 15, 110, 65, true, '{"demo": true}'::JSONB, ARRAY['openweathermap'], '1.0'),
('heavy_rainfall', 6.0, 'bangalore', 12.9716, 77.5946, 15, 70, 65, true, '{"demo": true}'::JSONB, ARRAY['open-meteo'], '1.0');

INSERT INTO system_logs (event_type, severity, metadata) VALUES
('adjudicator_run', 'info', '{"run_id": "demo-001", "zones_checked": 7, "triggers_detected": 3, "events_created": 3, "claims_created": 12, "duration_ms": 4523}'::JSONB),
('adjudicator_run', 'info', '{"run_id": "demo-002", "zones_checked": 7, "triggers_detected": 1, "events_created": 1, "claims_created": 5, "duration_ms": 3100}'::JSONB),
('fraud_alert', 'warning', '{"type": "cluster_anomaly", "event_id": "demo", "claims_in_window": 12, "message": "Potential claim cluster detected in Mumbai"}'::JSONB),
('payout', 'info', '{"claim_id": "demo", "amount_inr": 1500, "method": "upi_instant", "status": "completed"}'::JSONB);

INSERT INTO parametric_trigger_ledger (adjudicator_run_id, event_type, city, trigger_value, outcome, claims_created, payouts_initiated, latency_ms) VALUES
('00000000-0000-0000-0000-000000000001', 'heavy_rainfall', 'mumbai', 85, 'triggered', 5, 5, 2100),
('00000000-0000-0000-0000-000000000001', 'aqi_grap_iv', 'delhi', 475, 'triggered', 3, 3, 1800),
('00000000-0000-0000-0000-000000000001', 'cyclone', 'chennai', 95, 'triggered', 4, 4, 1500),
('00000000-0000-0000-0000-000000000001', 'platform_outage', 'mumbai', 4, 'triggered', 2, 2, 500),
('00000000-0000-0000-0000-000000000001', 'heavy_rainfall', 'bangalore', 70, 'triggered', 3, 3, 1900),
('00000000-0000-0000-0000-000000000002', 'curfew_bandh', 'pune', 6, 'triggered', 2, 2, 3200),
('00000000-0000-0000-0000-000000000002', 'heavy_rainfall', 'kolkata', 45, 'no_pay', 0, 0, 1100);
