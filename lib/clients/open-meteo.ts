// ============================================================================
// Open-Meteo API Client — Wind, Forecast, AQI Fallback
// Free: Unlimited, no API key required
// ============================================================================

import { fetchWithRetry } from '@/lib/utils/retry';
import { CACHE_TTL } from '@/lib/config/constants';

// --- Current Wind + Weather ---
interface OpenMeteoCurrentResponse {
  current: {
    wind_speed_10m: number;
    wind_gusts_10m: number;
    temperature_2m: number;
    precipitation: number;
  };
}

export interface WindData {
  wind_speed_kmh: number;
  wind_gusts_kmh: number;
  temperature_c: number;
  precipitation_mm: number;
  source: 'open-meteo';
}

export async function getCurrentWind(lat: number, lng: number): Promise<WindData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_gusts_10m,temperature_2m,precipitation`;
    const data = await fetchWithRetry<OpenMeteoCurrentResponse>(url, {
      cacheTtlMs: CACHE_TTL.WEATHER,
    });

    return {
      wind_speed_kmh: data.current.wind_speed_10m,
      wind_gusts_kmh: data.current.wind_gusts_10m,
      temperature_c: data.current.temperature_2m,
      precipitation_mm: data.current.precipitation,
      source: 'open-meteo',
    };
  } catch (error) {
    console.error('[Open-Meteo] Error fetching wind:', error);
    return null;
  }
}

// --- Daily Forecast (7-day) ---
interface OpenMeteoForecastResponse {
  daily: {
    time: string[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export interface ForecastDay {
  date: string;
  precipitation_sum_mm: number;
  wind_speed_max_kmh: number;
  wind_gusts_max_kmh: number;
  temp_max_c: number;
  temp_min_c: number;
}

export async function get7DayForecast(lat: number, lng: number): Promise<ForecastDay[]> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,temperature_2m_max,temperature_2m_min&timezone=Asia/Kolkata&forecast_days=7`;
    const data = await fetchWithRetry<OpenMeteoForecastResponse>(url, {
      cacheTtlMs: CACHE_TTL.WEATHER,
    });

    return data.daily.time.map((date, i) => ({
      date,
      precipitation_sum_mm: data.daily.precipitation_sum[i],
      wind_speed_max_kmh: data.daily.wind_speed_10m_max[i],
      wind_gusts_max_kmh: data.daily.wind_gusts_10m_max[i],
      temp_max_c: data.daily.temperature_2m_max[i],
      temp_min_c: data.daily.temperature_2m_min[i],
    }));
  } catch (error) {
    console.error('[Open-Meteo] Error fetching forecast:', error);
    return [];
  }
}

// --- AQI Fallback ---
interface OpenMeteoAQIResponse {
  current: {
    us_aqi: number;
    pm2_5: number;
    pm10: number;
  };
}

export interface AQIData {
  aqi: number;
  pm25: number;
  pm10: number;
  source: 'open-meteo';
}

export async function getAQIFallback(lat: number, lng: number): Promise<AQIData | null> {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10`;
    const data = await fetchWithRetry<OpenMeteoAQIResponse>(url, {
      cacheTtlMs: CACHE_TTL.AQI,
    });

    return {
      aqi: data.current.us_aqi,
      pm25: data.current.pm2_5,
      pm10: data.current.pm10,
      source: 'open-meteo',
    };
  } catch (error) {
    console.error('[Open-Meteo] Error fetching AQI:', error);
    return null;
  }
}
