// ============================================================================
// Trigger: AQI GRAP-IV (AQI >450)
// Sources: WAQI (primary) + Open-Meteo Air Quality (fallback)
// ============================================================================

import { getAQI } from '@/lib/clients/waqi';
import { getAQIFallback } from '@/lib/clients/open-meteo';
import { TRIGGERS } from '@/lib/config/constants';
import { calculateSeverity } from '@/lib/utils/geo';
import type { TriggerCandidate } from '../types';

const CONFIG = TRIGGERS.aqi_grap_iv;

export async function checkAqiTrigger(
  city: string,
  lat: number,
  lng: number
): Promise<TriggerCandidate | null> {
  const dataSources: string[] = [];
  let aqiValue = 0;
  let rawData: Record<string, unknown> = {};

  // Primary: WAQI
  const waqiData = await getAQI(lat, lng);
  if (waqiData) {
    dataSources.push('waqi');
    aqiValue = waqiData.aqi;
    rawData = { waqi: waqiData };
  }

  // Fallback: Open-Meteo Air Quality
  if (aqiValue === 0) {
    const aqiFallback = await getAQIFallback(lat, lng);
    if (aqiFallback) {
      dataSources.push('open-meteo-aqi');
      aqiValue = aqiFallback.aqi;
      rawData = { ...rawData, 'open-meteo-aqi': aqiFallback };
    }
  }

  // Check threshold: GRAP-IV is AQI > 450
  if (aqiValue < CONFIG.threshold) {
    return null;
  }

  return {
    event_type: 'aqi_grap_iv',
    city,
    latitude: lat,
    longitude: lng,
    severity_score: calculateSeverity(aqiValue, CONFIG.severity_range, CONFIG.severity_min, CONFIG.severity_max),
    trigger_value: aqiValue,
    trigger_threshold: CONFIG.threshold,
    geofence_radius_km: CONFIG.geofence_radius_km,
    data_sources: dataSources,
    raw_api_data: rawData,
    verified_by_api: true,
    verified_by_llm: false,
  };
}
