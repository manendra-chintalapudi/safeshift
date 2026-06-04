-- ============================================================================
-- Migration 007: Driver Activity Logs + Vehicle Asset Locks
-- ============================================================================

-- Driver Activity Logs (GPS heartbeats for Gate 2 verification)
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

-- RLS
ALTER TABLE driver_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own activity"
  ON driver_activity_logs FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can read own activity"
  ON driver_activity_logs FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Service role full access"
  ON driver_activity_logs FOR ALL USING (auth.role() = 'service_role');

-- Vehicle Asset Locks (24h lifecycle lock per vehicle hash)
CREATE TABLE vehicle_asset_locks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_hash    TEXT NOT NULL,
  profile_id      UUID NOT NULL REFERENCES profiles(id),
  claim_id        UUID REFERENCES parametric_claims(id),
  locked_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_asset_locks_hash ON vehicle_asset_locks(vehicle_hash, expires_at);

-- RLS
ALTER TABLE vehicle_asset_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON vehicle_asset_locks FOR ALL USING (auth.role() = 'service_role');
