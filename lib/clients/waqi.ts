// ============================================================================
// WAQI (World Air Quality Index) API Client — AQI Data
// Free tier: 1000 calls/day with token
// ============================================================================

import { fetchWithRetry } from '@/lib/utils/retry';
import { CACHE_TTL } from '@/lib/config/constants';

interface WAQIResponse {
  status: string;
  data: {
    aqi: number;
    city: { name: string; geo: [number, number] };
    iaqi: {
      pm25?: { v: number };
      pm10?: { v: number };
      no2?: { v: number };
      o3?: { v: number };
    };
    time: { s: string };
  };
}

export interface WAQIData {
  aqi: number;
  station_name: string;
  pm25: number | null;
  pm10: number | null;
  timestamp: string;
  source: 'waqi';
}

/**
 * Get AQI data for a location (nearest station)
 */
export async function getAQI(lat: number, lng: number): Promise<WAQIData | null> {
  const token = process.env.WAQI_API_TOKEN;
  if (!token) return null;

  try {
    const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${token}`;
    const data = await fetchWithRetry<WAQIResponse>(url, {
      cacheTtlMs: CACHE_TTL.AQI,
    });

    if (data.status !== 'ok') return null;

    return {
      aqi: data.data.aqi,
      station_name: data.data.city.name,
      pm25: data.data.iaqi.pm25?.v ?? null,
      pm10: data.data.iaqi.pm10?.v ?? null,
      timestamp: data.data.time.s,
      source: 'waqi',
    };
  } catch (error) {
    console.error('[WAQI] Error fetching AQI:', error);
    return null;
  }
}
