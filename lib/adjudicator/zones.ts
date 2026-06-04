// ============================================================================
// Zone Resolution — Get active cities with policies
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { getCityBySlug } from '@/lib/config/cities';
import type { ZoneInfo } from './types';

/**
 * Get all cities that have active policies (zones to monitor)
 */
export async function getActiveZones(): Promise<ZoneInfo[]> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('weekly_policies')
    .select('profiles(city, zone_latitude, zone_longitude)')
    .eq('is_active', true)
    .eq('payment_status', 'paid')
    .lte('week_start_date', today)
    .gte('week_end_date', today);

  if (error || !data) {
    console.error('[Zones] Error fetching active zones:', error);
    return [];
  }

  type PolicyWithProfile = { profiles: { city: string; zone_latitude: number; zone_longitude: number } | null };
  const rows = data as unknown as PolicyWithProfile[];

  const cityMap = new Map<string, ZoneInfo>();

  for (const row of rows) {
    const profile = row.profiles;
    if (!profile?.city) continue;

    const existing = cityMap.get(profile.city);
    if (existing) {
      existing.active_policy_count++;
    } else {
      const cityData = getCityBySlug(profile.city);
      cityMap.set(profile.city, {
        city: profile.city,
        latitude: cityData?.latitude ?? profile.zone_latitude,
        longitude: cityData?.longitude ?? profile.zone_longitude,
        active_policy_count: 1,
      });
    }
  }

  return Array.from(cityMap.values());
}
