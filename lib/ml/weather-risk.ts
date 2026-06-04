// ============================================================================
// Weather Risk Calculator
// Fallback premium add-on when the ML service isn't reachable.
// Uses a 7-day forecast from Open-Meteo directly — no seasonal multiplier
// (the 7-day horizon already reflects the current season; any hand-picked
// monthly scalar on top would be double-counting).
// ============================================================================

import { get7DayForecast, getAQIFallback } from '@/lib/clients/open-meteo';
import { TRIGGERS, PREMIUM } from '@/lib/config/constants';

interface WeatherRiskResult {
  weatherRisk: number;
  disruptionProbability: number;
  heavyRainDays: number;
  highWindDays: number;
  aqiBaseline: number;
}

/**
 * Calculate weather risk addon for premium.
 * - Fetch 7-day forecast from Open-Meteo
 * - Count days crossing rainfall / wind thresholds
 * - Get AQI baseline
 * - disruption_probability = weighted sum (rain 0.45, wind 0.35, aqi 0.20)
 * - weather_risk = WEATHER_RISK_MIN + probability × range, clamped to [MIN, MAX]
 */
export async function calculateWeatherRisk(
  _city: string,
  lat: number,
  lng: number
): Promise<WeatherRiskResult> {
  const [forecast, aqiData] = await Promise.all([
    get7DayForecast(lat, lng),
    getAQIFallback(lat, lng),
  ]);

  const heavyRainDays = forecast.filter(
    (day) => day.precipitation_sum_mm >= TRIGGERS.heavy_rainfall.threshold
  ).length;

  const highWindDays = forecast.filter(
    (day) => day.wind_speed_max_kmh >= TRIGGERS.cyclone.threshold
  ).length;

  const aqiBaseline = aqiData?.aqi ?? 0;

  const totalDays = Math.max(forecast.length, 1);
  const rainFactor = heavyRainDays / totalDays;
  const windFactor = highWindDays / totalDays;
  const aqiFactor = aqiBaseline >= TRIGGERS.aqi_grap_iv.threshold ? 1.0 : aqiBaseline / 500;

  const disruptionProbability = Math.min(
    1.0,
    rainFactor * 0.45 + windFactor * 0.35 + aqiFactor * 0.20
  );

  const range = PREMIUM.WEATHER_RISK_MAX - PREMIUM.WEATHER_RISK_MIN;
  const rawRisk = PREMIUM.WEATHER_RISK_MIN + disruptionProbability * range;
  const weatherRisk = Math.round(
    Math.min(PREMIUM.WEATHER_RISK_MAX, Math.max(PREMIUM.WEATHER_RISK_MIN, rawRisk))
  );

  return {
    weatherRisk,
    disruptionProbability,
    heavyRainDays,
    highWindDays,
    aqiBaseline,
  };
}
