'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTranslator } from '@/lib/i18n/translations';
import { openRazorpayCheckout, type RazorpaySuccessResponse } from '@/lib/payments/razorpay-checkout';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardPolicy {
  id: string;
  tier: string | null;
  name: string | null;
  premium: number;
  max_payout: number;
  week_start: string;
  week_end: string;
}

interface DashboardProfile {
  full_name: string | null;
  city: string;
  trust_score: number;
}

interface DashboardData {
  profile: DashboardProfile;
  policy: DashboardPolicy | null;
  wallet: { total_earned: number; this_week_earned: number; total_claims: number };
  coins: { balance: number };
  zones: {
    city_zones: ZoneEntry[];
    driver_zones: ZoneEntry[];
  };
  last_tier: string | null;
  next_week_policy: { tier: string | null; name: string | null; premium: number; week_start: string } | null;
  is_sunday_window: boolean;
  next_renewal_date: string | null;
}

interface ZoneContribution {
  zone_id: string;
  zone_name: string;
  risk_score: number;
  time_percentage: number;
  risk_contribution: number;
}

interface UBIDetails {
  ubi_addon: number;
  weighted_risk_score: number;
  risk_level: string;
  zone_contributions: ZoneContribution[];
}

interface PremiumResult {
  city: string;
  date: string;
  tier: string;
  base_premium: number;
  weather_risk_addon: number;
  ubi_addon: number;
  final_premium: number;
  breakdown: {
    prediction_as_of: string;
    rainfall_probability: number;
    wind_probability: number;
    aqi_probability: number;
    combined_risk_score: number;
    city_weights: Record<string, number>;
    aqi_current: number;
    aqi_max_forecast: number;
  };
  ubi_details: UBIDetails;
}

interface DriverZonesData {
  driver_id: string;
  city: string;
  total_trips_last_30_days: number;
  zone_distribution: Array<{
    zone_id: string;
    zone_name: string;
    trips: number;
    percentage: number;
    avg_hours_per_day: number;
    risk_score: number;
    risk_factors: string[];
  }>;
}

interface ZoneEntry {
  zone_id?: string;
  zone_name?: string;
  name?: string;
  risk_score: number;
  risk_factors?: string[];
}

interface CoinActivity {
  id: string;
  activity: string;
  coins: number;
  description: string | null;
  created_at: string;
}

interface CoinsData {
  balance: number;
  history: CoinActivity[];
}

interface PolicyHistoryRow {
  id: string;
  week_start_date: string;
  week_end_date: string;
  final_premium_inr: number;
  payment_status: string;
  is_active: boolean;
  total_payout_this_week: number;
  plan_packages: { name: string; tier: string; max_weekly_payout_inr: number } | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ML_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8001';

const CITY_NAMES: Record<string, string> = {
  mumbai: 'Mumbai',
  delhi: 'Delhi',
  bangalore: 'Bangalore',
  chennai: 'Chennai',
  pune: 'Pune',
  hyderabad: 'Hyderabad',
  kolkata: 'Kolkata',
  ahmedabad: 'Ahmedabad',
  jaipur: 'Jaipur',
  lucknow: 'Lucknow',
};

const ACTIVITY_LABELS: Record<string, string> = {
  weekly_login: 'Weekly Login',
  consecutive_weeks: 'Consecutive Weeks Bonus',
  disruption_active: 'Active During Disruption',
  referral: 'Referral Bonus',
  complete_profile: 'Profile Completed',
  clean_claims: 'Clean Claims Streak',
  redeemed_discount: 'Redeemed Discount',
  redeemed_free_week: 'Redeemed Free Week',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T23:59:59');
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function riskColor(value: number): string {
  if (value > 0.7) return 'var(--red-acc)';
  if (value > 0.4) return '#F07820';
  return '#F07820';
}

function riskLabel(value: number): string {
  if (value > 0.7) return 'High';
  if (value > 0.4) return 'Moderate-High';
  if (value > 0.2) return 'Moderate';
  return 'Low';
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div style={{ padding: '20px 16px' }}>
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .skel {
          background: var(--ink-10);
          border-radius: 8px;
          animation: skeletonPulse 1.5s ease-in-out infinite;
        }
      `}</style>
      <div className="skel" style={{ width: 120, height: 14, marginBottom: 8 }} />
      <div className="skel" style={{ width: 200, height: 28, marginBottom: 20 }} />
      <div className="skel" style={{ height: 180, marginBottom: 16 }} />
      <div className="skel" style={{ height: 120, marginBottom: 16 }} />
      <div className="skel" style={{ height: 100, marginBottom: 16 }} />
      <div className="skel" style={{ height: 160, marginBottom: 16 }} />
      <div className="skel" style={{ height: 200, marginBottom: 16 }} />
      <div className="skel" style={{ height: 140 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 12,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mono"
      style={{
        fontSize: 10,
        color: 'var(--ink-60)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 12,
      }}
    >
      {children}
    </p>
  );
}

function ProgressBar({
  value,
  max,
  color,
  height,
}: {
  value: number;
  max: number;
  color: string;
  height?: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div
      style={{
        height: height || 6,
        borderRadius: 3,
        background: 'var(--ink-10)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.max(pct, 1)}%`,
          borderRadius: 3,
          background: color,
          transition: 'width 0.5s ease',
        }}
      />
    </div>
  );
}

function CircularGauge({ score }: { score: number }) {
  const pct = Math.min(score * 100, 100);
  const color = riskColor(score);
  const label = riskLabel(score);

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `conic-gradient(${color} ${pct * 3.6}deg, var(--ink-10) ${pct * 3.6}deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: 'var(--cream)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="serif"
            style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)' }}
          >
            {score.toFixed(2)}
          </span>
          <span
            className="mono"
            style={{ fontSize: 9, color: 'var(--ink-60)', letterSpacing: '0.05em' }}
          >
            RISK
          </span>
        </div>
      </div>
      <p
        className="sans"
        style={{
          fontSize: 13,
          fontWeight: 600,
          color,
          marginTop: 8,
        }}
      >
        {label} Risk
      </p>
      <p
        className="mono"
        style={{ fontSize: 10, color: 'var(--ink-30)', marginTop: 2 }}
      >
        90-day zone history
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PolicyPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [premium, setPremium] = useState<PremiumResult | null>(null);
  const [driverZones, setDriverZones] = useState<DriverZonesData | null>(null);
  const [coinsData, setCoinsData] = useState<CoinsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mlLoaded, setMlLoaded] = useState(false);
  const [userLang, setUserLang] = useState('en');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [windowError, setWindowError] = useState(false);
  const [policyHistory, setPolicyHistory] = useState<PolicyHistoryRow[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      // Phase 1: Fast dashboard data
      const dashRes = await fetch('/api/driver/dashboard?fast=1');
      if (!dashRes.ok) throw new Error('Unauthorized');
      const dashData: DashboardData = await dashRes.json();
      if (!dashData.profile) throw new Error('Invalid data');
      setDashboard(dashData);
      setLoading(false);

      // Fetch policy history from Supabase
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: histRows } = await supabase
          .from('weekly_policies')
          .select('id, week_start_date, week_end_date, final_premium_inr, payment_status, is_active, total_payout_this_week, plan_packages(name, tier, max_weekly_payout_inr), created_at')
          .eq('profile_id', user.id)
          .order('week_start_date', { ascending: false });
        if (histRows) setPolicyHistory(histRows as unknown as PolicyHistoryRow[]);
      }

      const city = dashData.profile.city || 'mumbai';
      const tier = dashData.policy?.tier || 'normal';

      // Phase 2: Parallel fetches for ML data and coins
      const results = await Promise.allSettled([
        // ML premium prediction (with timeout + retry)
        fetch(`${ML_URL}/predict/premium`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city, tier, driver_id: 'driver_123' }),
          signal: AbortSignal.timeout(15000),
        }).then(async (r) => {
          if (!r.ok) {
            // Retry once after 2 seconds
            await new Promise(res => setTimeout(res, 2000));
            const r2 = await fetch(`${ML_URL}/predict/premium`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ city, tier, driver_id: 'driver_123' }),
              signal: AbortSignal.timeout(15000),
            });
            if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
            return r2.json() as Promise<PremiumResult>;
          }
          return r.json() as Promise<PremiumResult>;
        }),

        // ML driver zones
        fetch(`${ML_URL}/driver/zones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city, driver_id: 'driver_123' }),
        }).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<DriverZonesData>;
        }),

        // Coins + history
        fetch('/api/driver/coins').then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<{ data: CoinsData }>;
        }),

        // Full dashboard (with ML predictions for weather data)
        fetch('/api/driver/dashboard').then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<DashboardData>;
        }),
      ]);

      if (results[0].status === 'fulfilled') {
        setPremium(results[0].value);
      }
      if (results[1].status === 'fulfilled') {
        setDriverZones(results[1].value);
      }
      if (results[2].status === 'fulfilled') {
        const coinsResponse = results[2].value;
        setCoinsData(coinsResponse.data);
      }
      if (results[3].status === 'fulfilled') {
        setDashboard(results[3].value);
      }
      setMlLoaded(true);
    } catch {
      setMlLoaded(true);
      setLoading(false);
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('language').eq('id', user.id).single()
        .then(({ data: p }) => {
          if (p && (p as { language: string }).language) setUserLang((p as { language: string }).language);
        });
    });
  }, []);

  const t = getTranslator(userLang);

  if (loading) return <LoadingSkeleton />;

  if (error || !dashboard) {
    return (
      <div style={{ padding: '60px 16px', textAlign: 'center' }}>
        <p
          className="serif"
          style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}
        >
          {t('policy2.error')}
        </p>
        <p
          className="sans"
          style={{ fontSize: 13, color: 'var(--ink-60)', marginTop: 6 }}
        >
          {t('policy2.errorDesc')}
        </p>
      </div>
    );
  }

  const policy = dashboard.policy;
  const profile = dashboard.profile;
  const cityName = CITY_NAMES[profile.city] || profile.city;
  const tier = (policy?.tier || 'normal') as string;

  // Expiry calculations
  const daysLeft = policy ? daysUntil(policy.week_end) : -1;
  const isExpired = daysLeft < 0;
  const isUrgent = !isExpired && daysLeft <= 3;
  const isReminder = !isExpired && !isUrgent && daysLeft <= 7;

  // Premium breakdown from ML or fallback to policy data
  const basePremium = premium?.base_premium ?? (tier === 'high' ? 160 : tier === 'medium' ? 120 : 80);
  const totalPremium = premium?.final_premium ?? policy?.premium ?? 0;
  // If ML data unavailable, derive addons from total - base
  const mlAvailable = premium != null;
  const weatherAddon = mlAvailable ? (premium?.weather_risk_addon ?? 0) : Math.max(0, Math.round((totalPremium - basePremium) * 0.6));
  const ubiAddon = mlAvailable ? (premium?.ubi_addon ?? 0) : Math.max(0, Math.round((totalPremium - basePremium) * 0.4));

  // Risk data from ML
  const rainfallProb = premium?.breakdown.rainfall_probability ?? 0;
  const windProb = premium?.breakdown.wind_probability ?? 0;
  const aqiProb = premium?.breakdown.aqi_probability ?? 0;
  const combinedRisk = premium?.breakdown.combined_risk_score ?? 0;

  // Zone risk data
  const weightedZoneRisk = premium?.ubi_details.weighted_risk_score ?? 0;
  const zoneContributions = premium?.ubi_details.zone_contributions ?? [];

  // Coins
  const coinBalance = coinsData?.balance ?? dashboard.coins.balance ?? 0;
  const recentActivities = (coinsData?.history ?? []).slice(0, 5);

  // Top driver zones for transparency section
  const topZones = driverZones?.zone_distribution.slice(0, 2) ?? [];

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
      <style>{`
        .reinstate-btn {
          position: relative;
          overflow: hidden;
          background: #1A1A1A;
          color: #fff;
          z-index: 0;
          transition: color 0.35s ease;
        }
        .reinstate-btn::before {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 0%;
          background: #F07820;
          transition: height 0.35s ease;
          z-index: -1;
        }
        .reinstate-btn:hover { color: #fff; }
        .reinstate-btn:hover::before { height: 100%; }
      `}</style>
      <h1
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: 'var(--ink)',
          letterSpacing: '-0.03em',
          marginBottom: 20,
        }}
      >
        {t('policy2.title')}
      </h1>

      {/* Payment Success Banner */}
      {paymentSuccess && (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid #86EFAC' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', margin: 0 }}>
            Payment successful! You&apos;re covered for Mon&ndash;Sun next week.
          </p>
          <p style={{ fontSize: 12, color: '#4B5563', margin: '4px 0 0' }}>
            Your policy will be activated automatically on Monday morning.
          </p>
        </div>
      )}

      {!policy ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          {dashboard.next_week_policy ? (
            <>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: '#FEF3E8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F07820" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <p className="serif" style={{ fontSize: 18, fontWeight: 700, color: '#F07820' }}>
                {t('policy.policyPaid').replace('{when}', (() => {
                  const start = new Date(dashboard.next_week_policy!.week_start);
                  const diff = Math.ceil((start.getTime() - Date.now()) / 86400000);
                  return diff <= 1 ? t('policy.activatesTomorrow') : t('policy.activatesIn').replace('{n}', String(diff));
                })())}
              </p>
              <p className="sans" style={{ fontSize: 13, color: 'var(--ink-60)', marginTop: 6 }}>
                {dashboard.next_week_policy.name || dashboard.next_week_policy.tier} plan · ₹{dashboard.next_week_policy.premium}/wk
              </p>
              <p className="sans" style={{ fontSize: 12, color: 'var(--ink-30)', marginTop: 4 }}>
                {t('policy.startsOn').replace('{date}', new Date(dashboard.next_week_policy.week_start).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }))}
              </p>
            </>
          ) : dashboard.last_tier ? (
            <>
              <p className="serif" style={{ fontSize: 18, fontWeight: 700, color: '#EF4444' }}>
                {t('policy.policyInactive')}
              </p>
              <p className="sans" style={{ fontSize: 13, color: 'var(--ink-60)', marginTop: 6 }}>
                {t('policy.expiredDesc').replace('{tier}', dashboard.last_tier)}
              </p>
              {windowError && (
                <div style={{
                  background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
                  padding: '10px 14px', marginTop: 12, fontSize: 13, color: '#DC2626', textAlign: 'left',
                }}>
                  {t('policy.paymentWindowClosed')}
                </div>
              )}
              <button
                className="reinstate-btn"
                onClick={() => {
                  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
                  const isSunday = now.getDay() === 0 && now.getHours() >= 6;
                  if (isSunday) {
                    window.location.href = `/dashboard/policy/reinstate?tier=${dashboard.last_tier}`;
                  } else {
                    setWindowError(true);
                  }
                }}
                style={{
                  display: 'inline-block', marginTop: 16, padding: '10px 24px',
                  borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                }}
              >
                {t('policy.reinstatePolicy')}
              </button>
            </>
          ) : (
            <>
              <p className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                {t('policy2.noPolicy')}
              </p>
              <p className="sans" style={{ fontSize: 13, color: 'var(--ink-60)', marginTop: 6 }}>
                {t('policy2.noPolicyDesc')}
              </p>
              <a
                href="/dashboard/policy/purchase"
                style={{
                  display: 'inline-block', marginTop: 16, padding: '10px 24px',
                  borderRadius: 8, background: '#F07820', color: '#fff',
                  fontWeight: 600, fontSize: 14, textDecoration: 'none',
                }}
              >
                {t('policy2.getCovered')}
              </a>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ============================================================== */}
          {/* Section 1: Policy Card                                         */}
          {/* ============================================================== */}
          <SectionCard>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <p
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--ink-30)', letterSpacing: '0.08em' }}
                >
                  {t('policy2.policyId')}
                </p>
                <p
                  className="mono"
                  style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, marginTop: 2 }}
                >
                  SS-POL-{policy.id.substring(0, 8).toUpperCase()}
                </p>
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 20,
                  ...(isExpired
                    ? { color: 'var(--red-acc)', border: '1px solid var(--red-acc)' }
                    : { color: '#F07820', border: '1px solid #F07820' }),
                }}
              >
                {isExpired ? t('policy2.expired') : t('policy2.active')}
              </span>
            </div>

            <div style={{ marginTop: 16 }}>
              <p
                className="sans"
                style={{ fontSize: 14, color: 'var(--ink-60)' }}
              >
                {t('policy2.policyHolder')}
              </p>
              <p
                className="serif"
                style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}
              >
                {profile.full_name || 'Driver'}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 16,
              }}
            >
              <div>
                <p
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--ink-30)', letterSpacing: '0.05em' }}
                >
                  {t('policy2.zoneLbl')}
                </p>
                <p
                  className="sans"
                  style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, marginTop: 2 }}
                >
                  {cityName}
                </p>
              </div>
              <div>
                <p
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--ink-30)', letterSpacing: '0.05em' }}
                >
                  {t('policy2.planTier')}
                </p>
                <span
                  className="mono"
                  style={{
                    display: 'inline-block',
                    marginTop: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                    ...(tier === 'high'
                      ? { color: 'var(--red-acc)', border: '1px solid var(--red-acc)' }
                      : tier === 'medium'
                        ? { color: 'var(--ink-60)', border: '1px solid var(--ink-30)' }
                        : { color: '#F07820', border: '1px solid #F07820' }),
                  }}
                >
                  {tier.toUpperCase()}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 12,
              }}
            >
              <div>
                <p
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--ink-30)', letterSpacing: '0.05em' }}
                >
                  {t('policy2.coveragePeriod')}
                </p>
                <p
                  className="sans"
                  style={{ fontSize: 13, color: 'var(--ink)', marginTop: 2 }}
                >
                  {formatDate(policy.week_start)} &ndash; {formatDate(policy.week_end)}
                </p>
              </div>
              <div>
                <p
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--ink-30)', letterSpacing: '0.05em' }}
                >
                  {t('policy2.premium')}
                </p>
                <p
                  className="serif"
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: 'var(--ink)',
                    marginTop: 2,
                  }}
                >
                  {'\u20B9'}{Number(totalPremium).toFixed(0)}
                  <span
                    className="mono"
                    style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-30)' }}
                  >
                    {t('policy2.perWeek')}
                  </span>
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid var(--ink-10)',
              }}
            >
              <p
                className="mono"
                style={{ fontSize: 10, color: 'var(--ink-30)', letterSpacing: '0.05em' }}
              >
                {t('policy2.maxPayout')}
              </p>
              <p
                className="serif"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#F07820',
                  marginTop: 2,
                }}
              >
                {'\u20B9'}{Number(policy.max_payout).toLocaleString('en-IN')}
              </p>
            </div>
          </SectionCard>

          {/* ============================================================== */}
          {/* Section 2: Premium Breakdown                                    */}
          {/* ============================================================== */}
          <SectionCard>
            <SectionLabel>{t('policy2.premiumBreakdown')}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Premium paid — actual amount from purchase */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="sans" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                  {t('policy2.premiumPaid')}
                </span>
                <span className="serif" style={{ fontSize: 18, fontWeight: 900, color: '#F07820' }}>
                  {'\u20B9'}{Number(policy?.premium ?? 0).toFixed(2)}{t('policy2.perWeek')}
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--ink-10)' }} />

              {/* Live estimate section */}
              <p className="mono" style={{ fontSize: 10, color: 'var(--ink-30)', letterSpacing: '0.08em', margin: 0 }}>
                {t('policy2.liveEstimate')}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="sans" style={{ fontSize: 14, color: 'var(--ink-60)' }}>
                  {t('policy2.basePremium')} ({tier})
                </span>
                <span className="serif" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                  {'\u20B9'}{basePremium}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="sans" style={{ fontSize: 14, color: 'var(--ink-60)' }}>
                  {t('policy2.weatherAddon')}
                </span>
                <span className="serif" style={{ fontSize: 14, fontWeight: 600, color: '#F07820' }}>
                  +{'\u20B9'}{weatherAddon.toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="sans" style={{ fontSize: 14, color: 'var(--ink-60)' }}>
                  {t('policy2.ubiAddon')}
                </span>
                <span className="serif" style={{ fontSize: 14, fontWeight: 600, color: '#F07820' }}>
                  +{'\u20B9'}{ubiAddon.toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--ink-10)' }}>
                <span className="sans" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                  {t('policy2.total')}
                </span>
                <span className="serif" style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink)' }}>
                  {'\u20B9'}{Number(totalPremium).toFixed(2)}{t('policy2.perWeek')}
                </span>
              </div>

              <p className="sans" style={{ fontSize: 11, color: 'var(--ink-30)', margin: 0, lineHeight: 1.5 }}>
                {t('policy2.liveEstimateNote')}
              </p>
            </div>
          </SectionCard>

          {/* ============================================================== */}
          {/* Premium Transparency                                           */}
          {/* ============================================================== */}
          <SectionCard style={{ background: 'var(--cream-d)' }}>
            <SectionLabel>{t('policy2.whyPremium').replace('{amount}', Number(policy?.premium ?? totalPremium).toFixed(0))}</SectionLabel>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#F07820', marginTop: 6, flexShrink: 0 }} />
                <p className="sans" style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                  {t('policy2.whyBaseRate').replace('{tier}', tier.charAt(0).toUpperCase() + tier.slice(1)).replace('{amount}', String(basePremium))}
                </p>
              </div>

              {premium && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#F07820', marginTop: 6, flexShrink: 0 }} />
                  <p className="sans" style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                    {weatherAddon > 15
                      ? t('policy2.whyWeatherHigh').replace('{city}', cityName).replace('{rain}', (rainfallProb * 100).toFixed(0)).replace('{wind}', (windProb * 100).toFixed(0)).replace('{aqi}', (aqiProb * 100).toFixed(0)).replace('{amount}', weatherAddon.toFixed(0))
                      : weatherAddon > 10
                        ? t('policy2.whyWeatherMed').replace('{city}', cityName).replace('{amount}', weatherAddon.toFixed(0))
                        : t('policy2.whyWeatherLow').replace('{city}', cityName).replace('{amount}', weatherAddon.toFixed(0))
                    }
                  </p>
                </div>
              )}

              {premium && topZones.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--red-acc)', marginTop: 6, flexShrink: 0 }} />
                  <p className="sans" style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
                    {t('policy2.whyUbi')
                      .replace('{zones}', topZones.map(z => `${z.zone_name} (${z.risk_score.toFixed(2)})`).join(' & '))
                      .replace('{amount}', ubiAddon.toFixed(0))}
                  </p>
                </div>
              )}

              {!premium && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-30)', marginTop: 6, flexShrink: 0 }} />
                  <p className="sans" style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.5 }}>
                    {mlLoaded ? t('policy2.whyMlOffline') : t('policy2.whyMlLoading')}
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--rule)' }}>
              <p className="mono" style={{ fontSize: 10, color: 'var(--ink-30)', lineHeight: 1.6 }}>
                {t('policy2.whyFooter')}
              </p>
            </div>
          </SectionCard>

          {/* ============================================================== */}
          {/* Section 5: Risk Drivers                                        */}
          {/* ============================================================== */}
          <SectionCard>
            <SectionLabel>{t('policy2.riskDrivers')}</SectionLabel>

            {premium ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Rainfall */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="sans" style={{ fontSize: 13, color: 'var(--ink)' }}>
                      {t('policy2.rainfallForecast')}
                    </span>
                    <span
                      className="serif"
                      style={{ fontSize: 13, fontWeight: 600, color: riskColor(rainfallProb) }}
                    >
                      {(rainfallProb * 100).toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar value={rainfallProb} max={1} color={riskColor(rainfallProb)} />
                </div>

                {/* AQI */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="sans" style={{ fontSize: 13, color: 'var(--ink)' }}>
                      {t('policy2.aqiTrend')}
                    </span>
                    <span
                      className="serif"
                      style={{ fontSize: 13, fontWeight: 600, color: riskColor(aqiProb) }}
                    >
                      {(aqiProb * 100).toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar value={aqiProb} max={1} color={riskColor(aqiProb)} />
                </div>

                {/* Historical / combined risk */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="sans" style={{ fontSize: 13, color: 'var(--ink)' }}>
                      {t('policy2.historicalRisk')}
                    </span>
                    <span
                      className="serif"
                      style={{ fontSize: 13, fontWeight: 600, color: riskColor(combinedRisk) }}
                    >
                      {(combinedRisk * 100).toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar value={combinedRisk} max={1} color={riskColor(combinedRisk)} />
                </div>

                {/* Wind / cyclone */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="sans" style={{ fontSize: 13, color: 'var(--ink)' }}>
                      {t('policy2.windRisk')}
                    </span>
                    <span
                      className="serif"
                      style={{ fontSize: 13, fontWeight: 600, color: riskColor(windProb) }}
                    >
                      {(windProb * 100).toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar value={windProb} max={1} color={riskColor(windProb)} />
                </div>
              </div>
            ) : (
              <p className="sans" style={{ fontSize: 13, color: 'var(--ink-30)', textAlign: 'center', padding: '16px 0' }}>
                {mlLoaded ? 'Risk predictions unavailable — ML service offline' : 'Loading risk predictions...'}
              </p>
            )}
          </SectionCard>

          {/* ============================================================== */}
          {/* Section 6: Zone Risk Assessment                                */}
          {/* ============================================================== */}
          <SectionCard>
            <SectionLabel>{t('policy2.zoneRiskAssessment')}</SectionLabel>

            {premium ? (
              <>
                <CircularGauge score={weightedZoneRisk} />

                <div
                  style={{
                    marginTop: 16,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 16,
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <p className="mono" style={{ fontSize: 10, color: 'var(--ink-30)' }}>
                      {t('policy2.premiumImpact')}
                    </p>
                    <p className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                      +{'\u20B9'}{ubiAddon.toFixed(2)}
                    </p>
                  </div>
                  <div style={{ width: 1, background: 'var(--rule)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p className="mono" style={{ fontSize: 10, color: 'var(--ink-30)' }}>
                      {t('policy2.riskLevel')}
                    </p>
                    <p
                      className="sans"
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: riskColor(weightedZoneRisk),
                      }}
                    >
                      {premium.ubi_details.risk_level.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Zone breakdown bars */}
                {zoneContributions.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <p
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: 'var(--ink-30)',
                        letterSpacing: '0.08em',
                        marginBottom: 10,
                      }}
                    >
                      {t('policy2.zoneBreakdown')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {zoneContributions.map((z) => (
                        <div key={z.zone_id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span className="sans" style={{ fontSize: 13, color: 'var(--ink)' }}>
                              {z.zone_name}
                            </span>
                            <span
                              className="serif"
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: riskColor(z.risk_score),
                              }}
                            >
                              {(z.risk_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <ProgressBar
                            value={z.risk_score}
                            max={1}
                            color={riskColor(z.risk_score)}
                          />
                          <p
                            className="mono"
                            style={{ fontSize: 10, color: 'var(--ink-30)', marginTop: 2 }}
                          >
                            {z.time_percentage}% of trips
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="sans" style={{ fontSize: 13, color: 'var(--ink-30)', textAlign: 'center', padding: '16px 0' }}>
                {mlLoaded ? 'Zone data unavailable — ML service offline' : 'Loading zone risk data...'}
              </p>
            )}
          </SectionCard>

        </div>
      )}

      {/* ================================================================== */}
      {/* Policy History — always visible                                    */}
      {/* ================================================================== */}
      {!loading && policyHistory.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <SectionCard>
            <SectionLabel>{t('policyHistory.title')}</SectionLabel>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {policyHistory.map((p, idx) => {
                const isPaid = p.payment_status === 'paid' || p.payment_status === 'demo';
                const now = Date.now();
                const weekStartTime = new Date(p.week_start_date + 'T00:00:00').getTime();
                const weekEndTime = new Date(p.week_end_date + 'T23:59:59').getTime();
                const notStarted = weekStartTime > now;
                const weekEnded = weekEndTime < now;
                const withinWeek = !notStarted && !weekEnded;

                // Derive display status from dates + payment, not just is_active flag
                let status: 'active' | 'upcoming' | 'completed' | 'pending' | 'expired';
                if (isPaid && withinWeek) {
                  status = 'active';
                } else if (isPaid && notStarted) {
                  status = 'upcoming';
                } else if (isPaid && weekEnded) {
                  status = 'completed';
                } else if (p.payment_status === 'pending' || p.payment_status === 'pending_activation') {
                  status = notStarted ? 'upcoming' : 'pending';
                } else {
                  status = 'expired';
                }

                const tierName = p.plan_packages?.tier || 'normal';
                const planName = p.plan_packages?.name || tierName;
                const maxPayout = p.plan_packages?.max_weekly_payout_inr || 0;
                const payoutUsed = p.total_payout_this_week || 0;
                const payoutPct = maxPayout > 0 ? Math.min((payoutUsed / maxPayout) * 100, 100) : 0;

                const startDate = new Date(p.week_start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                const endDate = new Date(p.week_end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                const STATUS_MAP = {
                  active:    { color: '#F07820', label: t('policyHistory.active'),    bg: '#FEF3E8' },
                  upcoming:  { color: '#1A40C0', label: t('policyHistory.upcoming'),  bg: '#EEF2FF' },
                  completed: { color: '#22C55E', label: t('policyHistory.completed'), bg: '#EEFBF3' },
                  pending:   { color: '#F59E0B', label: t('policyHistory.pending'),   bg: '#FFFBEB' },
                  expired:   { color: '#9CA3AF', label: t('policyHistory.expired'),   bg: '#F3F4F6' },
                };
                const { color: statusColor, label: statusLabel, bg: statusBg } = STATUS_MAP[status];
                const isActive = status === 'active';

                return (
                  <div key={p.id} style={{ position: 'relative', paddingLeft: 24 }}>
                    {/* Timeline line */}
                    {idx < policyHistory.length - 1 && (
                      <div style={{
                        position: 'absolute', left: 7, top: 20, bottom: 0,
                        width: 2, background: 'var(--ink-10)',
                      }} />
                    )}
                    {/* Timeline dot */}
                    <div style={{
                      position: 'absolute', left: 2, top: 8,
                      width: 12, height: 12, borderRadius: '50%',
                      background: statusColor,
                      border: '2.5px solid var(--cream, #fff)',
                      boxShadow: `0 0 0 2px ${statusColor}33`,
                    }} />

                    <div style={{
                      padding: '10px 14px 14px',
                      marginBottom: idx < policyHistory.length - 1 ? 4 : 0,
                      borderRadius: 10,
                      border: isActive ? '1.5px solid #F5C49A' : '1px solid var(--rule)',
                      background: isActive ? 'linear-gradient(135deg, #FEF3E8 0%, #fff 100%)' : 'transparent',
                    }}>
                      {/* Top row: plan name + status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span className="sans" style={{
                          fontSize: 14, fontWeight: 700, color: 'var(--ink)',
                        }}>
                          {planName.charAt(0).toUpperCase() + planName.slice(1)}
                        </span>
                        <span className="mono" style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                          color: statusColor, background: statusBg,
                          borderRadius: 4, padding: '2px 8px', textTransform: 'uppercase',
                        }}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Date range */}
                      <p className="mono" style={{ fontSize: 11, color: 'var(--ink-60)', margin: '0 0 8px' }}>
                        {startDate} – {endDate}
                      </p>

                      {/* Metrics row */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <div style={{
                          flex: 1, background: 'var(--ink-05, #F9FAFB)', borderRadius: 8, padding: '8px 10px', textAlign: 'center',
                        }}>
                          <p className="mono" style={{ fontSize: 9, color: 'var(--ink-30)', letterSpacing: '0.06em', margin: '0 0 2px' }}>{t('policyHistory.premium')}</p>
                          <p className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                            ₹{Number(p.final_premium_inr).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div style={{
                          flex: 1, background: 'var(--ink-05, #F9FAFB)', borderRadius: 8, padding: '8px 10px', textAlign: 'center',
                        }}>
                          <p className="mono" style={{ fontSize: 9, color: 'var(--ink-30)', letterSpacing: '0.06em', margin: '0 0 2px' }}>{t('policyHistory.maxCover')}</p>
                          <p className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                            ₹{Number(maxPayout).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div style={{
                          flex: 1, background: 'var(--ink-05, #F9FAFB)', borderRadius: 8, padding: '8px 10px', textAlign: 'center',
                        }}>
                          <p className="mono" style={{ fontSize: 9, color: 'var(--ink-30)', letterSpacing: '0.06em', margin: '0 0 2px' }}>{t('policyHistory.paidOut')}</p>
                          <p className="serif" style={{ fontSize: 16, fontWeight: 700, color: payoutUsed > 0 ? '#F07820' : 'var(--ink-30)', margin: 0 }}>
                            ₹{Number(payoutUsed).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      {/* Payout usage bar (only if there was coverage) */}
                      {isPaid && maxPayout > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{
                            height: 4, borderRadius: 2, background: 'var(--ink-10)', overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', width: `${Math.max(payoutPct, 1)}%`, borderRadius: 2,
                              background: payoutUsed > 0 ? 'linear-gradient(to right, #F07820, #FB923C)' : 'var(--ink-10)',
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                          <p className="mono" style={{ fontSize: 9, color: 'var(--ink-30)', marginTop: 3, textAlign: 'right' }}>
                            {t('policyHistory.coverUsed').replace('{n}', payoutPct.toFixed(0))}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
