-- ============================================================================
-- Migration 009: System Logs + Trigger Ledger
-- ============================================================================

-- System Logs
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

CREATE POLICY "Service role full access"
  ON system_logs FOR ALL USING (auth.role() = 'service_role');

-- Parametric Trigger Ledger (audit trail)
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

CREATE POLICY "Service role full access"
  ON parametric_trigger_ledger FOR ALL USING (auth.role() = 'service_role');
