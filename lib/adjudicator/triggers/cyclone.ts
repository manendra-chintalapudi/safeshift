// ============================================================================
// Trigger: Cyclone (Wind >70 km/h)
// Sources: Open-Meteo (primary) + OpenWeatherMap (fallback)
// ============================================================================

import { getCurrentWind } from '@/lib/clients/open-meteo';
import { getCurrentWeather } from '@/lib/clients/openweathermap';
import { TRIGGERS } from '@/lib/config/constants';
import { calculateSeverity } from '@/lib/utils/geo';
import type { TriggerCandidate } from '../types';

const CONFIG = TRIGGERS.cyclone;

export async function checkCycloneTrigger(
  city: string,
  lat: number,
  lng: number
): Promise<TriggerCandidate | null> {
  const dataSources: string[] = [];
  let windSpeedKmh = 0;
  let rawData: Record<string, unknown> = {};

  // Primary: Open-Meteo (free, no key)
  const windData = await getCurrentWind(lat, lng);
  if (windData) {
    dataSources.push('open-meteo');
    // Use the higher of sustained wind or gusts
    windSpeedKmh = Math.max(windData.wind_speed_kmh, windData.wind_gusts_kmh);
    rawData = { 'open-meteo': windData };
  }

  // Fallback: OpenWeatherMap
  if (windSpeedKmh === 0) {
    const owmData = await getCurrentWeather(lat, lng);
    if (owmData) {
      dataSources.push('openweathermap');
      windSpeedKmh = Math.max(owmData.wind_speed_kmh, owmData.wind_gust_kmh);
      rawData = { ...rawData, openweathermap: owmData };
    }
  }

  // Check threshold: >70 km/h
  if (windSpeedKmh < CONFIG.threshold) {
    return null;
  }

  return {
    event_type: 'cyclone',
    city,
    latitude: lat,
    longitude: lng,
    severity_score: calculateSeverity(windSpeedKmh, CONFIG.severity_range, CONFIG.severity_min, CONFIG.severity_max),
    trigger_value: windSpeedKmh,
    trigger_threshold: CONFIG.threshold,
    geofence_radius_km: CONFIG.geofence_radius_km,
    data_sources: dataSources,
    raw_api_data: rawData,
    verified_by_api: true,
    verified_by_llm: false,
  };
}
