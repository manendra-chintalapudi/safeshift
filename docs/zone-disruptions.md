# Zone-Level Disruptions

**How SafeShift fires a disruption at a specific neighborhood, figures out
which riders are actually there, and pays only those drivers.**

---

## 1. Why zones, not cities

Before this work, a disruption had a **city centroid + radius** (15 – 25 km).
When rainfall hit Andheri, every active driver in Mumbai — Bandra, Colaba,
BKC — was eligible for the payout, because the Gate 2 check was just a
haversine circle around the city center.

That leaks money in two directions:
- Drivers who weren't actually affected get paid.
- Drivers in a genuinely disrupted *sub-zone* get the same flat payout
  as drivers on the very edge of the circle who barely felt it.

The fix is a finer grid. Instead of "is this driver within 15 km of the
city center," we ask "is this driver's last heartbeat inside the exact
hexagonal footprint of the disruption." The grid is **H3**.

---

## 2. H3 in two minutes

H3 is Uber's open-source hexagonal grid system. Three things to know:

1. **Every point on Earth maps to exactly one cell at a given resolution.**
   The cell is a 15-character hex string, e.g. `88608b0b61fffff` (Mumbai
   centroid at resolution 8).
2. **Hexagons tile without gaps**, every cell has exactly 6 neighbors,
   and adjacent cells are approximately equidistant — which makes
   "everything within N hops" (`gridDistance`) a very natural
   "disruption covers this much area" primitive.
3. **Resolution is a single integer 0 – 15.** Each step changes the
   cell edge length by a factor of ~√7.

We use **resolution 8** everywhere:

| Resolution | Edge length | Area per cell | Cells across a typical Indian metro |
|---|---|---|---|
| 6 | ~3.2 km | ~36 km² | 5 – 10 |
| 7 | ~1.2 km | ~5 km² | 20 – 40 |
| **8** | **~460 m** | **~0.74 km²** | **40 – 80** |
| 9 | ~170 m | ~0.1 km² | 250 – 500 |

Why 8:
- **Fine enough** that a driver's heartbeat maps to exactly one cell
  and "is this driver in the flood zone" is a meaningful question.
- **Coarse enough** that a disruption disk covering a 2–10 km radius
  (what we actually want to model) stays under a few hundred cells —
  cheap to store, fast to check.
- **One cell ≈ one city block**, which matches how a human would
  describe a zone ("the BKC block flooded").

One useful rule of thumb: at resolution 8, **N hex rings ≈ N × 0.92 km
radius**. So 3 rings ≈ 2.8 km, 10 rings ≈ 9 km.

### Cell math we actually use

From `h3-js`, wrapped in `lib/utils/h3.ts`:

```ts
toCell(lat, lng)          // point → cell id
cellPolygon(cell)         // cell id → [[lat,lng], ...] boundary (for Leaflet)
cellCenter(cell)          // cell id → [lat, lng] centroid
disk(center, ringSize)    // center + N rings → array of cell ids
distance(a, b)            // integer hop count between two cells
isInDisk(cell, center, n) // O(1) membership check via distance()
```

That's the entire H3 surface area we need. No PostGIS, no H3 Postgres
extension — it's all pure JavaScript math on either the client or the
Node server.

---

## 3. Where rider locations come from

### Today: our own mobile client

Every active driver app POSTs a heartbeat every ~5 minutes to
`POST /api/driver/activity` (`app/api/driver/activity/route.ts`):

```json
{
  "status":    "on_trip",          // online | searching | on_trip | offline
  "latitude":  19.1197,
  "longitude": 72.8464
}
```

The server adds three fields at insert time:

- `ip_address` — read from `x-forwarded-for` (used for fraud location
  integrity, not for zones).
- `h3_cell` — computed server-side via `toCell(lat, lng)`. This is the
  resolution-8 cell string for the driver's current position.
- `recorded_at` — `NOW()`.

The row lands in `driver_activity_logs`:

```
┌──────────────────────────┐      ┌───────────────────────┐
│ mobile client (React     │ POST │ /api/driver/activity  │
│ Native or PWA)           │─────▶│  → toCell(lat,lng)    │
│  every 5 min             │      │  → INSERT logs        │
└──────────────────────────┘      └───────────┬───────────┘
                                              │
                                              ▼
                                  driver_activity_logs
                                  ┌────────────────────┐
                                  │ profile_id         │
                                  │ status             │
                                  │ latitude, longitude│
                                  │ h3_cell            │
                                  │ ip_address         │
                                  │ recorded_at        │
                                  └────────────────────┘
```

### Later: Porter feed

Spec `lib/clients/porter.ts` is stubbed today but designed to be the
real production source. It exposes the same shape (`profile_id`,
`status`, `lat`, `lng`, `recorded_at`). When we cut over, the mobile
heartbeat gets replaced by a cron that pulls from Porter every 60 s,
writes into the *same* `driver_activity_logs` table, and everything
downstream keeps working.

---

## 4. Firing a zone-level trigger

The admin fires from `/admin/triggers` → **Demo Trigger Panel**.

### What the admin sees

```
┌──────────────────────────────────────┐  ┌───────────────┐
│  Leaflet map (live)                  │  │ City   [▾]    │
│                                      │  │ Zone   [▾]    │
│   • rider-density hexagons           │  │ Ring   [──●─] │
│   • active disruptions (red outline) │  │ Severity  ... │
│   • preview disk (orange, live)      │  │ [Fire in ...] │
│   • pin marker                       │  └───────────────┘
└──────────────────────────────────────┘
```

### Three ways to pick where to fire

1. **Zone dropdown** — pick Andheri / Bandra / etc. Pin drops at the
   named zone's centroid. Zone names live in `lib/config/zones.ts`
   (67 localities across 10 cities, each with coords + risk score).
2. **Click the map** — drops a custom pin anywhere and clears the zone
   selection. Useful when the locality you want isn't in the dropdown.
3. **Neither** — fires at the city centroid with the type's default
   ring size (same as pre-H3 behavior for backward compat).

### Ring size controls the disk

Each disruption type has a recommended default in `lib/utils/h3.ts`:

```ts
export const RING_SIZE_BY_TYPE = {
  heavy_rainfall: 3,     // ~2.8 km — localized monsoon cell
  aqi_grap_iv:    5,     // ~4.6 km — pollution band
  cyclone:       10,     // ~9.0 km — wider wind field
  platform_outage: 15,   // ~14 km — full metro area
  curfew_bandh:   7,     // ~6.4 km — locality / neighborhood
};
```

The admin can override with the ring-size slider. Cells affected grow
cubically with ring size: `1 + 3N(N+1)`. A few concrete sizes:

| Rings | Cells | Radius | Typical use |
|---|---|---|---|
| 1 | 7 | ~0.9 km | Single block flood |
| 3 | 37 | ~2.8 km | Rainfall hotspot |
| 5 | 91 | ~4.6 km | AQI band |
| 7 | 169 | ~6.4 km | Bandh / curfew locality |
| 10 | 331 | ~9.0 km | Cyclone wind field |
| 15 | 721 | ~14 km | Full metro outage |

### The fire request

The Fire button posts to `/api/admin/demo-trigger`:

```json
{
  "city": "mumbai",
  "event_type": "heavy_rainfall",
  "severity": 7,
  "zone_latitude": 19.1197,
  "zone_longitude": 72.8464,
  "h3_ring_size": 3
}
```

The server (`app/api/admin/demo-trigger/route.ts`):

```ts
const centerCell   = toCell(originLat, originLng);        // 88608b0961fffff
const affectedCells = disk(centerCell, ringSize);          // [37 cell ids]

INSERT INTO live_disruption_events (
  event_type, severity_score, city,
  zone_latitude, zone_longitude,
  center_h3_cell, h3_ring_size, affected_h3_cells,
  ...
);
```

So every event row now carries its own hexagonal footprint — center
cell + ring size + precomputed cell list.

---

## 5. Matching riders to the disruption

This is the payoff — the step that used to be "haversine against a
city centroid" and is now "is your cell in this disk."

Two code paths do this:

### A. Bulk match at fire time (adjudicator)

`lib/adjudicator/claims.ts::processClaimsForEvent` runs the moment a
disruption is created. It:

1. Pulls every active weekly policy (`is_active = true`,
   `payment_status in (paid, demo)`, within current week).
2. One round-trip SELECT for the **latest heartbeat per candidate
   profile in the last 30 minutes**, non-offline. Deduped in-memory to
   one row per driver.
3. For each policy, compute the "effective cell":
   - Prefer `latestHeartbeat.h3_cell` (live position).
   - Fall back to the driver's registered `profile.zone_latitude/lng`
     → `toCell(lat, lng)` so someone who just came online isn't
     penalized.
4. **Membership check:** `isInDisk(effectiveCell, event.center_h3_cell,
   event.h3_ring_size)`. Under the hood this is
   `gridDistance(cell, center) <= ringSize` — single integer compare.
5. If yes: create the claim, run fraud checks, pay out.

Legacy fallback: if a driver hits the membership check and fails but
the event has a non-zero `geofence_radius_km`, we try the old haversine
circle once before skipping. This keeps pre-H3 events (from before
migration 014) working.

### B. Per-claim verification (engine.ts)

`lib/claims/engine.ts::verifyGate2` is invoked when a claim needs
re-verification (driver-initiated verification flow, or the
zero-touch path refusing to auto-approve). Same logic, per claim:

```ts
// Primary: H3 membership on any active heartbeat in last 4 hours
gpsWithinZone = activeEntries.some(l =>
  l.h3_cell && isInDisk(l.h3_cell, event.center_h3_cell, event.h3_ring_size)
);

// Fallback 1: haversine against event lat/lng (pre-H3 events)
// Fallback 2: haversine against the driver's registered profile zone
```

The two paths converge on the same decision — only drivers whose live
position intersects the event's hex disk are eligible.

---

## 6. The end-to-end flow, one diagram

```
  admin
   │
   │  pick city + zone (or click map)  ┌──────────────────────────────────┐
   ▼                                   │ lib/utils/h3.ts                  │
┌──────────────────────────┐           │   toCell(lat,lng) → 88608b...    │
│ /admin/triggers          │           │   disk(center, ring) → [cells]   │
│  pin, ring slider        │           └──────────────────────────────────┘
└─────────────┬────────────┘                      ▲
              │ POST                              │
              ▼                                   │
┌──────────────────────────┐                      │
│ /api/admin/demo-trigger  │──────────────────────┘
│  compute center + disk   │
└─────────────┬────────────┘
              │ INSERT
              ▼
┌──────────────────────────┐           ┌──────────────────────────────────┐
│ live_disruption_events   │           │ driver_activity_logs              │
│  center_h3_cell          │           │   h3_cell filled on every         │
│  h3_ring_size            │           │   POST /api/driver/activity       │
│  affected_h3_cells       │           │   every 5 min                     │
└─────────────┬────────────┘           └──────────────────┬───────────────┘
              │                                           │
              │ processClaimsForEvent                     │
              │                                           │
              └─────────────────────┬─────────────────────┘
                                    │
                                    ▼
                      ┌──────────────────────────┐
                      │ for each active policy:  │
                      │   cell ← latest log h3   │
                      │          ?? profile.zone │
                      │   if isInDisk(cell,      │
                      │              center, N): │
                      │     create claim         │
                      │     fraud checks         │
                      │     auto-pay             │
                      └──────────────────────────┘
                                    │
                                    ▼
                          parametric_claims
                          (only affected drivers)
```

---

## 7. What the admin dashboard shows

`/admin/triggers` (the map inside the Demo Trigger Panel) reads:

- **Active riders** → `driver_activity_logs` from the last 30 minutes,
  non-offline, deduped to one row per driver (latest wins). Drawn as
  colored hexagons — the more riders in a cell, the deeper the indigo.
- **Active disruptions** → `live_disruption_events` where
  `resolved_at IS NULL`. Red dashed outline for each affected cell,
  a red dot at the center.
- **Preview (orange)** → the disk that *would* fire if you pressed the
  button now. Updates live as you change pin or ring size.
- **Eligible rider count** → `riders.filter(r => affected.has(r.h3_cell)).length`.
  Same logic as the real adjudicator would use, computed client-side.
  You see the number before you commit.

The fire button label reads whichever applies:

- `Fire in Andheri · 12 riders` (zone selected)
- `Fire at pin · 5 riders` (custom pin)
- `Fire at city centroid` (neither — legacy behavior)

---

## 8. Schema

Migration `supabase/migrations/014_h3_zones.sql`:

```sql
ALTER TABLE driver_activity_logs
  ADD COLUMN h3_cell TEXT;                              -- resolution-8 cell id

CREATE INDEX idx_activity_h3_cell
  ON driver_activity_logs(h3_cell, recorded_at DESC)
  WHERE h3_cell IS NOT NULL;

ALTER TABLE live_disruption_events
  ADD COLUMN center_h3_cell    TEXT,
  ADD COLUMN h3_ring_size      INT,
  ADD COLUMN affected_h3_cells TEXT[];

CREATE INDEX idx_events_affected_h3_cells
  ON live_disruption_events USING GIN (affected_h3_cells)
  WHERE affected_h3_cells IS NOT NULL;
```

The GIN index on `affected_h3_cells` makes "show me every event that
covers cell X" a `WHERE X = ANY(affected_h3_cells)` query that hits
the index directly. We don't use that query path today (Gate 2 uses
`gridDistance` in app code), but it's ready for future features like
"notify riders who enter an active disruption zone."

All cells are stored as plain `TEXT` (15-char hex). Nothing requires
the `h3-pg` Postgres extension — that simplifies Supabase deployment
enormously.

---

## 9. Worked examples

### Example 1 — Andheri rainfall

```
Admin picks:    Mumbai → Andheri → heavy_rainfall (ring 3)
Pin coords:     19.1197, 72.8464
center cell:    88608b0961fffff
disk(3 rings):  37 cells covering ~2.8 km radius

Three riders on the map:
  Alice   cell 88608b0961fffff   ← exactly in Andheri (ring 0)
  Bob     cell 88608b0b19fffff   ← Bandra, ring 6 away
  Charlie cell 88608b096bfffff   ← ring 2 away (N Andheri)

Event fires. Adjudicator checks each:
  Alice   isInDisk(ring 0)  → TRUE   → claim created, paid
  Bob     isInDisk(ring 6)  → FALSE  → skipped
  Charlie isInDisk(ring 2)  → TRUE   → claim created, paid
```

Two claims, not three. Before H3, all three would have paid out
because all three are within 15 km of Mumbai's centroid.

### Example 2 — custom pin

Admin clicks somewhere between Andheri and Bandra that isn't in the
zone dropdown — say Vile Parle. The zone field clears, the pin drops
at the click coords, `toCell(click.lat, click.lng)` resolves to
whichever cell contains Vile Parle. Ring 3 covers roughly 37 cells
in a 2.8 km radius around that point — which includes parts of
Andheri, Santacruz, Khar depending on exact coords. Fire → those
riders get claims.

### Example 3 — platform outage (city-wide)

`platform_outage` defaults to ring 15 (~14 km), and the `TRIGGERS`
config still reports `geofence_radius_km: 0` meaning "no circle
filter." The H3 disk of ring 15 is 721 cells, covering most of a
typical Indian metro. Effectively every active rider in the city
gets paid — which is the right behavior for a platform-wide outage.

---

## 10. File map

```
lib/utils/h3.ts                         # h3-js wrappers + ring defaults
lib/config/zones.ts                     # named zone dropdown data (67 localities)
supabase/migrations/014_h3_zones.sql    # schema

app/api/driver/activity/route.ts        # fills h3_cell on every heartbeat
app/api/admin/demo-trigger/route.ts     # accepts zone_latitude/longitude + ring
lib/adjudicator/events.ts               # insertDisruptionEvent writes h3 fields
lib/adjudicator/claims.ts               # processClaimsForEvent uses disk membership
lib/claims/engine.ts                    # verifyGate2 uses disk membership

components/admin/ZoneH3Map.tsx          # Leaflet + h3 polygon overlay
app/(admin)/admin/triggers/page.tsx     # the user-facing panel
```

---

## 11. Known caveats

- **Legacy rows have `h3_cell = NULL`.** Heartbeats inserted before
  migration 014 don't have cells. `verifyGate2` computes them on the
  fly from lat/lng as a fallback, so it's not a correctness bug — just
  slightly slower until the row rotates out of the 30-min window or
  gets backfilled.
- **Ring size is not adaptive.** We use a fixed default per event
  type. If a monsoon cell is actually 5 km wide, our ring-3 disk
  under-counts it. Tuning here is a future improvement (could weight
  the ring by `severity_score`).
- **One resolution everywhere.** Res 8 fits most use cases, but a
  massive cyclone could want res 6 (~3 km cells) and a city-block flood
  could want res 9 (~170 m). We don't mix resolutions today.
- **`affected_h3_cells` duplicates `disk(center_h3_cell, h3_ring_size)`.**
  We store both for fast direct reads in the UI. If they drift (e.g.,
  someone updates `h3_ring_size` without recomputing the list) the
  app code trusts `center` + `ring`, which is the authoritative pair.

---

## 12. tl;dr

1. Every heartbeat gets a **single H3 cell ID** at resolution 8 — a
   ~920 m hexagon.
2. Every disruption event stores a **center cell + ring size** — a
   hexagonal disk.
3. Matching a rider to a disruption is `gridDistance(rider_cell,
   center_cell) <= ring_size` — an integer compare in app code,
   no SQL trig, no PostGIS.
4. The admin UI renders the disk as red hexagons, previews the disk
   before you fire, and counts exactly how many riders would be
   eligible.
5. Pre-H3 events and cold-start drivers both have safe fallbacks so
   nothing breaks during rollout.
