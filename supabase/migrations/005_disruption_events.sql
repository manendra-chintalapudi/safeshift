-- ============================================================================
-- Migration 005: Live Disruption Events
-- ============================================================================

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

-- Indexes
CREATE INDEX idx_events_type_created ON live_disruption_events(event_type, created_at DESC);
CREATE INDEX idx_events_city ON live_disruption_events(city, created_at DESC);

-- RLS
ALTER TABLE live_disruption_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read events"
  ON live_disruption_events FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access"
  ON live_disruption_events FOR ALL USING (auth.role() = 'service_role');
