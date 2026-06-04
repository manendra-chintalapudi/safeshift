'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TRIGGERS } from '@/lib/config/constants';
import type { DisruptionType } from '@/lib/config/constants';
import { getTranslator } from '@/lib/i18n/translations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardFast {
  wallet: { total_earned: number; this_week_earned: number; total_claims: number };
  coins: { balance: number };
  streak: number;
  profile: { trust_score: number; city: string };
  policy: { premium: number; max_payout: number; week_start: string; week_end: string; tier: string | null } | null;
}

interface PolicyRow {
  id: string;
  week_start_date: string;
  week_end_date: string;
  final_premium_inr: number;
  base_premium_inr: number;
  weather_risk_addon: number;
  ubi_addon: number;
  is_active: boolean;
  payment_status: string;
  total_payout_this_week: number;
  created_at: string;
}

interface ClaimWithEvent {
  id: string;
  payout_amount_inr: number;
  status: string;
  gate1_passed: boolean | null;
  gate2_passed: boolean | null;
  created_at: string;
  live_disruption_events: {
    event_type: string;
    city: string;
    severity_score: number;
    trigger_value: number | null;
    trigger_threshold: number | null;
    created_at: string;
  } | null;
}

interface PayoutRow {
  id: string;
  claim_id: string;
  amount_inr: number;
  status: string;
  mock_upi_ref: string | null;
  completed_at: string | null;
  created_at: string;
}

interface CoinEntry {
  id: string;
  activity: string;
  coins: number;
  description: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DISRUPTION_ICONS: Record<string, string> = {
  heavy_rainfall: '\u{1F327}\u{FE0F}',
  aqi_grap_iv: '\u{1F32B}\u{FE0F}',
  cyclone: '\u{1F300}',
  platform_outage: '\u{1F6AB}',
  curfew_bandh: '\u26D4',
};

function formatINR(n: number): string {
  return '\u20B9' + Number(n).toLocaleString('en-IN');
}

function formatDate(iso: string, style: 'short' | 'full' = 'short'): string {
  const d = new Date(iso);
  if (style === 'full') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function scoreLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'Excellent', color: '#F07820' };
  if (score >= 60) return { text: 'Good', color: '#F07820' };
  if (score >= 40) return { text: 'Fair', color: '#F07820' };
  return { text: 'Needs Attention', color: 'var(--red-acc)' };
}

function claimStatusColor(status: string): string {
  if (status === 'paid' || status === 'approved' || status === 'gate2_passed') return '#F07820';
  if (status === 'rejected') return 'var(--red-acc)';
  return 'var(--ink-60)';
}

function shortMonthLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'short' });
}

function weekLabel(iso: string): string {
  const d = new Date(iso);
  return `Week of ${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function HistorySkeleton() {
  return (
    <div style={{ padding: '20px 16px' }}>
      <style>{`
        @keyframes histSkelPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .hskel {
          background: var(--ink-10);
          border-radius: 8px;
          animation: histSkelPulse 1.5s ease-in-out infinite;
        }
      `}</style>
      <div className="hskel" style={{ width: 140, height: 20, marginBottom: 20 }} />
      {/* Lifetime savings */}
      <div className="hskel" style={{ height: 160, marginBottom: 16 }} />
      {/* This week */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div className="hskel" style={{ flex: 1, height: 80 }} />
        <div className="hskel" style={{ flex: 1, height: 80 }} />
        <div className="hskel" style={{ flex: 1, height: 80 }} />
      </div>
      {/* Protection score */}
      <div className="hskel" style={{ height: 180, marginBottom: 16 }} />
      {/* Timeline */}
      <div className="hskel" style={{ height: 240, marginBottom: 16 }} />
      {/* Ledger */}
      <div className="hskel" style={{ height: 200 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Protection Score Gauge
// ---------------------------------------------------------------------------

function ProtectionGauge({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const { text, color } = scoreLabel(clamped);
  const angle = (clamped / 100) * 360;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: `conic-gradient(${color} 0deg, ${color} ${angle}deg, var(--ink-10) ${angle}deg, var(--ink-10) 360deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
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
            style={{ fontSize: 32, fontWeight: 900, color: 'var(--ink)', lineHeight: 1 }}
          >
            {clamped}
          </span>
          <span
            className="mono"
            style={{ fontSize: 9, color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            / 100
          </span>
        </div>
      </div>
      <span
        className="mono"
        style={{
          fontSize: 11,
          fontWeight: 700,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginTop: 10,
        }}
      >
        {text}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------

const CARD: React.CSSProperties = {
  background: 'var(--cream)',
  borderRadius: 16,
  border: '1px solid var(--rule)',
  overflow: 'hidden',
};

// ---------------------------------------------------------------------------
// Payment Ledger Component — sub-tabs + collapsible
// ---------------------------------------------------------------------------

interface LedgerEntry {
  type: 'premium' | 'payout';
  id: string;
  date: string;
  amount: number;
  status: string;
  ref: string;
}

function PaymentLedger({
  entries,
  formatDate: fmtDate,
  formatINR: fmtINR,
}: {
  entries: LedgerEntry[];
  formatDate: (d: string) => string;
  formatINR: (n: number) => string;
}) {
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'premium' | 'payout'>('all');
  const [expanded, setExpanded] = useState(false);

  const filtered = entries.filter(
    (e) => ledgerFilter === 'all' || e.type === ledgerFilter
  );
  const visible = expanded ? filtered : filtered.slice(0, 5);
  const premiumCount = entries.filter((e) => e.type === 'premium').length;
  const payoutCount = entries.filter((e) => e.type === 'payout').length;

  return (
    <div style={{ ...CARD, marginTop: 16, padding: '18px 16px 14px' }}>
      {/* Header + sub-tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p className="mono" style={{ fontSize: 10, color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Payment Ledger
        </p>
        <div style={{ display: 'flex', gap: 4, background: 'var(--ink-10)', borderRadius: 8, padding: 2 }}>
          {([
            { key: 'all' as const, label: `All (${entries.length})` },
            { key: 'payout' as const, label: `Payouts (${payoutCount})` },
            { key: 'premium' as const, label: `Premiums (${premiumCount})` },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setLedgerFilter(tab.key); setExpanded(false); }}
              className="mono"
              style={{
                fontSize: 9,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s ease',
                background: ledgerFilter === tab.key ? '#F07820' : 'transparent',
                color: ledgerFilter === tab.key ? '#fff' : 'var(--ink-60)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p className="sans" style={{ fontSize: 13, color: 'var(--ink-60)' }}>No transactions</p>
        </div>
      ) : (
        <>
          {visible.map((entry) => {
            const isPremium = entry.type === 'premium';
            const amtColor = isPremium ? 'var(--red-acc)' : '#F07820';
            const sign = isPremium ? '-' : '+';
            return (
              <div
                key={`${entry.type}-${entry.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--ink-10)',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                        background: isPremium ? 'rgba(239,68,68,0.1)' : 'rgba(240,120,32,0.1)',
                        color: amtColor, textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}
                    >
                      {isPremium ? 'PREMIUM' : 'PAYOUT'}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-30)' }}>
                      {entry.ref}
                    </span>
                  </div>
                  <p className="mono" style={{ fontSize: 10, color: 'var(--ink-30)', marginTop: 3 }}>
                    {fmtDate(entry.date)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="serif" style={{ fontSize: 15, fontWeight: 900, color: amtColor }}>
                    {sign}{fmtINR(entry.amount)}
                  </p>
                  <p className="mono" style={{
                    fontSize: 9,
                    color: ['completed', 'paid', 'demo'].includes(entry.status) ? '#F07820' : entry.status === 'failed' ? 'var(--red-acc)' : 'var(--ink-60)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {entry.status}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Show more / Show less toggle */}
          {filtered.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mono"
              style={{
                width: '100%', padding: '10px 0', marginTop: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, color: '#F07820',
                letterSpacing: '0.04em', transition: 'color 0.15s ease',
              }}
            >
              {expanded ? `Show less \u25B2` : `Show all ${filtered.length} transactions \u25BC`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function HistoryPage() {
  const [dashboard, setDashboard] = useState<DashboardFast | null>(null);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [claims, setClaims] = useState<ClaimWithEvent[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [coinsLedger, setCoinsLedger] = useState<CoinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userLang, setUserLang] = useState('en');

  // Fetch all data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const uid = user.id;

        // Parallel: dashboard API + supabase queries (filtered by user)
        const [dashRes, claimsRes, policiesRes, payoutsRes, coinsRes] = await Promise.all([
          fetch('/api/driver/dashboard?fast=1').then((r) => {
            if (!r.ok) throw new Error('dash');
            return r.json() as Promise<DashboardFast>;
          }),
          supabase
            .from('parametric_claims')
            .select(
              'id, payout_amount_inr, status, gate1_passed, gate2_passed, created_at, live_disruption_events(event_type, city, severity_score, trigger_value, trigger_threshold, created_at)'
            )
            .eq('profile_id', uid)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('weekly_policies')
            .select(
              'id, week_start_date, week_end_date, final_premium_inr, base_premium_inr, weather_risk_addon, ubi_addon, is_active, payment_status, total_payout_this_week, created_at'
            )
            .eq('profile_id', uid)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('payout_ledger')
            .select('id, claim_id, amount_inr, status, mock_upi_ref, completed_at, created_at')
            .eq('profile_id', uid)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('coins_ledger')
            .select('id, activity, coins, description, created_at')
            .eq('profile_id', uid)
            .order('created_at', { ascending: false })
            .limit(50),
        ]);

        if (cancelled) return;

        setDashboard(dashRes);
        setClaims((claimsRes.data as unknown as ClaimWithEvent[]) || []);
        setPolicies((policiesRes.data as unknown as PolicyRow[]) || []);
        setPayouts((payoutsRes.data as unknown as PayoutRow[]) || []);
        setCoinsLedger((coinsRes.data as unknown as CoinEntry[]) || []);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Fetch user language preference
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

  // ---------------------------------------------------------------------------
  // Derived analytics
  // ---------------------------------------------------------------------------

  const analytics = useMemo(() => {
    const totalPremiums = policies.reduce((s, p) => s + Number(p.final_premium_inr), 0);
    const totalPayouts = payouts
      .filter((p) => p.status === 'completed')
      .reduce((s, p) => s + Number(p.amount_inr), 0);
    const netSavings = totalPayouts - totalPremiums;
    const roi = totalPremiums > 0 ? (totalPayouts / totalPremiums) * 100 : 0;
    const roiMultiplier = totalPremiums > 0 ? totalPayouts / totalPremiums : 0;

    // This week: figure out current week from active policy or dashboard
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const thisWeekProtected = dashboard?.policy?.max_payout ?? 0;
    const thisWeekCoins = coinsLedger
      .filter((c) => new Date(c.created_at) >= weekStart && c.coins > 0)
      .reduce((s, c) => s + c.coins, 0);
    const thisWeekTriggers = claims.filter(
      (c) => new Date(c.created_at) >= weekStart
    ).length;

    // Protection score
    const streak = dashboard?.streak ?? 0;
    const trustScore = dashboard?.profile?.trust_score ?? 0.5;
    const paidClaims = claims.filter((c) => c.status === 'paid' || c.status === 'approved').length;
    const totalClaims = claims.length;
    const claimSuccessRate = totalClaims > 0 ? paidClaims / totalClaims : 1;
    const protectionScore = Math.min(
      100,
      Math.round(
        Math.min(50, streak * 10) +
        trustScore * 30 +
        claimSuccessRate * 20
      )
    );

    // Group claims by month for timeline
    const claimsByMonth: Record<string, ClaimWithEvent[]> = {};
    for (const c of claims) {
      const mk = monthKey(c.created_at);
      if (!claimsByMonth[mk]) claimsByMonth[mk] = [];
      claimsByMonth[mk].push(c);
    }

    // Build unified payment ledger (premiums + payouts)
    type LedgerEntry = {
      id: string;
      date: string;
      type: 'premium' | 'payout';
      amount: number;
      ref: string;
      status: string;
    };

    const ledger: LedgerEntry[] = [];
    for (const p of policies) {
      ledger.push({
        id: p.id,
        date: p.created_at,
        type: 'premium',
        amount: Number(p.final_premium_inr),
        ref: p.id.slice(0, 8),
        status: p.payment_status,
      });
    }
    for (const p of payouts) {
      ledger.push({
        id: p.id,
        date: p.created_at,
        type: 'payout',
        amount: Number(p.amount_inr),
        ref: p.mock_upi_ref || p.id.slice(0, 8),
        status: p.status,
      });
    }
    ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // --- Monthly premiums vs payouts (last 4 months) ---
    const monthlyMap: Record<string, { premiums: number; payouts: number; label: string }> = {};
    for (const p of policies) {
      const mk = shortMonthLabel(p.created_at);
      if (!monthlyMap[mk]) monthlyMap[mk] = { premiums: 0, payouts: 0, label: mk };
      monthlyMap[mk].premiums += Number(p.final_premium_inr);
    }
    for (const p of payouts.filter((px) => px.status === 'completed')) {
      const mk = shortMonthLabel(p.created_at);
      if (!monthlyMap[mk]) monthlyMap[mk] = { premiums: 0, payouts: 0, label: mk };
      monthlyMap[mk].payouts += Number(p.amount_inr);
    }
    // Sort by date and take last 4
    const sortedPolicies = [...policies].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const seenMonths = new Set<string>();
    const orderedMonthKeys: string[] = [];
    for (const p of sortedPolicies) {
      const mk = shortMonthLabel(p.created_at);
      if (!seenMonths.has(mk)) {
        seenMonths.add(mk);
        orderedMonthKeys.push(mk);
      }
    }
    // Also include payout months
    const sortedPayouts = [...payouts].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    for (const p of sortedPayouts) {
      const mk = shortMonthLabel(p.created_at);
      if (!seenMonths.has(mk)) {
        seenMonths.add(mk);
        orderedMonthKeys.push(mk);
      }
    }
    const monthlyBars = orderedMonthKeys.slice(-4).map((mk) => monthlyMap[mk] || { premiums: 0, payouts: 0, label: mk });

    // --- Weekly earnings (last 8 weeks) ---
    type WeekBucket = { label: string; amount: number; weekStart: Date };
    const weekBuckets: WeekBucket[] = [];
    // Build 8 week windows going backwards
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
      const ws = new Date(today);
      ws.setDate(ws.getDate() - ws.getDay() - i * 7);
      ws.setHours(0, 0, 0, 0);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      const amt = payouts
        .filter((p) => p.status === 'completed')
        .filter((p) => {
          const d = new Date(p.created_at);
          return d >= ws && d < we;
        })
        .reduce((s, p) => s + Number(p.amount_inr), 0);
      weekBuckets.push({ label: weekLabel(ws.toISOString()), amount: amt, weekStart: ws });
    }

    return {
      totalPremiums,
      totalPayouts,
      netSavings,
      roi,
      roiMultiplier,
      thisWeekProtected,
      thisWeekCoins,
      thisWeekTriggers,
      protectionScore,
      streak,
      claimsByMonth,
      ledger,
      monthlyBars,
      weekBuckets,
    };
  }, [policies, payouts, claims, coinsLedger, dashboard]);

  // ---------------------------------------------------------------------------
  // Translator
  // ---------------------------------------------------------------------------
  const t = getTranslator(userLang);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) return <HistorySkeleton />;

  if (error || !dashboard) {
    return (
      <div style={{ padding: '60px 16px', textAlign: 'center' }}>
        <p className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
          Something went wrong
        </p>
        <p className="sans" style={{ fontSize: 13, color: 'var(--ink-60)', marginTop: 6 }}>
          Could not load history data. Pull down to refresh.
        </p>
      </div>
    );
  }

  const monthKeys = Object.keys(analytics.claimsByMonth);

  // Bar chart helpers
  const monthlyMax = Math.max(1, ...analytics.monthlyBars.flatMap((m) => [m.premiums, m.payouts]));
  const weeklyMax = Math.max(1, ...analytics.weekBuckets.map((w) => w.amount));
  const BAR_MAX_H = 120;
  const HBAR_MAX_W = 100; // percentage

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ padding: '20px 16px 0' }}>
        <h1
          className="serif"
          style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.03em' }}
        >
          Analytics &amp; History
        </h1>
        <p className="sans" style={{ fontSize: 13, color: 'var(--ink-60)', marginTop: 2 }}>
          Your protection journey at a glance
        </p>
      </div>

      {/* ================================================================== */}
      {/* ANALYTICS                                                          */}
      {/* ================================================================== */}
        <div style={{ padding: '0 16px' }}>

          {/* ---------------------------------------------------------------- */}
          {/* Section 1: Summary Cards                                         */}
          {/* ---------------------------------------------------------------- */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
            {/* Premiums Paid */}
            <div style={{ ...CARD, padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p className="mono" style={{ fontSize: 9, color: 'var(--red-acc)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Premiums Paid
                </p>
                <span style={{
                  display: 'inline-block', width: 20, height: 20, borderRadius: 6,
                  background: 'rgba(192,57,43,0.08)', textAlign: 'center', lineHeight: '20px', fontSize: 11,
                  color: 'var(--red-acc)',
                }}>{'\u2191'}</span>
              </div>
              <p className="serif" style={{ fontSize: 22, fontWeight: 900, color: 'var(--red-acc)', letterSpacing: '-0.03em', marginTop: 4 }}>
                {formatINR(analytics.totalPremiums)}
              </p>
              {/* Mini trend bar */}
              <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'rgba(192,57,43,0.1)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: 'var(--red-acc)',
                  width: analytics.totalPremiums > 0 ? `${Math.min(100, (analytics.totalPremiums / Math.max(analytics.totalPremiums, analytics.totalPayouts)) * 100)}%` : '0%',
                }} />
              </div>
            </div>

            {/* Payouts Received */}
            <div style={{ ...CARD, padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p className="mono" style={{ fontSize: 9, color: '#F07820', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Payouts Received
                </p>
                <span style={{
                  display: 'inline-block', width: 20, height: 20, borderRadius: 6,
                  background: 'rgba(240,120,32,0.08)', textAlign: 'center', lineHeight: '20px', fontSize: 11,
                  color: '#F07820',
                }}>{'\u2193'}</span>
              </div>
              <p className="serif" style={{ fontSize: 22, fontWeight: 900, color: '#F07820', letterSpacing: '-0.03em', marginTop: 4 }}>
                {formatINR(analytics.totalPayouts)}
              </p>
              <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'rgba(240,120,32,0.1)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: '#F07820',
                  width: analytics.totalPayouts > 0 ? `${Math.min(100, (analytics.totalPayouts / Math.max(analytics.totalPremiums, analytics.totalPayouts)) * 100)}%` : '0%',
                }} />
              </div>
            </div>

            {/* Net Savings */}
            <div style={{ ...CARD, padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p className="mono" style={{ fontSize: 9, color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Net Savings
                </p>
                <span style={{
                  display: 'inline-block', width: 20, height: 20, borderRadius: 6,
                  background: analytics.netSavings >= 0 ? 'rgba(240,120,32,0.08)' : 'rgba(192,57,43,0.08)',
                  textAlign: 'center', lineHeight: '20px', fontSize: 11,
                  color: analytics.netSavings >= 0 ? '#F07820' : 'var(--red-acc)',
                }}>{analytics.netSavings >= 0 ? '\u2191' : '\u2193'}</span>
              </div>
              <p className="serif" style={{
                fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', marginTop: 4,
                color: analytics.netSavings >= 0 ? '#F07820' : 'var(--red-acc)',
              }}>
                {analytics.netSavings >= 0 ? '+' : ''}{formatINR(analytics.netSavings)}
              </p>
              {analytics.totalPremiums > 0 && (
                <p className="sans" style={{ fontSize: 10, color: 'var(--ink-30)', marginTop: 6, fontStyle: 'italic' }}>
                  {'\u20B9'}1 paid {'\u2192'} {'\u20B9'}{analytics.roiMultiplier.toFixed(2)} back
                </p>
              )}
            </div>

            {/* ROI */}
            <div style={{ ...CARD, padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p className="mono" style={{ fontSize: 9, color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Return (ROI)
                </p>
                <span style={{
                  display: 'inline-block', width: 20, height: 20, borderRadius: 6,
                  background: analytics.roi >= 100 ? 'rgba(240,120,32,0.08)' : 'rgba(17,16,16,0.05)',
                  textAlign: 'center', lineHeight: '20px', fontSize: 11,
                  color: analytics.roi >= 100 ? '#F07820' : 'var(--ink-60)',
                }}>%</span>
              </div>
              <p className="serif" style={{
                fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', marginTop: 4,
                color: analytics.roi >= 100 ? '#F07820' : 'var(--ink)',
              }}>
                {analytics.roi.toFixed(0)}%
              </p>
              {/* Gauge bar */}
              <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'var(--ink-10)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: analytics.roi >= 100 ? '#F07820' : 'var(--ink-30)',
                  width: `${Math.min(100, analytics.roi)}%`,
                }} />
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Section 2: Premiums vs Payouts Bar Chart                         */}
          {/* ---------------------------------------------------------------- */}
          <div style={{ ...CARD, marginTop: 16, padding: '18px 16px 14px' }}>
            <p className="mono" style={{ fontSize: 10, color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              Premiums vs Payouts
            </p>

            {analytics.monthlyBars.length === 0 ? (
              <p className="sans" style={{ fontSize: 13, color: 'var(--ink-30)', textAlign: 'center', padding: '20px 0' }}>
                No data yet
              </p>
            ) : (
              <>
                {/* Legend */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(192,57,43,0.7)' }} />
                    <span className="mono" style={{ fontSize: 9, color: 'var(--ink-60)' }}>Premium</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(240,120,32,0.7)' }} />
                    <span className="mono" style={{ fontSize: 9, color: 'var(--ink-60)' }}>Payout</span>
                  </div>
                </div>

                {/* Bar chart */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, justifyContent: 'space-around' }}>
                  {analytics.monthlyBars.map((m, i) => {
                    const premH = monthlyMax > 0 ? (m.premiums / monthlyMax) * BAR_MAX_H : 0;
                    const payH = monthlyMax > 0 ? (m.payouts / monthlyMax) * BAR_MAX_H : 0;
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        {/* Amounts above bars */}
                        <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                          <span className="mono" style={{ fontSize: 8, color: 'var(--red-acc)' }}>
                            {m.premiums > 0 ? formatINR(m.premiums) : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                          <span className="mono" style={{ fontSize: 8, color: '#F07820' }}>
                            {m.payouts > 0 ? formatINR(m.payouts) : ''}
                          </span>
                        </div>
                        {/* Bars */}
                        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: BAR_MAX_H }}>
                          <div
                            style={{
                              width: 18,
                              height: Math.max(2, premH),
                              background: 'rgba(192,57,43,0.7)',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.4s ease',
                            }}
                          />
                          <div
                            style={{
                              width: 18,
                              height: Math.max(2, payH),
                              background: 'rgba(240,120,32,0.7)',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.4s ease',
                            }}
                          />
                        </div>
                        {/* Month label */}
                        <p className="mono" style={{ fontSize: 10, color: 'var(--ink-60)', marginTop: 6, textTransform: 'uppercase' }}>
                          {m.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Section 3: Protection Score                                      */}
          {/* ---------------------------------------------------------------- */}
          <div style={{ ...CARD, marginTop: 16, padding: '20px 16px', textAlign: 'center' }}>
            <p
              className="mono"
              style={{ fontSize: 10, color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}
            >
              Protection Score
            </p>

            <ProtectionGauge score={analytics.protectionScore} />

            <p className="sans" style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 12, lineHeight: 1.5 }}>
              {analytics.streak > 0
                ? `Consistent coverage, zero gaps in ${analytics.streak} week${analytics.streak !== 1 ? 's' : ''}`
                : 'Activate a weekly plan to start building your score'}
            </p>
            <p className="mono" style={{ fontSize: 10, color: '#F07820', marginTop: 4 }}>
              Top {Math.max(5, 100 - analytics.protectionScore)}% in your zone
            </p>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Section 5: Weekly Earnings Chart                                 */}
          {/* ---------------------------------------------------------------- */}
          <div style={{ ...CARD, marginTop: 16, padding: '18px 16px 14px' }}>
            <p className="mono" style={{ fontSize: 10, color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
              Weekly Earnings
            </p>

            {analytics.weekBuckets.every((w) => w.amount === 0) ? (
              <p className="sans" style={{ fontSize: 13, color: 'var(--ink-30)', textAlign: 'center', padding: '20px 0' }}>
                No payouts in the last 8 weeks
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {analytics.weekBuckets.map((w, i) => {
                  const pct = weeklyMax > 0 ? (w.amount / weeklyMax) * HBAR_MAX_W : 0;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mono" style={{ fontSize: 9, color: 'var(--ink-30)', minWidth: 90, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {w.label}
                      </span>
                      <div style={{ flex: 1, height: 16, background: 'var(--ink-10)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.max(w.amount > 0 ? 2 : 0, pct)}%`,
                          background: 'linear-gradient(90deg, #F07820 0%, #D96A10 100%)',
                          borderRadius: 4,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                      <span className="serif" style={{ fontSize: 11, fontWeight: 700, color: w.amount > 0 ? '#F07820' : 'var(--ink-30)', minWidth: 52, textAlign: 'right' }}>
                        {w.amount > 0 ? formatINR(w.amount) : '--'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

    </div>
  );
}
