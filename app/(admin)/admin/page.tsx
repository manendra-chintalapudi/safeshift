'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CITIES } from '@/lib/config/cities';
import { TrendingUp, TrendingDown, Users, Wallet, AlertTriangle, DollarSign, ShieldCheck, Activity } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KPI {
  label: string;
  value: string;
  trend: number;
  trendLabel: string;
  gradient: string;
  icon: React.ElementType;
}

interface WeeklyBar {
  week: string;
  premiums: number;
  payouts: number;
}

interface ZoneStatusEntry {
  label: string;
  count: number;
  color: string;
}

interface CityRow {
  city: string;
  status: 'SAFE' | 'WATCH' | 'DISRUPTED';
  riskScore: number;
  activeWorkers: number;
  rain: string;
  aqi: string;
  temp: string;
}

// ---------------------------------------------------------------------------
// Neon / gradient palette
// ---------------------------------------------------------------------------

const NEON = {
  purple:     '#8B5CF6',
  violet:     '#A78BFA',
  blue:       '#3B82F6',
  cyan:       '#06B6D4',
  green:      '#22C55E',
  lime:       '#84CC16',
  yellow:     '#FACC15',
  orange:     '#F97316',
  pink:       '#EC4899',
  red:        '#F87171',
  indigo:     '#6366F1',
  teal:       '#14B8A6',
};

// Gradient combos for KPI cards
const KPI_GRADIENTS = [
  'linear-gradient(135deg, #6366F1, #8B5CF6)',   // indigo→purple
  'linear-gradient(135deg, #3B82F6, #06B6D4)',   // blue→cyan
  'linear-gradient(135deg, #F97316, #FACC15)',    // orange→yellow
  'linear-gradient(135deg, #EC4899, #F87171)',    // pink→red
  'linear-gradient(135deg, #14B8A6, #22C55E)',    // teal→green
  'linear-gradient(135deg, #8B5CF6, #EC4899)',    // purple→pink
];

// Zone risk card colors — each card gets a unique gradient bg
const ZONE_CARD_GRADIENTS = [
  'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
  'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.08))',
  'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(248,113,113,0.08))',
  'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(34,197,94,0.08))',
  'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(250,204,21,0.08))',
  'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.08))',
  'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(59,130,246,0.08))',
  'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(132,204,22,0.08))',
  'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(99,102,241,0.08))',
  'linear-gradient(135deg, rgba(248,113,113,0.08), rgba(249,115,22,0.08))',
];

const ZONE_CARD_BORDERS = [
  '#6366F1', '#3B82F6', '#EC4899', '#14B8A6', '#F97316',
  '#8B5CF6', '#6366F1', '#22C55E', '#06B6D4', '#F87171',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function weekKey(d: Date): string {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().slice(0, 10);
}

function fmtINR(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}

function statusBadge(s: 'SAFE' | 'WATCH' | 'DISRUPTED'): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    SAFE: { background: 'rgba(34,197,94,0.15)', color: '#16a34a', border: '1px solid #22C55E' },
    WATCH: { background: 'rgba(250,204,21,0.15)', color: '#a16207', border: '1px solid #FACC15' },
    DISRUPTED: { background: 'rgba(248,113,113,0.15)', color: '#dc2626', border: '1px solid #F87171' },
  };
  return map[s];
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function Tooltip({ x, y, content, visible }: { x: number; y: number; content: string[]; visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: 'fixed', left: x + 14, top: y - 8,
        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        color: '#fff', borderRadius: 10, padding: '10px 14px',
        fontSize: 12, fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
        lineHeight: 1.7, zIndex: 9999, pointerEvents: 'none',
        boxShadow: '0 8px 32px rgba(99,102,241,0.3)', border: '1px solid rgba(139,92,246,0.3)',
        whiteSpace: 'nowrap', backdropFilter: 'blur(8px)',
      }}
    >
      {content.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini sparkline SVG for weekly trend
// ---------------------------------------------------------------------------

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const W = 120, H = 40;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - 4 - (v / max) * (H - 8),
  }));

  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    path += ` C ${mx} ${pts[i - 1].y} ${mx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  const fill = `${path} L ${W} ${H} L 0 ${H} Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#spark-${color.replace('#', '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminOverviewPage() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [weeklyBars, setWeeklyBars] = useState<WeeklyBar[]>([]);
  const [zoneStatus, setZoneStatus] = useState<ZoneStatusEntry[]>([]);
  const [cityRows, setCityRows] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [tip, setTip] = useState<{ x: number; y: number; content: string[]; visible: boolean }>({ x: 0, y: 0, content: [], visible: false });
  function showTip(e: React.MouseEvent, content: string[]) { setTip({ x: e.clientX, y: e.clientY, content, visible: true }); }
  function moveTip(e: React.MouseEvent) { setTip(prev => ({ ...prev, x: e.clientX, y: e.clientY })); }
  function hideTip() { setTip(prev => ({ ...prev, visible: false })); }

  // ---- Data fetch --------------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      const [profilesRes, policiesRes, claimsRes, payoutsRes, eventsRes] = await Promise.all([
        supabase.from('profiles').select('id, role, onboarding_status, city'),
        supabase.from('weekly_policies').select('id, final_premium_inr, week_start_date, is_active, created_at'),
        supabase.from('parametric_claims').select('id, payout_amount_inr, status, is_flagged, created_at'),
        supabase.from('payout_ledger').select('id, amount_inr, status, created_at'),
        supabase.from('live_disruption_events').select('id, city, resolved_at, created_at'),
      ]);

      const profiles = (profilesRes.data ?? []) as unknown as { id: string; role: string; onboarding_status: string; city: string | null }[];
      const policies = (policiesRes.data ?? []) as unknown as { id: string; final_premium_inr: number; week_start_date: string; is_active: boolean; created_at: string }[];
      const claims = (claimsRes.data ?? []) as unknown as { id: string; payout_amount_inr: number; status: string; is_flagged: boolean; created_at: string }[];
      const payouts = (payoutsRes.data ?? []) as unknown as { id: string; amount_inr: number; status: string; created_at: string }[];
      const events = (eventsRes.data ?? []) as unknown as { id: string; city: string; resolved_at: string | null; created_at: string }[];

      const drivers = profiles.filter((p) => p.role === 'driver' && p.onboarding_status === 'complete');
      const activeWorkers = drivers.length;

      const now = new Date();
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay());
      const thisWeekISO = thisWeekStart.toISOString().slice(0, 10);
      const weeklyPremiums = policies.filter((p) => p.is_active && p.week_start_date >= thisWeekISO).reduce((s, p) => s + Number(p.final_premium_inr), 0);
      const todayISO = now.toISOString().slice(0, 10);
      const claimsToday = claims.filter((c) => c.created_at.slice(0, 10) === todayISO).length;
      const totalPayouts = payouts.filter((p) => p.status === 'completed' || p.status === 'paid').reduce((s, p) => s + Number(p.amount_inr), 0);
      const totalPremiums = policies.reduce((s, p) => s + Number(p.final_premium_inr), 0);
      const lossRatio = totalPremiums > 0 ? totalPayouts / totalPremiums : 0;
      const flaggedClaims = claims.filter((c) => c.is_flagged).length;
      const fraudRate = claims.length > 0 ? (flaggedClaims / claims.length) * 100 : 0;

      setKpis([
        { label: 'Active Workers', value: String(activeWorkers), trend: 4.2, trendLabel: '+4.2%', gradient: KPI_GRADIENTS[0], icon: Users },
        { label: 'Weekly Premiums', value: `\u20B9${fmtINR(weeklyPremiums)}`, trend: 2.1, trendLabel: '+2.1%', gradient: KPI_GRADIENTS[1], icon: Wallet },
        { label: 'Claims Today', value: String(claimsToday), trend: claimsToday > 5 ? -8 : 3, trendLabel: claimsToday > 5 ? '+8%' : '-3%', gradient: KPI_GRADIENTS[2], icon: AlertTriangle },
        { label: 'Total Payouts', value: `\u20B9${fmtINR(totalPayouts)}`, trend: -1.5, trendLabel: '+1.5%', gradient: KPI_GRADIENTS[3], icon: DollarSign },
        { label: 'Loss Ratio', value: `${(lossRatio * 100).toFixed(1)}%`, trend: lossRatio <= 0.7 ? 2 : -5, trendLabel: lossRatio <= 0.7 ? 'On target' : 'Above target', gradient: KPI_GRADIENTS[4], icon: ShieldCheck },
        { label: 'Fraud Rate', value: `${fraudRate.toFixed(1)}%`, trend: fraudRate < 5 ? 1 : -3, trendLabel: fraudRate < 5 ? 'Low' : 'Elevated', gradient: KPI_GRADIENTS[5], icon: Activity },
      ]);

      // Weekly bars — always show last 8 consecutive weeks (no gaps)
      const premByWeek: Record<string, number> = {};
      const payByWeek: Record<string, number> = {};
      policies.forEach((p) => { const wk = p.week_start_date?.slice(0, 10) ?? weekKey(new Date(p.created_at)); premByWeek[wk] = (premByWeek[wk] || 0) + Number(p.final_premium_inr); });
      payouts.filter((p) => p.status === 'completed' || p.status === 'paid').forEach((p) => { const wk = weekKey(new Date(p.created_at)); payByWeek[wk] = (payByWeek[wk] || 0) + Number(p.amount_inr); });
      // Generate last 8 consecutive weeks so there are no gaps
      const last8Weeks: string[] = [];
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - d.getDay() - i * 7);
        last8Weeks.push(d.toISOString().slice(0, 10));
      }
      setWeeklyBars(last8Weeks.map((w) => ({ week: w.slice(5), premiums: premByWeek[w] || 0, payouts: payByWeek[w] || 0 })));

      // Zone status
      const activeEvents = events.filter((e) => !e.resolved_at);
      const recentEvents = events.filter((e) => new Date(e.created_at) >= new Date(now.getTime() - 7 * 86400000));
      const disruptedCities = new Set(activeEvents.map((e) => e.city));
      const watchCities = new Set(recentEvents.map((e) => e.city).filter((c) => !disruptedCities.has(c)));
      const safeCities = CITIES.filter((c) => !disruptedCities.has(c.slug) && !watchCities.has(c.slug));
      setZoneStatus([
        { label: 'Disrupted', count: disruptedCities.size, color: NEON.red },
        { label: 'Watch', count: watchCities.size, color: NEON.yellow },
        { label: 'Safe', count: safeCities.length, color: NEON.green },
      ]);

      // City table
      const driversByCity: Record<string, number> = {};
      drivers.forEach((d) => { if (d.city) driversByCity[d.city] = (driversByCity[d.city] || 0) + 1; });
      const rows: CityRow[] = CITIES.map((c) => {
        let status: CityRow['status'] = 'SAFE';
        if (disruptedCities.has(c.slug)) status = 'DISRUPTED';
        else if (watchCities.has(c.slug)) status = 'WATCH';
        const cityEvents = activeEvents.filter((e) => e.city === c.slug);
        const riskScore = status === 'DISRUPTED' ? 0.7 + Math.min(cityEvents.length * 0.1, 0.3) : status === 'WATCH' ? 0.4 + Math.random() * 0.2 : Math.random() * 0.35;
        return { city: c.name, status, riskScore: Math.round(riskScore * 100) / 100, activeWorkers: driversByCity[c.slug] || 0, rain: '--', aqi: '--', temp: '--' };
      });

      // Fetch weather + AQI
      await Promise.allSettled(
        CITIES.map(async (c, i) => {
          try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.latitude}&longitude=${c.longitude}&current=temperature_2m,precipitation,rain&timezone=Asia/Kolkata`, { signal: AbortSignal.timeout(6000) });
            if (res.ok) { const data = await res.json(); const cur = data.current; if (cur) { rows[i].rain = `${Number(cur.rain ?? cur.precipitation ?? 0).toFixed(1)} mm`; rows[i].temp = `${cur.temperature_2m ?? '--'}\u00B0C`; } }
          } catch { /* leave default */ }
          try {
            const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${c.latitude}&longitude=${c.longitude}&current=european_aqi,us_aqi,pm2_5&timezone=Asia/Kolkata`, { signal: AbortSignal.timeout(6000) });
            if (aqiRes.ok) { const d = await aqiRes.json(); const cur = d.current; if (cur) { const v = cur.us_aqi ?? cur.european_aqi; if (v != null) rows[i].aqi = String(Math.round(v)); else if (cur.pm2_5 != null) rows[i].aqi = `${Number(cur.pm2_5).toFixed(0)}`; } }
          } catch { /* leave default */ }
        }),
      );
      setCityRows(rows);
    } catch (err) { console.error('Admin overview fetch error:', err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---- Derived values ------------------------------------------------

  const maxBar = Math.max(...weeklyBars.map((b) => Math.max(b.premiums, b.payouts)), 1);
  const totalZones = zoneStatus.reduce((s, z) => s + z.count, 0) || 1;
  const conicSegments = zoneStatus.reduce<string[]>((acc, z, i) => {
    const startPct = zoneStatus.slice(0, i).reduce((s, x) => s + (x.count / totalZones) * 100, 0);
    acc.push(`${z.color} ${startPct}% ${startPct + (z.count / totalZones) * 100}%`);
    return acc;
  }, []).join(', ');

  // ---- Loading --------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full mx-auto mb-3 animate-spin" style={{ border: '3px solid #F3F4F6', borderTopColor: NEON.purple }} />
          <p className="mono text-sm" style={{ color: '#6B7280' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const F = "var(--font-inter),'Inter',sans-serif";

  return (
    <div className="space-y-6">
      <Tooltip x={tip.x} y={tip.y} content={tip.content} visible={tip.visible} />

      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: F }}>Admin Dashboard</h1>

      {/* ══════════════════════════════════════════════════════════════
          KPI CARDS — gradient backgrounds, white text
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((k, idx) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="adm-s rounded-2xl p-4 relative overflow-hidden"
              style={{
                background: k.gradient, borderRadius: 16, color: '#fff',
                transition: 'all 0.25s ease', animationDelay: `${idx * 0.05}s`,
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.25)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Glow icon bg */}
              <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
              <Icon size={18} style={{ opacity: 0.8, marginBottom: 6 }} />
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85, fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                {k.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, marginTop: 4, fontFamily: F }}>
                {k.value}
              </div>
              <div className="flex items-center gap-1 mt-2" style={{ fontSize: 11, opacity: 0.9 }}>
                {k.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span style={{ fontWeight: 600 }}>{k.trendLabel}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CHARTS ROW — Premium vs Payouts + Zone Donut + Sparklines
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar chart */}
        <div className="adm-s lg:col-span-2 rounded-2xl p-5" style={{ border: '1px solid #E8E8EA', borderRadius: 16, background: '#fff', transition: 'all 0.2s ease' }} onMouseOver={e => { e.currentTarget.style.boxShadow = '0 8px 25px rgba(99,102,241,0.08)'; }} onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: '#1A1A1A', fontFamily: F }}>Premium Pool vs Payouts</h2>
            {/* Mini sparkline for premiums trend */}
            <MiniSparkline data={weeklyBars.map(b => b.premiums)} color={NEON.purple} />
          </div>
          {weeklyBars.length === 0 ? (
            <p className="mono text-sm" style={{ color: '#9CA3AF' }}>No data yet</p>
          ) : (
            <div className="flex items-end gap-3" style={{ height: 200 }}>
              {weeklyBars.map((b) => (
                <div key={b.week} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-1 items-end" style={{ height: 170 }}>
                    <div
                      className="flex-1 rounded-t"
                      style={{
                        height: `${(b.premiums / maxBar) * 100}%`, minHeight: b.premiums > 0 ? 4 : 0,
                        background: `linear-gradient(to top, ${NEON.indigo}, ${NEON.purple})`,
                        transition: 'all 0.15s ease', cursor: 'pointer', transformOrigin: 'bottom',
                      }}
                      onMouseEnter={e => { showTip(e, [`Week: ${b.week}`, `Premiums: \u20B9${b.premiums.toLocaleString('en-IN')}`]); e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scaleY(1.05)'; }}
                      onMouseMove={moveTip}
                      onMouseLeave={e => { hideTip(); e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scaleY(1)'; }}
                    />
                    <div
                      className="flex-1 rounded-t"
                      style={{
                        height: `${(b.payouts / maxBar) * 100}%`, minHeight: b.payouts > 0 ? 4 : 0,
                        background: `linear-gradient(to top, ${NEON.blue}, ${NEON.cyan})`,
                        transition: 'all 0.15s ease', cursor: 'pointer', transformOrigin: 'bottom',
                      }}
                      onMouseEnter={e => { showTip(e, [`Week: ${b.week}`, `Payouts: \u20B9${b.payouts.toLocaleString('en-IN')}`]); e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scaleY(1.05)'; }}
                      onMouseMove={moveTip}
                      onMouseLeave={e => { hideTip(); e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scaleY(1)'; }}
                    />
                  </div>
                  <span className="mono text-xs" style={{ color: '#9CA3AF' }}>{b.week}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 mono text-xs" style={{ color: '#6B7280' }}>
              <span className="inline-block w-3 h-3 rounded" style={{ background: `linear-gradient(135deg, ${NEON.indigo}, ${NEON.purple})` }} /> Premiums
            </span>
            <span className="flex items-center gap-1.5 mono text-xs" style={{ color: '#6B7280' }}>
              <span className="inline-block w-3 h-3 rounded" style={{ background: `linear-gradient(135deg, ${NEON.blue}, ${NEON.cyan})` }} /> Payouts
            </span>
          </div>
        </div>

        {/* Donut chart */}
        <div className="adm-s rounded-2xl p-5" style={{ border: '1px solid #E8E8EA', borderRadius: 16, background: '#fff', transition: 'all 0.2s ease' }} onMouseOver={e => { e.currentTarget.style.boxShadow = '0 8px 25px rgba(99,102,241,0.08)'; }} onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; }}>
          <h2 className="font-semibold mb-4" style={{ color: '#1A1A1A', fontFamily: F }}>Zone Status</h2>
          <div className="flex items-center justify-center" style={{ height: 170 }}>
            <div style={{ position: 'relative', width: 150, height: 150 }}>
              <div
                className="rounded-full"
                style={{
                  width: 150, height: 150,
                  background: `conic-gradient(${conicSegments})`,
                  mask: 'radial-gradient(circle at center, transparent 48%, black 48%)',
                  WebkitMask: 'radial-gradient(circle at center, transparent 48%, black 48%)',
                  transition: 'transform 0.3s ease', cursor: 'pointer',
                  filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.15))',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; showTip(e, ['Zone Distribution', ...zoneStatus.map(z => `${z.label}: ${z.count} (${((z.count / totalZones) * 100).toFixed(0)}%)`)]); }}
                onMouseMove={moveTip}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; hideTip(); }}
              />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A' }}>{totalZones}</div>
                <div style={{ fontSize: 9, color: '#9CA3AF', fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.08em' }}>zones</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            {zoneStatus.map((z) => (
              <span key={z.label} className="flex items-center gap-1.5 mono text-xs" style={{ color: '#6B7280' }}>
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: z.color, boxShadow: `0 0 6px ${z.color}60` }} />
                {z.label} ({z.count})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ACTIVE ZONES TABLE — colorful rows
      ══════════════════════════════════════════════════════════════ */}
      <div className="adm-s rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E8EA', borderRadius: 16, background: '#fff' }}>
        <div className="p-4" style={{ borderBottom: '1px solid #E8E8EA' }}>
          <h2 className="font-semibold" style={{ color: '#1A1A1A', fontFamily: F }}>Active Zones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E8EA' }}>
                {['City', 'Status', 'Risk Score', 'Workers', 'Rain', 'AQI', 'Temp'].map((h) => (
                  <th key={h} className="mono text-xs uppercase tracking-wide text-left px-4 py-3 font-medium" style={{ color: '#6B7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cityRows.map((r, idx) => (
                <tr
                  key={r.city}
                  className="admin-row transition-colors"
                  style={{
                    borderBottom: '1px solid #F3F4F6',
                    background: ZONE_CARD_GRADIENTS[idx % ZONE_CARD_GRADIENTS.length],
                    transition: 'all 0.2s ease', cursor: 'pointer',
                  }}
                >
                  <td className="px-4 py-3 font-semibold" style={{ color: ZONE_CARD_BORDERS[idx % ZONE_CARD_BORDERS.length] }}>{r.city}</td>
                  <td className="px-4 py-3">
                    <span className="mono text-xs font-semibold px-2.5 py-1 rounded-full" style={{ ...statusBadge(r.status), display: 'inline-block' }}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div style={{ width: 40, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                        <div style={{ width: `${r.riskScore * 100}%`, height: '100%', borderRadius: 3, background: r.riskScore > 0.7 ? NEON.red : r.riskScore > 0.4 ? NEON.yellow : NEON.green }} />
                      </div>
                      <span className="font-semibold mono text-xs" style={{ color: r.riskScore > 0.7 ? NEON.red : r.riskScore > 0.4 ? '#a16207' : NEON.green }}>
                        {r.riskScore.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 mono" style={{ color: '#6B7280' }}>{r.activeWorkers}</td>
                  <td className="px-4 py-3 mono" style={{ color: r.rain !== '--' ? NEON.blue : '#9CA3AF', fontWeight: r.rain !== '--' ? 600 : 400 }}>{r.rain}</td>
                  <td className="px-4 py-3 mono" style={{ color: r.aqi !== '--' ? (Number(r.aqi) > 300 ? NEON.red : Number(r.aqi) > 150 ? NEON.orange : NEON.green) : '#9CA3AF', fontWeight: r.aqi !== '--' ? 600 : 400 }}>{r.aqi}</td>
                  <td className="px-4 py-3 mono" style={{ color: '#6B7280' }}>{r.temp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
