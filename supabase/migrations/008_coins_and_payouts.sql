-- ============================================================================
-- Migration 008: Coins Ledger + Payout Ledger + Premium Recommendations
-- ============================================================================

-- Coins Ledger
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

CREATE POLICY "Service role full access"
  ON coins_ledger FOR ALL USING (auth.role() = 'service_role');

-- Payout Ledger
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

CREATE POLICY "Service role full access"
  ON payout_ledger FOR ALL USING (auth.role() = 'service_role');

-- Premium Recommendations
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

CREATE POLICY "Service role full access"
  ON premium_recommendations FOR ALL USING (auth.role() = 'service_role');
