-- ============================================================================
-- Migration 010: Views
-- ============================================================================

-- Driver wallet: aggregated payout totals
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

-- Coin balance per driver
CREATE VIEW driver_coin_balance AS
SELECT
  profile_id,
  COALESCE(SUM(coins), 0) AS balance
FROM coins_ledger
GROUP BY profile_id;

-- Fraud cluster detection signals
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

-- Admin analytics summary
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
