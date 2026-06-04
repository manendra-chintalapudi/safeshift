/*
 * Backfill `h3_cell` on existing driver_activity_logs rows.
 *
 * Migration 014 added the column but did NOT fill it. New heartbeats get
 * it populated automatically (see app/api/driver/activity/route.ts), but
 * any row inserted before the migration has h3_cell = NULL and gets
 * silently skipped by the zone map.
 *
 * Run:
 *   npx tsx scripts/backfill-h3-cells.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { createClient } from '@supabase/supabase-js';
import { latLngToCell } from 'h3-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const H3_RESOLUTION = 8;
const PAGE = 1000;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  let totalUpdated = 0;
  let totalSkipped = 0;

  while (true) {
    const { data, error } = await db
      .from('driver_activity_logs')
      .select('id, latitude, longitude')
      .is('h3_cell', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(PAGE);

    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;

    const updates: Array<{ id: string; h3_cell: string }> = [];
    for (const row of data as Array<{ id: string; latitude: number; longitude: number }>) {
      try {
        updates.push({ id: row.id, h3_cell: latLngToCell(row.latitude, row.longitude, H3_RESOLUTION) });
      } catch {
        totalSkipped++;
      }
    }

    // Fire updates in parallel — one row per UPDATE because we only
    // change a single field and Supabase's API is row-at-a-time friendly.
    const results = await Promise.all(
      updates.map((u) =>
        db.from('driver_activity_logs').update({ h3_cell: u.h3_cell }).eq('id', u.id),
      ),
    );
    for (const r of results) if (r.error) { console.error(r.error); totalSkipped++; }

    totalUpdated += updates.length;
    process.stdout.write(`\rUpdated ${totalUpdated}...`);

    if (data.length < PAGE) break;
  }

  console.log(`\nDone. Updated ${totalUpdated}, skipped ${totalSkipped}.`);
  console.log(
    totalUpdated === 0
      ? 'No rows needed backfill. If the map still shows 0 riders, you probably need fresh heartbeats — see scripts/seed-rider-heartbeats.ts.'
      : 'Existing heartbeats now have h3_cell. New heartbeats will populate automatically.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
