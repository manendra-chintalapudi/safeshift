// ============================================================================
// Trigger: Heavy Rainfall (>65mm/day)
// Sources: OpenWeatherMap (primary) + Open-Meteo (fallback)
// ============================================================================

import { getCurrentWeather } from '@/lib/clients/openweathermap';
import { get7DayForecast } from '@/lib/clients/open-meteo';
import { TRIGGERS } from '@/lib/config/constants';
import { calculateSeverity } from '@/lib/utils/geo';
import type { TriggerCandidate } from '../types';

const CONFIG = TRIGGERS.heavy_rainfall;

export async function checkRainfallTrigger(
  city: string,
  lat: number,
  lng: number
): Promise<TriggerCandidate | null> {
  const dataSources: string[] = [];
  let rainfallMm = 0;
  let rawData: Record<string, unknown> = {};

  // Primary: OpenWeatherMap
  const owmData = await getCurrentWeather(lat, lng);
  if (owmData) {
    dataSources.push('openweathermap');
    rainfallMm = owmData.rainfall_estimated_daily_mm;
    rawData = { openweathermap: owmData };
  }

  // Fallback: Open-Meteo daily forecast (today's precipitation_sum)
  if (rainfallMm === 0) {
    const forecast = await get7DayForecast(lat, lng);
    if (forecast.length > 0) {
      dataSources.push('open-meteo');
      rainfallMm = forecast[0].precipitation_sum_mm;
      rawData = { ...rawData, 'open-meteo': forecast[0] };
    }
  }

  // Check threshold
  if (rainfallMm < CONFIG.threshold) {
    return null;
  }

  return {
    event_type: 'heavy_rainfall',
    city,
    latitude: lat,
    longitude: lng,
    severity_score: calculateSeverity(rainfallMm, CONFIG.severity_range, CONFIG.severity_min, CONFIG.severity_max),
    trigger_value: rainfallMm,
    trigger_threshold: CONFIG.threshold,
    geofence_radius_km: CONFIG.geofence_radius_km,
    data_sources: dataSources,
    raw_api_data: rawData,
    verified_by_api: true,
    verified_by_llm: false,
  };
}
