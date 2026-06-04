-- ============================================================================
-- Migration 011: Payment Transactions + Razorpay Events
-- ============================================================================

-- Payment transactions (for tracking all Razorpay interactions)
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

CREATE POLICY "Service role full access"
  ON payment_transactions FOR ALL USING (auth.role() = 'service_role');

-- Razorpay webhook events (idempotency)
CREATE TABLE razorpay_payment_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              TEXT UNIQUE NOT NULL,
  event_type            TEXT NOT NULL,
  payload               JSONB NOT NULL,
  processed             BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE razorpay_payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON razorpay_payment_events FOR ALL USING (auth.role() = 'service_role');
