-- ============================================================================
-- SafeShift Demo Seed Data
-- Run after migrations to populate demo data for presentation
-- ============================================================================

-- Note: This script assumes plan_packages are already seeded by migration 003.
-- It creates demo disruption events and system logs for the demo.

-- Insert demo disruption events (various types across cities)
INSERT INTO live_disruption_events (event_type, severity_score, city, zone_latitude, zone_longitude, geofence_radius_km, trigger_value, trigger_threshold, verified_by_api, raw_api_data, data_sources, rule_version) VALUES
-- Mumbai heavy rainfall
('heavy_rainfall', 7.5, 'mumbai', 19.076, 72.8777, 15, 85, 65, true, '{"demo": true, "source": "seed"}'::JSONB, ARRAY['openweathermap', 'open-meteo'], '1.0'),
-- Delhi AQI GRAP-IV
('aqi_grap_iv', 8.0, 'delhi', 28.6139, 77.209, 20, 475, 450, true, '{"demo": true, "source": "seed"}'::JSONB, ARRAY['waqi'], '1.0'),
-- Chennai cyclone
('cyclone', 9.0, 'chennai', 13.0827, 80.2707, 25, 95, 70, true, '{"demo": true, "source": "seed"}'::JSONB, ARRAY['open-meteo'], '1.0'),
-- Platform outage (all cities)
('platform_outage', 6.0, 'mumbai', 19.076, 72.8777, 0, 4, 3, true, '{"demo": true, "source": "seed"}'::JSONB, ARRAY['statusgator-mock'], '1.0'),
-- Pune curfew
('curfew_bandh', 7.0, 'pune', 18.5204, 73.8567, 20, 6, 4, true, '{"demo": true, "source": "seed"}'::JSONB, ARRAY['newsdata', 'openrouter-llm'], '1.0'),
-- Kolkata heavy rainfall
('heavy_rainfall', 8.5, 'kolkata', 22.5726, 88.3639, 15, 110, 65, true, '{"demo": true, "source": "seed"}'::JSONB, ARRAY['openweathermap'], '1.0'),
-- Bangalore heavy rainfall
('heavy_rainfall', 6.0, 'bangalore', 12.9716, 77.5946, 15, 70, 65, true, '{"demo": true, "source": "seed"}'::JSONB, ARRAY['open-meteo'], '1.0');

-- Insert demo system logs
INSERT INTO system_logs (event_type, severity, metadata) VALUES
('adjudicator_run', 'info', '{"run_id": "demo-001", "zones_checked": 7, "triggers_detected": 3, "events_created": 3, "claims_created": 12, "duration_ms": 4523}'::JSONB),
('adjudicator_run', 'info', '{"run_id": "demo-002", "zones_checked": 7, "triggers_detected": 1, "events_created": 1, "claims_created": 5, "duration_ms": 3100}'::JSONB),
('fraud_alert', 'warning', '{"type": "cluster_anomaly", "event_id": "demo", "claims_in_window": 12, "message": "Potential claim cluster detected in Mumbai"}'::JSONB),
('payout', 'info', '{"claim_id": "demo", "amount_inr": 1500, "method": "upi_instant", "status": "completed"}'::JSONB);

-- Insert demo trigger ledger entries
INSERT INTO parametric_trigger_ledger (adjudicator_run_id, event_type, city, trigger_value, outcome, claims_created, payouts_initiated, latency_ms) VALUES
('00000000-0000-0000-0000-000000000001', 'heavy_rainfall', 'mumbai', 85, 'triggered', 5, 5, 2100),
('00000000-0000-0000-0000-000000000001', 'aqi_grap_iv', 'delhi', 475, 'triggered', 3, 3, 1800),
('00000000-0000-0000-0000-000000000001', 'cyclone', 'chennai', 95, 'triggered', 4, 4, 1500),
('00000000-0000-0000-0000-000000000001', 'platform_outage', 'mumbai', 4, 'triggered', 2, 2, 500),
('00000000-0000-0000-0000-000000000001', 'heavy_rainfall', 'bangalore', 70, 'triggered', 3, 3, 1900),
('00000000-0000-0000-0000-000000000002', 'curfew_bandh', 'pune', 6, 'triggered', 2, 2, 3200),
('00000000-0000-0000-0000-000000000002', 'heavy_rainfall', 'kolkata', 45, 'no_pay', 0, 0, 1100);
