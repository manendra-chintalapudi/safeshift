-- ============================================================================
-- Migration 014: H3 zone awareness
-- ----------------------------------------------------------------------------
-- Adds H3 cell IDs so driver positions and disruption events can be matched
-- at sub-city resolution. Resolution 8 (~0.74 km² per cell) is computed
-- app-side; Postgres just stores the 15-char hex string.
-- ============================================================================

-- 1. Driver activity logs: add current h3 cell
ALTER TABLE driver_activity_logs
  ADD COLUMN IF NOT EXISTS h3_cell TEXT;

CREATE INDEX IF NOT EXISTS idx_activity_h3_cell
  ON driver_activity_logs(h3_cell, recorded_at DESC)
  WHERE h3_cell IS NOT NULL;

COMMENT ON COLUMN driver_activity_logs.h3_cell IS
  'H3 resolution-8 cell id for (latitude, longitude). Computed app-side on insert.';

-- 2. Disruption events: add center cell, ring size, and full affected disk
ALTER TABLE live_disruption_events
  ADD COLUMN IF NOT EXISTS center_h3_cell TEXT,
  ADD COLUMN IF NOT EXISTS h3_ring_size INT,
  ADD COLUMN IF NOT EXISTS affected_h3_cells TEXT[];

-- GIN index on affected_h3_cells for fast "any driver in this cell?" queries.
CREATE INDEX IF NOT EXISTS idx_events_affected_h3_cells
  ON live_disruption_events USING GIN (affected_h3_cells)
  WHERE affected_h3_cells IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_center_h3
  ON live_disruption_events(center_h3_cell)
  WHERE center_h3_cell IS NOT NULL;

COMMENT ON COLUMN live_disruption_events.center_h3_cell IS
  'Authoritative H3 res-8 cell at (zone_latitude, zone_longitude).';
COMMENT ON COLUMN live_disruption_events.h3_ring_size IS
  'Number of H3 rings around center_h3_cell covered by this event.';
COMMENT ON COLUMN live_disruption_events.affected_h3_cells IS
  'Full set of H3 cells in the disk (computed app-side from center + ring for query convenience).';
