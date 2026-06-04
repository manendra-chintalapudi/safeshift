/*
 * Seed recent heartbeats for every active policy so the zone map has
 * something to show. Writes one NEW driver_activity_logs row per active
 * driver, at a random named zone in that driver's city (with a bit of
 * jitter so multiple drivers land in different hexes).
 *
 * Use this when your dev DB has active policies but no recent activity —
 * i.e. nobody is running the mobile app emitting real heartbeats.
 *
 * Run:
 *   npx tsx scripts/seed-rider-heartbeats.ts
 *   npx tsx scripts/seed-rider-heartbeats.ts --city=mumbai
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { createClient } from '@supabase/supabase-js';
import { latLngToCell } from 'h3-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { CITY_ZONES } from '../lib/config/zones';

config({ path: resolve(process.cwd(), '.env.local') });

const H3_RESOLUTION = 8;
const JITTER_DEG = 0.006; // ~600 m random offset so drivers don't all stack

function cityArg(): string | null {
  const arg = process.argv.find((a) => a.startsWith('--city='));
  return arg ? arg.slice('--city='.length) : null;
}

function pickZone(city: string) {
  const zones = CITY_ZONES[city] ?? [];
  if (zones.length === 0) return null;
  return zones[Math.floor(Math.random() * zones.length)];
}

function pickStatus(): string {
  // Rough distribution — most drivers are actively working during a demo
  const r = Math.random();
  if (r < 0.55) return 'on_trip';
  if (r < 0.85) return 'online';
  if (r < 0.95) return 'searching';
  return 'offline';
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });
  const filter = cityArg();
  const today = new Date().toISOString().split('T')[0];

  // Pull every active policy, with the driver's city
  let query = db
    .from('weekly_policies')
    .select('profile_id, profiles(city, full_name)')
    .eq('is_active', true)
    .in('payment_status', ['paid', 'demo'])
    .lte('week_start_date', today)
    .gte('week_end_date', today);

  const { data, error } = await query;
  if (error) { console.error(error); process.exit(1); }

  type Row = { profile_id: string; profiles: { city: string | null; full_name: string | null } | null };
  const rows = ((data as unknown) as Row[]) || [];

  if (rows.length === 0) {
    console.log('No active policies — seed demo policies first, then re-run this.');
    return;
  }

  // Dedupe — one heartbeat per driver
  const seen = new Set<string>();
  const inserts: Array<Record<string, unknown>> = [];
  let skippedNoCity = 0;
  let skippedFilter = 0;
  let skippedNoZones = 0;

  for (const r of rows) {
    if (seen.has(r.profile_id)) continue;
    seen.add(r.profile_id);

    const city = r.profiles?.city;
    if (!city) { skippedNoCity++; continue; }
    if (filter && city !== filter) { skippedFilter++; continue; }

    const zone = pickZone(city);
    if (!zone) { skippedNoZones++; continue; }

    // Jitter so not every driver in the same zone lands in the exact same cell
    const lat = zone.lat + (Math.random() - 0.5) * JITTER_DEG;
    const lng = zone.lng + (Math.random() - 0.5) * JITTER_DEG;

    inserts.push({
      profile_id: r.profile_id,
      status: pickStatus(),
      latitude: lat,
      longitude: lng,
      h3_cell: latLngToCell(lat, lng, H3_RESOLUTION),
      recorded_at: new Date().toISOString(),
    });
  }

  if (inserts.length === 0) {
    console.log('Nothing to insert. Skipped —');
    console.log(`  no city on profile:   ${skippedNoCity}`);
    console.log(`  --city filter:        ${skippedFilter}`);
    console.log(`  no zones defined:     ${skippedNoZones}`);
    return;
  }

  // Bulk insert in one shot
  const { error: insErr } = await db.from('driver_activity_logs').insert(inserts);
  if (insErr) { console.error(insErr); process.exit(1); }

  console.log(`Seeded ${inserts.length} heartbeat(s) across ${new Set(inserts.map((i) => (i as { profile_id: string }).profile_id)).size} driver(s).`);
  if (skippedNoCity) console.log(`(skipped ${skippedNoCity} with no city on profile)`);
  if (skippedFilter) console.log(`(skipped ${skippedFilter} outside --city=${filter})`);
  if (skippedNoZones) console.log(`(skipped ${skippedNoZones} in cities with no zone data)`);
  console.log('\nHead to /admin/triggers and pick a zone — the rider count should be non-zero now.');
  console.log('Heartbeats go stale after 30 min; re-run this script when that happens.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
