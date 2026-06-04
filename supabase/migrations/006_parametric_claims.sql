-- ============================================================================
-- Migration 006: Parametric Claims
-- ============================================================================

CREATE TABLE parametric_claims (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id              UUID NOT NULL REFERENCES weekly_policies(id) ON DELETE CASCADE,
  profile_id             UUID NOT NULL REFERENCES profiles(id),
  disruption_event_id    UUID NOT NULL REFERENCES live_disruption_events(id),
  payout_amount_inr      NUMERIC(10,2) NOT NULL,
  status                 claim_status DEFAULT 'triggered',
  -- Gate verification
  gate1_passed           BOOLEAN,
  gate1_checked_at       TIMESTAMPTZ,
  gate2_passed           BOOLEAN,
  gate2_checked_at       TIMESTAMPTZ,
  activity_minutes       INT,
  gps_within_zone        BOOLEAN,
  -- Fraud
  is_flagged             BOOLEAN DEFAULT false,
  flag_reason            TEXT,
  fraud_score            NUMERIC(3,2) DEFAULT 0,
  fraud_signals          JSONB DEFAULT '{}',
  device_fingerprint     TEXT,
  -- Admin review
  admin_review_status    TEXT CHECK (admin_review_status IN ('pending','approved','rejected')),
  reviewed_by            TEXT,
  reviewed_at            TIMESTAMPTZ,
  -- Payout
  gateway_transaction_id TEXT,
  payout_initiated_at    TIMESTAMPTZ,
  payout_completed_at    TIMESTAMPTZ,
  -- Appeal
  appeal_submitted_at    TIMESTAMPTZ,
  appeal_evidence_url    TEXT,
  appeal_resolved_at     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER parametric_claims_updated_at
  BEFORE UPDATE ON parametric_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_claims_profile ON parametric_claims(profile_id, created_at DESC);
CREATE INDEX idx_claims_policy ON parametric_claims(policy_id);
CREATE INDEX idx_claims_status ON parametric_claims(status);
CREATE INDEX idx_claims_flagged ON parametric_claims(is_flagged) WHERE is_flagged;
CREATE INDEX idx_claims_event ON parametric_claims(disruption_event_id);

-- RLS
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

CREATE POLICY "Service role full access"
  ON parametric_claims FOR ALL USING (auth.role() = 'service_role');
