// ============================================================================
// GET /api/driver/dashboard — Aggregated dashboard data in one call
// ============================================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCityCoordinates } from '@/lib/config/cities';
import { getZonesForCity } from '@/lib/config/zones';
import { isSundayPaymentWindow, getNextSunday } from '@/lib/utils/date';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function zoneStatus(alertCount: number): 'safe' | 'alert' | 'danger' {
  if (alertCount === 0) return 'safe';
  if (alertCount <= 2) return 'alert';
  return 'danger';
}

// ---------------------------------------------------------------------------
// Types for Supabase selects
// ---------------------------------------------------------------------------

interface ProfileRow {
  full_name: string | null;
  city: string | null;
  zone_latitude: number | null;
  zone_longitude: number | null;
  trust_score: number;
  phone_number: string | null;
}

interface PlanRow {
  name: string;
  max_weekly_payout_inr: number;
  tier: string;
}

interface PolicyRow {
  id: string;
  final_premium_inr: number;
  week_start_date: string;
  week_end_date: string;
  plan_packages: PlanRow | null;
}

interface WalletRow {
  total_earned_inr: number;
  this_week_earned_inr: number;
  total_claims: number;
}

interface CoinBalanceRow {
  balance: number;
}

interface DisruptionRow {
  id: string;
  event_type: string;
  severity_score: number;
  city: string;
  trigger_value: number | null;
  created_at: string;
}

interface StreakPolicyRow {
  week_start_date: string;
  payment_status: string;
}

// ---------------------------------------------------------------------------
// ML response shapes
// ---------------------------------------------------------------------------

interface MLPrediction {
  probability: number;
  risk_level: string;
  aqi_current?: number;
}

interface MLZoneResponse {
  city_zones?: unknown[];
  driver_zones?: unknown[];
  zones?: unknown[];
}

// ---------------------------------------------------------------------------
// Open-Meteo response shapes
// ---------------------------------------------------------------------------

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation?: number[];
    weather_code?: number[];
    us_aqi?: (number | null)[];
  };
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const fast = url.searchParams.get('fast') === '1'; // Skip ML calls for instant load

    // 1. Auth check
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const weekStart = getMonday(now).toISOString();

    // 2. Parallel Supabase queries
    const [
      profileRes,
      policyRes,
      claimsRes,
      walletRes,
      coinsRes,
      disruptionsRes,
      streakRes,
      lastPolicyRes,
      nextWeekPolicyRes,
    ] = await Promise.all([
      // Profile
      admin
        .from('profiles')
        .select('full_name, city, zone_latitude, zone_longitude, trust_score, phone_number')
        .eq('id', user.id)
        .single(),

      // Active policy (this week) — match by dates + paid status, not just is_active flag
      // This makes the dashboard resilient to cron timing (Monday cron may not have run yet)
      admin
        .from('weekly_policies')
        .select('id, final_premium_inr, week_start_date, week_end_date, plan_packages(name, max_weekly_payout_inr, tier)')
        .eq('profile_id', user.id)
        .in('payment_status', ['paid', 'demo'])
        .lte('week_start_date', today)
        .gte('week_end_date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Claims this week
      admin
        .from('parametric_claims')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', user.id)
        .gte('created_at', weekStart),

      // Wallet view
      admin
        .from('driver_wallet')
        .select('total_earned_inr, this_week_earned_inr, total_claims')
        .eq('driver_id', user.id)
        .single(),

      // Coin balance view
      admin
        .from('driver_coin_balance')
        .select('balance')
        .eq('profile_id', user.id)
        .single(),

      // Active disruptions (resolved later once we know city)
      // Fetch all unresolved first; we filter by city below
      admin
        .from('live_disruption_events')
        .select('id, event_type, severity_score, city, trigger_value, created_at')
        .is('resolved_at', null)
        .order('created_at', { ascending: false }),

      // Streak: all policies ordered by week_start_date DESC
      admin
        .from('weekly_policies')
        .select('week_start_date, payment_status')
        .eq('profile_id', user.id)
        .order('week_start_date', { ascending: false }),

      // Most recent policy (any status) — for reinstate flow
      admin
        .from('weekly_policies')
        .select('plan_packages(tier, name, slug)')
        .eq('profile_id', user.id)
        .order('week_end_date', { ascending: false })
        .limit(1)
        .single(),

      // Next/pending policy (paid for a future week, not the current week)
      admin
        .from('weekly_policies')
        .select('week_start_date, final_premium_inr, premium_reasoning, plan_packages(tier, name)')
        .eq('profile_id', user.id)
        .eq('is_active', false)
        .in('payment_status', ['paid', 'demo'])
        .gt('week_start_date', today)
        .order('week_start_date', { ascending: true })
        .limit(1)
        .single(),
    ]);

    const profile = profileRes.data as unknown as ProfileRow | null;
    const policy = policyRes.data as unknown as PolicyRow | null;
    const wallet = walletRes.data as unknown as WalletRow | null;
    const coins = coinsRes.data as unknown as CoinBalanceRow | null;
    const allDisruptions = (disruptionsRes.data as unknown as DisruptionRow[]) || [];
    const streakPolicies = (streakRes.data as unknown as StreakPolicyRow[]) || [];
    const lastPolicyRaw = lastPolicyRes?.data as unknown as { plan_packages: { tier: string; name: string; slug: string } | null } | null;
    const lastTier = lastPolicyRaw?.plan_packages?.slug ?? null;
    const nextWeekPolicyRaw = nextWeekPolicyRes?.data as unknown as { week_start_date: string; final_premium_inr: number; premium_reasoning: string | null; plan_packages: { tier: string; name: string } | null } | null;

    const sundayWindow = isSundayPaymentWindow();
    const nextRenewalDate = !sundayWindow ? getNextSunday().toISOString().split('T')[0] : null;

    const city = (profile?.city || 'mumbai').toLowerCase();
    const coords = getCityCoordinates(city) || { lat: profile?.zone_latitude || 19.076, lng: profile?.zone_longitude || 72.8777 };

    // Filter disruptions by user city
    const cityDisruptions = allDisruptions.filter((d) => d.event_type && d.city === city);

    // Claims count in the user's city (for zone pool card)
    const { count: zoneClaims } = await admin
      .from('parametric_claims')
      .select('*, live_disruption_events!inner(city)', { count: 'exact', head: true })
      .eq('live_disruption_events.city', city)
      .eq('status', 'paid');

    // Compute streak: consecutive weeks with paid or demo policies
    let streak = 0;
    for (const p of streakPolicies) {
      if (p.payment_status === 'paid' || p.payment_status === 'demo') {
        streak++;
      } else {
        break;
      }
    }

    // Compute Porter ID (same hash as profile page)
    const pName = profile?.full_name?.trim().toLowerCase() || '';
    const pPhone = profile?.phone_number?.replace(/^\+?91/, '') || '';
    let porterIdVal: string | null = null;
    if (pName && pPhone) {
      const raw = `${pName}:${pPhone}`;
      let h = 0;
      for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0; }
      porterIdVal = 'PTR-' + Math.abs(h).toString(16).toUpperCase().slice(0, 8);
    }

    // Resolve driver's zone name from lat/lng against known city zones
    let driverZoneName: string | null = null;
    const driverLat = profile?.zone_latitude;
    const driverLng = profile?.zone_longitude;
    if (driverLat && driverLng) {
      const cityZoneList = getZonesForCity(city);
      let bestDist = Infinity;
      for (const z of cityZoneList) {
        const d = (z.lat - driverLat) ** 2 + (z.lng - driverLng) ** 2;
        if (d < bestDist) { bestDist = d; driverZoneName = z.name; }
      }
    }

    // 3 + 4. External calls — skip if fast mode
    if (fast) {
      return NextResponse.json({
        profile: { full_name: profile?.full_name || null, city, trust_score: profile?.trust_score ?? 0, porter_id: porterIdVal, zone_name: driverZoneName },
        policy: policy ? { id: policy.id, tier: policy.plan_packages?.tier ?? null, name: policy.plan_packages?.name ?? null, premium: policy.final_premium_inr, max_payout: policy.plan_packages?.max_weekly_payout_inr ?? 0, week_start: policy.week_start_date, week_end: policy.week_end_date } : null,
        weather: null,
        predictions: { rainfall: null, wind: null, aqi: null },
        forecast: [],
        alerts: cityDisruptions.map((d) => ({ id: d.id, event_type: d.event_type, severity_score: d.severity_score, city: d.city, trigger_value: d.trigger_value, created_at: d.created_at })),
        zones: { city_zones: [], driver_zones: [] },
        wallet: { total_earned: wallet?.total_earned_inr ?? 0, this_week_earned: wallet?.this_week_earned_inr ?? 0, total_claims: wallet?.total_claims ?? claimsRes.count ?? 0 },
        coins: { balance: coins?.balance ?? 0 },
        streak,
        zone_status: zoneStatus(cityDisruptions.length),
        last_tier: lastTier,
        next_week_policy: nextWeekPolicyRaw ? {
          tier: nextWeekPolicyRaw.plan_packages?.tier ?? null,
          name: nextWeekPolicyRaw.plan_packages?.name ?? null,
          premium: nextWeekPolicyRaw.final_premium_inr,
          week_start: nextWeekPolicyRaw.week_start_date,
          auto_renewed: nextWeekPolicyRaw.premium_reasoning?.startsWith('[Auto-renewed]') ?? false,
        } : null,
        is_sunday_window: sundayWindow,
        next_renewal_date: nextRenewalDate,
        zone_claims: zoneClaims ?? 0,
        city_coords: { lat: coords.lat, lng: coords.lng },
      });
    }

    const [
      rainfallResult,
      windResult,
      aqiResult,
      driverZonesResult,
      cityZonesResult,
      forecastResult,
      aqiLiveResult,
    ] = await Promise.allSettled([
      // ML: rainfall prediction
      fetch(`${ML_SERVICE_URL}/predict/rainfall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city }),
      }).then((r) => r.json() as Promise<MLPrediction>),

      // ML: wind prediction
      fetch(`${ML_SERVICE_URL}/predict/wind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city }),
      }).then((r) => r.json() as Promise<MLPrediction>),

      // ML: AQI prediction
      fetch(`${ML_SERVICE_URL}/predict/aqi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city }),
      }).then((r) => r.json() as Promise<MLPrediction>),

      // ML: driver zones
      fetch(`${ML_SERVICE_URL}/driver/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, driver_id: user.id }),
      }).then((r) => r.json() as Promise<MLZoneResponse>),

      // ML: city zones
      fetch(`${ML_SERVICE_URL}/zones/${city}`).then(
        (r) => r.json() as Promise<MLZoneResponse>,
      ),

      // Open-Meteo 5-day forecast + Air Quality
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=precipitation_sum,wind_speed_10m_max,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,precipitation,weather_code&current=temperature_2m,precipitation,wind_speed_10m&timezone=Asia/Kolkata&forecast_days=2`,
      ).then((r) => r.json() as Promise<OpenMeteoResponse>),

      // Air Quality API (current + hourly for daily aggregation)
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lng}&current=us_aqi&hourly=us_aqi&timezone=Asia/Kolkata&forecast_days=5`,
      ).then((r) => r.json() as Promise<{ current?: { us_aqi?: number }; hourly?: { time?: string[]; us_aqi?: (number | null)[] } }>),
    ]);

    // Safe extractors
    const rainfall = rainfallResult.status === 'fulfilled' ? rainfallResult.value : null;
    const wind = windResult.status === 'fulfilled' ? windResult.value : null;
    const aqi = aqiResult.status === 'fulfilled' ? aqiResult.value : null;
    const driverZones = driverZonesResult.status === 'fulfilled' ? driverZonesResult.value : null;
    const cityZones = cityZonesResult.status === 'fulfilled' ? cityZonesResult.value : null;
    const forecastRaw = forecastResult.status === 'fulfilled' ? forecastResult.value : null;
    const aqiLive = aqiLiveResult.status === 'fulfilled' ? aqiLiveResult.value : null;

    // Process Open-Meteo forecast
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Current AQI from Air Quality API or ML service
    let currentAqi = aqiLive?.current?.us_aqi ?? 0;
    if (currentAqi === 0 && aqi?.aqi_current) {
      currentAqi = aqi.aqi_current;
    }

    // Build daily AQI map from hourly data
    const dailyAqiMap: Record<string, number> = {};
    if (aqiLive?.hourly?.time && aqiLive.hourly.us_aqi) {
      const times = aqiLive.hourly.time;
      const vals = aqiLive.hourly.us_aqi;
      const dayMaxes: Record<string, number> = {};
      for (let i = 0; i < times.length; i++) {
        const date = times[i].slice(0, 10);
        const v = vals[i];
        if (v != null) {
          dayMaxes[date] = Math.max(dayMaxes[date] ?? 0, v);
        }
      }
      Object.assign(dailyAqiMap, dayMaxes);
    }

    const forecast = (forecastRaw?.daily?.time ?? []).map((date, i) => {
      const d = new Date(date);
      return {
        date,
        day_name: dayNames[d.getDay()],
        temp_max: forecastRaw?.daily?.temperature_2m_max?.[i] ?? 0,
        temp_min: forecastRaw?.daily?.temperature_2m_min?.[i] ?? 0,
        rain_mm: forecastRaw?.daily?.precipitation_sum?.[i] ?? 0,
        wind_kmh: forecastRaw?.daily?.wind_speed_10m_max?.[i] ?? 0,
        aqi: dailyAqiMap[date] ?? 0,
      };
    });

    // Build hourly weather for 24h radar
    const hourly = (forecastRaw?.hourly?.time ?? []).slice(0, 24).map((time, i) => ({
      time,
      hour: new Date(time).getHours(),
      temp: forecastRaw?.hourly?.temperature_2m?.[i] ?? 0,
      rain_mm: forecastRaw?.hourly?.precipitation?.[i] ?? 0,
      weather_code: forecastRaw?.hourly?.weather_code?.[i] ?? 0,
    }));

    // 5. Assemble response
    return NextResponse.json({
      profile: {
        full_name: profile?.full_name || null,
        city,
        trust_score: profile?.trust_score ?? 0,
        porter_id: porterIdVal,
        zone_name: driverZoneName,
      },
      policy: policy
        ? {
            id: policy.id,
            tier: policy.plan_packages?.tier ?? null,
            name: policy.plan_packages?.name ?? null,
            premium: policy.final_premium_inr,
            max_payout: policy.plan_packages?.max_weekly_payout_inr ?? 0,
            week_start: policy.week_start_date,
            week_end: policy.week_end_date,
          }
        : null,
      weather: {
        current_temp: forecastRaw?.current?.temperature_2m ?? null,
        current_rain_mm: forecastRaw?.current?.precipitation ?? null,
        current_aqi: currentAqi,
        current_wind: forecastRaw?.current?.wind_speed_10m ?? null,
      },
      predictions: {
        rainfall: rainfall
          ? { probability: rainfall.probability, risk_level: rainfall.risk_level }
          : null,
        wind: wind
          ? { probability: wind.probability, risk_level: wind.risk_level }
          : null,
        aqi: aqi
          ? { probability: aqi.probability, risk_level: aqi.risk_level, aqi_current: aqi.aqi_current ?? currentAqi }
          : null,
      },
      forecast,
      hourly,
      alerts: cityDisruptions.map((d) => ({
        id: d.id,
        event_type: d.event_type,
        severity_score: d.severity_score,
        city: d.city,
        trigger_value: d.trigger_value,
        created_at: d.created_at,
      })),
      zones: {
        city_zones: cityZones?.zones ?? cityZones?.city_zones ?? [],
        driver_zones: driverZones?.driver_zones ?? [],
      },
      wallet: {
        total_earned: wallet?.total_earned_inr ?? 0,
        this_week_earned: wallet?.this_week_earned_inr ?? 0,
        total_claims: wallet?.total_claims ?? claimsRes.count ?? 0,
      },
      coins: {
        balance: coins?.balance ?? 0,
      },
      streak,
      zone_status: zoneStatus(cityDisruptions.length),
      last_tier: lastTier,
      next_week_policy: nextWeekPolicyRaw ? {
        tier: nextWeekPolicyRaw.plan_packages?.tier ?? null,
        name: nextWeekPolicyRaw.plan_packages?.name ?? null,
        premium: nextWeekPolicyRaw.final_premium_inr,
        week_start: nextWeekPolicyRaw.week_start_date,
        auto_renewed: nextWeekPolicyRaw.premium_reasoning?.startsWith('[Auto-renewed]') ?? false,
      } : null,
      is_sunday_window: sundayWindow,
      next_renewal_date: nextRenewalDate,
      zone_claims: zoneClaims ?? 0,
      city_coords: { lat: coords.lat, lng: coords.lng },
    });
  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
