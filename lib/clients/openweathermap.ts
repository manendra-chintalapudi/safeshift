// ============================================================================
// OpenWeatherMap API Client — Rainfall + Weather Data
// Free tier: 1000 calls/day
// ============================================================================

import { fetchWithRetry } from '@/lib/utils/retry';
import { CACHE_TTL } from '@/lib/config/constants';

interface OWMCurrentWeather {
  main: { temp: number; humidity: number };
  wind: { speed: number; gust?: number };
  rain?: { '1h'?: number; '3h'?: number };
  weather: Array<{ id: number; main: string; description: string }>;
  coord: { lat: number; lon: number };
}

export interface WeatherData {
  temperature_c: number;
  humidity: number;
  wind_speed_kmh: number;
  wind_gust_kmh: number;
  rainfall_1h_mm: number;
  rainfall_estimated_daily_mm: number;
  weather_condition: string;
  source: 'openweathermap';
}

/**
 * Get current weather data for a location
 */
export async function getCurrentWeather(lat: number, lng: number): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
    const data = await fetchWithRetry<OWMCurrentWeather>(url, {
      cacheTtlMs: CACHE_TTL.WEATHER,
    });

    const rainfall1h = data.rain?.['1h'] ?? 0;
    const rainfall3h = data.rain?.['3h'] ?? 0;
    // Estimate daily rainfall: use 1h*24 or 3h*8 (whichever is available)
    const estimatedDaily = rainfall1h > 0 ? rainfall1h * 24 : rainfall3h * 8;

    return {
      temperature_c: data.main.temp,
      humidity: data.main.humidity,
      wind_speed_kmh: data.wind.speed * 3.6, // m/s to km/h
      wind_gust_kmh: (data.wind.gust ?? data.wind.speed) * 3.6,
      rainfall_1h_mm: rainfall1h,
      rainfall_estimated_daily_mm: estimatedDaily,
      weather_condition: data.weather[0]?.main ?? 'Unknown',
      source: 'openweathermap',
    };
  } catch (error) {
    console.error('[OpenWeatherMap] Error fetching weather:', error);
    return null;
  }
}
