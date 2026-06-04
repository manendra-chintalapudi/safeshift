// ============================================================================
// Location Integrity — GPS vs IP cross-check, impossible travel detection
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { haversineDistance } from '@/lib/utils/geo';
import { FRAUD } from '@/lib/config/constants';
import { fetchWithRetry } from '@/lib/utils/retry';

interface LocationIntegrityResult {
  locationAnomaly: boolean;
  gpsAccuracyFlag: boolean;
  reason?: string;
}

interface IpApiResponse {
  status: string;
  lat: number;
  lon: number;
  city: string;
}

/**
 * Check GPS vs IP location integrity
 * Uses ip-api.com free tier for IP geolocation
 */
export async function checkLocationIntegrity(
  gpsLat: number,
  gpsLng: number,
  ipAddress?: string
): Promise<LocationIntegrityResult> {
  let locationAnomaly = false;
  const gpsAccuracyFlag = false;

  if (!ipAddress) {
    return { locationAnomaly: false, gpsAccuracyFlag: false };
  }

  try {
    // Skip private/local IPs
    if (
      ipAddress.startsWith('127.') ||
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('192.168.') ||
      ipAddress === '::1'
    ) {
      return { locationAnomaly: false, gpsAccuracyFlag: false };
    }

    const ipData = await fetchWithRetry<IpApiResponse>(
      `http://ip-api.com/json/${ipAddress}?fields=status,lat,lon,city`,
      { retries: 1, timeoutMs: 5000 }
    );

    if (ipData.status === 'success') {
      const distance = haversineDistance(gpsLat, gpsLng, ipData.lat, ipData.lon);

      if (distance > FRAUD.LOCATION_MISMATCH_KM) {
        locationAnomaly = true;
      }
    }
  } catch (error) {
    // IP lookup failure is non-fatal — don't flag
    console.warn('[LocationIntegrity] IP lookup failed:', error);
  }

  return {
    locationAnomaly,
    gpsAccuracyFlag,
    reason: locationAnomaly ? `GPS vs IP distance exceeds ${FRAUD.LOCATION_MISMATCH_KM}km` : undefined,
  };
}

/**
 * Check for impossible travel: two activity logs >50km apart in <30min
 */
export async function checkImpossibleTravel(
  profileId: string,
  lat: number,
  lng: number
): Promise<boolean> {
  const supabase = createAdminClient();

  const windowStart = new Date(
    Date.now() - FRAUD.IMPOSSIBLE_TRAVEL_MINUTES * 60 * 1000
  ).toISOString();

  const { data: logsRaw } = await supabase
    .from('driver_activity_logs')
    .select('latitude, longitude, recorded_at')
    .eq('profile_id', profileId)
    .gte('recorded_at', windowStart)
    .order('recorded_at', { ascending: false })
    .limit(10);

  const logs = (logsRaw ?? []) as unknown as Array<{
    latitude: number | null;
    longitude: number | null;
    recorded_at: string;
  }>;

  for (const log of logs) {
    if (log.latitude == null || log.longitude == null) continue;

    const distance = haversineDistance(lat, lng, log.latitude, log.longitude);
    if (distance > FRAUD.IMPOSSIBLE_TRAVEL_KM) {
      return true;
    }
  }

  return false;
}
