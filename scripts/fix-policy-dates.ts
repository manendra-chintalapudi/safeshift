/**
 * One-time fix: correct weekly_policies where week_start_date falls on a
 * non-Monday due to the UTC formatDate bug.
 *
 * Run with: npx tsx scripts/fix-policy-dates.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function fix() {
  // Fetch all policies
  const { data: policies, error } = await supabase
    .from('weekly_policies')
    .select('id, week_start_date, week_end_date');

  if (error) { console.error('Fetch error:', error); process.exit(1); }
  if (!policies?.length) { console.log('No policies found.'); return; }

  let fixed = 0;
  for (const p of policies) {
    const start = new Date(p.week_start_date + 'T00:00:00');
    const dayOfWeek = start.getDay(); // 0=Sun, 1=Mon, ...

    if (dayOfWeek !== 1) {
      // Not a Monday — shift forward to next Monday
      const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const correctedStart = new Date(start);
      correctedStart.setDate(start.getDate() + daysToAdd);
      const correctedEnd = new Date(correctedStart);
      correctedEnd.setDate(correctedStart.getDate() + 6);

      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const newStart = fmt(correctedStart);
      const newEnd = fmt(correctedEnd);

      console.log(`Policy ${p.id}: ${p.week_start_date} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]}) → ${newStart} (Mon), end: ${p.week_end_date} → ${newEnd}`);

      const { error: updateErr } = await supabase
        .from('weekly_policies')
        .update({ week_start_date: newStart, week_end_date: newEnd, claim_active_from: newStart })
        .eq('id', p.id);

      if (updateErr) {
        console.error(`  Failed to update ${p.id}:`, updateErr.message);
      } else {
        fixed++;
      }
    }
  }

  console.log(`\nDone. Fixed ${fixed} of ${policies.length} policies.`);
}

fix();
