// ============================================================================
// Dynamic Premium Engine — Calls Python ML Service for real predictions
// FinalPremium = BasePremium + WeatherRisk + UBI
// Floor: never below BasePremium
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { PLAN_PACKAGES, PREMIUM } from '@/lib/config/constants';
import type { Profile } from '@/lib/types/database';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

interface PremiumResult {
  basePremium: number;
  weatherRisk: number;
  ubiAddon: number;
  finalPremium: number;
  reasoning: string;
  breakdown?: {
    rainfall_probability: number;
    wind_probability: number;
    aqi_probability: number;
    combined_risk_score: number;
    city_weights: Record<string, number>;
  };
}

interface MLPremiumResponse {
  city: string;
  tier: string;
  base_premium: number;
  weather_risk_addon: number;
  ubi_addon: number;
  final_premium: number;
  breakdown: {
    rainfall_probability: number;
    wind_probability: number;
    aqi_probability: number;
    combined_risk_score: number;
    city_weights: Record<string, number>;
    aqi_current: number;
    aqi_max_forecast: number;
  };
}

/**
 * Calculate dynamic premium for a driver + plan combination
 * Uses the Python ML microservice for predictions
 */
export async function calculateDynamicPremium(
  profileId: string,
  planSlug: string
): Promise<PremiumResult> {
  const supabase = createAdminClient();

  // Get base premium from plan
  const plan = PLAN_PACKAGES.find((p) => p.slug === planSlug);
  const basePremium = plan?.weekly_premium_inr ?? 80;

  // Get profile for city + claim history
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('city, zone_latitude, zone_longitude')
    .eq('id', profileId)
    .single();

  const profile = profileRaw as unknown as Pick<Profile, 'city' | 'zone_latitude' | 'zone_longitude'> | null;

  if (!profile?.city) {
    return fallbackPremium(basePremium, 'No city set — using base premium only');
  }

  // Get driver's claim history count
  const { count: claimCount } = await supabase
    .from('parametric_claims')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId);

  // Call ML service
  try {
    const res = await fetch(`${ML_SERVICE_URL}/predict/premium`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: profile.city,
        tier: planSlug,
        driver_claim_history: claimCount || 0,
      }),
    });

    if (!res.ok) {
      throw new Error(`ML service returned ${res.status}`);
    }

    const data: MLPremiumResponse = await res.json();

    // Generate reasoning
    const reasoning = generateReasoning(data);

    return {
      basePremium: data.base_premium,
      weatherRisk: data.weather_risk_addon,
      ubiAddon: data.ubi_addon,
      finalPremium: data.final_premium,
      reasoning,
      breakdown: data.breakdown,
    };
  } catch (error) {
    console.warn('[PremiumCalc] ML service unavailable, using fallback:', error);
    return fallbackPremium(basePremium, 'ML service unavailable — using base premium');
  }
}

function generateReasoning(data: MLPremiumResponse): string {
  const parts: string[] = [];
  const b = data.breakdown;

  parts.push(`Base: ₹${data.base_premium} (${data.tier} tier).`);

  if (b.rainfall_probability > 0.3) {
    parts.push(`High rainfall risk (${(b.rainfall_probability * 100).toFixed(1)}%).`);
  } else if (b.rainfall_probability > 0.1) {
    parts.push(`Moderate rainfall risk.`);
  }

  if (b.wind_probability > 0.1) {
    parts.push(`Elevated cyclone/wind risk (${(b.wind_probability * 100).toFixed(1)}%).`);
  }

  if (b.aqi_probability > 0.3) {
    parts.push(`High AQI — GRAP-IV likely (AQI forecast: ${b.aqi_max_forecast}).`);
  }

  if (b.rainfall_probability <= 0.1 && b.wind_probability <= 0.05 && b.aqi_probability <= 0.1) {
    parts.push(`Low overall weather risk this week.`);
  }

  parts.push(`Weather: +₹${data.weather_risk_addon.toFixed(0)}, UBI: +₹${data.ubi_addon}. Final: ₹${data.final_premium.toFixed(0)}/week.`);

  return parts.join(' ');
}

function fallbackPremium(basePremium: number, reason: string): PremiumResult {
  return {
    basePremium,
    weatherRisk: PREMIUM.WEATHER_RISK_MIN,
    ubiAddon: 0,
    finalPremium: basePremium + PREMIUM.WEATHER_RISK_MIN,
    reasoning: reason,
  };
}
