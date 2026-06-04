'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CITIES } from '@/lib/config/cities';
import { TIER_TYPES } from '@/lib/config/constants';
import type { TierType } from '@/lib/config/constants';

/* ---------- Types ---------- */

interface PolicyRow {
  id: string;
  profile_id: string;
  plan_id: string | null;
  week_start_date: string;
  week_end_date: string;
  base_premium_inr: number;
  weather_risk_addon: number;
  ubi_addon: number;
  final_premium_inr: number;
  is_active: boolean;
  payment_status: string;
  total_payout_this_week: number;
  created_at: string;
  profiles: { full_name: string | null; city: string | null } | null;
  plan_packages: { name: string; tier: string } | null;
}

interface PremiumResult {
  base_premium?: number;
  weather_risk_addon?: number;
  ubi_addon?: number;
  final_premium?: number;
  ubi_details?: { weighted_risk_score: number; risk_level: string; zone_contributions: Array<{ zone_name: string; risk_score: number; time_percentage: number }> };
  breakdown?: { rainfall_probability: number; wind_probability: number; aqi_probability: number; combined_risk_score: number };
  error?: string;
}

/* ---------- Constants ---------- */

const TIER_COLORS: Record<string, { border: string; color: string }> = {
  normal: { border: '1px solid #22C55E', color: '#22C55E' },
  medium: { border: '1px solid #FACC15', color: '#b45309' },
  high: { border: '1px solid #F87171', color: '#dc2626' },
};

const TIER_DONUT_COLORS: Record<string, string> = {
  normal: '#22C55E',
  medium: '#FACC15',
  high: '#F87171',
};

const TIER_GRADIENTS: Record<string, string> = {
  normal: 'linear-gradient(135deg, #22C55E, #16A34A)',
  medium: 'linear-gradient(135deg, #FACC15, #EAB308)',
  high: 'linear-gradient(135deg, #F87171, #DC2626)',
};

const PAYMENT_STATUS_STYLES: Record<string, { border: string; color: string }> = {
  paid: { border: '1px solid #22C55E', color: '#22C55E' },
  demo: { border: '1px solid #22C55E', color: '#22C55E' },
  pending: { border: '1px solid #f59e0b', color: '#f59e0b' },
  failed: { border: '1px solid #dc2626', color: '#dc2626' },
};

const PAYMENT_GRADIENTS: Record<string, string> = {
  paid: 'linear-gradient(135deg, #22C55E, #16A34A)',
  demo: 'linear-gradient(135deg, #22C55E, #16A34A)',
  pending: 'linear-gradient(135deg, #F59E0B, #D97706)',
  failed: 'linear-gradient(135deg, #EF4444, #DC2626)',
};

const ROW_GRADIENT_PALETTE = [
  'linear-gradient(90deg, rgba(99,102,241,0.06), rgba(139,92,246,0.03))',
  'linear-gradient(90deg, rgba(59,130,246,0.06), rgba(6,182,212,0.03))',
  'linear-gradient(90deg, rgba(139,92,246,0.06), rgba(168,85,247,0.03))',
  'linear-gradient(90deg, rgba(20,184,166,0.06), rgba(34,197,94,0.03))',
  'linear-gradient(90deg, rgba(249,115,22,0.06), rgba(234,179,8,0.03))',
  'linear-gradient(90deg, rgba(236,72,153,0.06), rgba(168,85,247,0.03))',
];

const ROW_CITY_COLORS = [
  '#6366F1', '#3B82F6', '#8B5CF6', '#14B8A6', '#F59E0B', '#EC4899',
];

/* ---------- Skeleton ---------- */

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: '#F3F4F6' }}
    />
  );
}

/* ---------- Keyframes Style ---------- */

const animationStyles = `
@keyframes pSlide {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes riskSlideIn {
  0% {
    opacity: 0;
    transform: translateX(-20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes donutGlow {
  0%, 100% {
    filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 14px rgba(139, 92, 246, 0.6));
  }
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes pulseBtn {
  0%, 100% { box-shadow: 0 2px 8px rgba(99,102,241,0.25); }
  50% { box-shadow: 0 4px 24px rgba(99,102,241,0.5); }
}

@keyframes sparkDraw {
  from { stroke-dashoffset: 200; }
  to { stroke-dashoffset: 0; }
}

.p-s { animation: pSlide 0.5s ease forwards; opacity: 0; }
.p-s-1 { animation-delay: 0.05s; }
.p-s-2 { animation-delay: 0.12s; }
.p-s-3 { animation-delay: 0.19s; }
.p-s-4 { animation-delay: 0.26s; }
.p-s-5 { animation-delay: 0.33s; }
.p-s-6 { animation-delay: 0.4s; }

.risk-slide {
  animation: riskSlideIn 0.4s ease forwards;
  opacity: 0;
}

.risk-slide:nth-child(1) { animation-delay: 0.05s; }
.risk-slide:nth-child(2) { animation-delay: 0.1s; }
.risk-slide:nth-child(3) { animation-delay: 0.15s; }
.risk-slide:nth-child(4) { animation-delay: 0.2s; }
.risk-slide:nth-child(5) { animation-delay: 0.25s; }
.risk-slide:nth-child(6) { animation-delay: 0.3s; }
.risk-slide:nth-child(7) { animation-delay: 0.35s; }
.risk-slide:nth-child(8) { animation-delay: 0.4s; }

.donut-glow {
  animation: donutGlow 3s ease-in-out infinite;
}

.calc-focus:focus {
  outline: none;
  border-color: #6366F1 !important;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.2), 0 0 12px rgba(99,102,241,0.1) !important;
}

.calc-btn:hover:not(:disabled) {
  animation: pulseBtn 1.5s ease-in-out infinite;
}
`;

/* ---------- Page ---------- */

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table sort and filter
  const [sortField, setSortField] = useState<'week_start_date' | 'final_premium_inr' | 'total_payout_this_week'>('week_start_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterCity, setFilterCity] = useState('all');
  const [filterTier, setFilterTier] = useState('all');

  /* --- Tooltip --- */
  const [tip, setTip] = useState<{x:number;y:number;content:string[];visible:boolean}>({x:0,y:0,content:[],visible:false});
  function showTip(e: React.MouseEvent, content: string[]) { setTip({x:e.clientX,y:e.clientY,content,visible:true}); }
  function moveTip(e: React.MouseEvent) { setTip(prev=>({...prev,x:e.clientX,y:e.clientY})); }
  function hideTip() { setTip(prev=>({...prev,visible:false})); }

  // Premium calculator state
  const [calcCity, setCalcCity] = useState(CITIES[0].slug);
  const [calcTier, setCalcTier] = useState<TierType>('normal');
  const [calcDriverId, setCalcDriverId] = useState('');
  const [calcDate, setCalcDate] = useState(new Date().toISOString().split('T')[0]);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcResult, setCalcResult] = useState<PremiumResult | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data, error: fetchErr } = await supabase
          .from('weekly_policies')
          .select('*, profiles(full_name, city), plan_packages(name, tier)')
          .order('created_at', { ascending: false });

        if (fetchErr) throw fetchErr;
        setPolicies((data as unknown as PolicyRow[]) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load policies');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* --- Computed analytics --- */

  const activePolicies = useMemo(() => policies.filter((p) => p.is_active), [policies]);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { normal: 0, medium: 0, high: 0 };
    for (const p of activePolicies) {
      const tier = p.plan_packages?.tier || 'normal';
      counts[tier] = (counts[tier] || 0) + 1;
    }
    return counts;
  }, [activePolicies]);

  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of activePolicies) {
      const city = p.profiles?.city || 'Unknown';
      counts[city] = (counts[city] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [activePolicies]);

  const cityMaxCount = cityCounts.length > 0 ? cityCounts[0][1] : 1;

  // Weekly trend (this week vs last week)
  const weeklyTrend = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    let thisWeek = 0;
    let lastWeek = 0;
    for (const p of policies) {
      const created = new Date(p.created_at);
      if (created >= startOfThisWeek) thisWeek++;
      else if (created >= startOfLastWeek && created < startOfThisWeek) lastWeek++;
    }
    const diff = thisWeek - lastWeek;
    return { thisWeek, lastWeek, diff };
  }, [policies]);

  // Donut gradient for tiers
  const tierDonutGradient = useMemo(() => {
    const total = activePolicies.length || 1;
    const segments: string[] = [];
    let cumulative = 0;
    for (const tier of TIER_TYPES) {
      const count = tierCounts[tier] || 0;
      const pct = (count / total) * 100;
      const color = TIER_DONUT_COLORS[tier] || '#ccc';
      segments.push(`${color} ${cumulative}% ${cumulative + pct}%`);
      cumulative += pct;
    }
    return `conic-gradient(${segments.join(', ')})`;
  }, [activePolicies.length, tierCounts]);

  // Unique cities
  const policyCities = useMemo(() => {
    const set = new Set<string>();
    for (const p of policies) {
      if (p.profiles?.city) set.add(p.profiles.city);
    }
    return [...set].sort();
  }, [policies]);

  // Sorted and filtered policies
  const displayPolicies = useMemo(() => {
    let filtered = policies.filter((p) => {
      if (filterCity !== 'all' && p.profiles?.city !== filterCity) return false;
      if (filterTier !== 'all' && p.plan_packages?.tier !== filterTier) return false;
      return true;
    });
    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      return sortAsc ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return filtered;
  }, [policies, filterCity, filterTier, sortField, sortAsc]);

  // Weekly premium totals for area chart (last 8 weeks)
  const weeklyPremiumData = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; total: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      let total = 0;
      for (const p of policies) {
        const created = new Date(p.created_at);
        if (created >= weekStart && created < weekEnd) {
          total += p.final_premium_inr;
        }
      }
      weeks.push({ label: `W${8 - i}`, total });
    }
    return weeks;
  }, [policies]);

  // Sparkline data: weekly policy creation counts (last 8 weeks)
  const sparklineData = useMemo(() => {
    const now = new Date();
    const counts: number[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      let count = 0;
      for (const p of policies) {
        const created = new Date(p.created_at);
        if (created >= weekStart && created < weekEnd) count++;
      }
      counts.push(count);
    }
    return counts;
  }, [policies]);

  function handleSort(field: typeof sortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  }

  /* --- Premium Calculator --- */

  async function handleCalculatePremium() {
    setCalcLoading(true);
    setCalcResult(null);
    try {
      const mlUrl = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8001';
      const res = await fetch(`${mlUrl}/predict/premium`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: calcCity,
          tier: calcTier,
          driver_id: calcDriverId || undefined,
          date: calcDate,
        }),
      });
      const data = (await res.json()) as PremiumResult;
      setCalcResult(data);
    } catch (err) {
      setCalcResult({ error: err instanceof Error ? err.message : 'Failed to calculate' });
    } finally {
      setCalcLoading(false);
    }
  }

  /* --- SVG helpers --- */

  // Build sparkline SVG path from data points
  function buildSparklinePath(data: number[], width: number, height: number): string {
    if (data.length === 0) return '';
    const max = Math.max(...data, 1);
    const stepX = width / (data.length - 1 || 1);
    return data.map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  // Build smooth area chart path
  function buildAreaPath(data: { label: string; total: number }[], width: number, height: number): { line: string; area: string } {
    if (data.length === 0) return { line: '', area: '' };
    const max = Math.max(...data.map(d => d.total), 1);
    const stepX = width / (data.length - 1 || 1);
    const points = data.map((d, i) => ({
      x: i * stepX,
      y: height - (d.total / max) * (height - 8) - 4,
    }));

    // Simple smooth curve using quadratic bezier
    let line = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const cpx = (points[i - 1].x + points[i].x) / 2;
      line += ` Q${cpx.toFixed(1)},${points[i - 1].y.toFixed(1)} ${points[i].x.toFixed(1)},${points[i].y.toFixed(1)}`;
    }

    const area = line + ` L${points[points.length - 1].x.toFixed(1)},${height} L${points[0].x.toFixed(1)},${height} Z`;

    return { line, area };
  }

  // Build radar/spider chart for top 5 cities
  function buildRadarChart(cityData: [string, number][], size: number) {
    const top5 = cityData.slice(0, 5);
    while (top5.length < 5) top5.push(['--', 0]);
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 16;
    const maxVal = Math.max(...top5.map(c => c[1]), 1);
    const angleStep = (2 * Math.PI) / 5;
    const startAngle = -Math.PI / 2;

    // Pentagon rings (3 concentric)
    const rings = [0.33, 0.66, 1.0].map(scale => {
      return Array.from({ length: 5 }, (_, i) => {
        const angle = startAngle + i * angleStep;
        return `${(cx + r * scale * Math.cos(angle)).toFixed(1)},${(cy + r * scale * Math.sin(angle)).toFixed(1)}`;
      }).join(' ');
    });

    // Axis lines
    const axes = Array.from({ length: 5 }, (_, i) => {
      const angle = startAngle + i * angleStep;
      return { x2: cx + r * Math.cos(angle), y2: cy + r * Math.sin(angle) };
    });

    // Data polygon
    const dataPoints = top5.map(([, count], i) => {
      const angle = startAngle + i * angleStep;
      const ratio = count / maxVal;
      return `${(cx + r * ratio * Math.cos(angle)).toFixed(1)},${(cy + r * ratio * Math.sin(angle)).toFixed(1)}`;
    }).join(' ');

    // Labels
    const labels = top5.map(([city, count], i) => {
      const angle = startAngle + i * angleStep;
      const lx = cx + (r + 12) * Math.cos(angle);
      const ly = cy + (r + 12) * Math.sin(angle);
      const anchor = Math.abs(Math.cos(angle)) < 0.3 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
      return { city, count, x: lx, y: ly, anchor };
    });

    return { rings, axes, dataPoints, labels, cx, cy };
  }

  /* --- Loading / Error --- */

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: "var(--font-inter),'Inter',sans-serif" }}>Policy Center</h1>
        <div style={{ borderRadius: 16, padding: 20, background: 'rgba(192,57,43,0.06)', border: '1px solid #dc2626' }}>
          <p className="font-medium" style={{ color: '#dc2626' }}>Failed to load data</p>
          <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{error}</p>
        </div>
      </div>
    );
  }

  const sortIcon = (field: typeof sortField) => {
    if (sortField !== field) return '';
    return sortAsc ? ' \u2191' : ' \u2193';
  };

  // Sparkline SVG
  const sparkPath = buildSparklinePath(sparklineData, 80, 28);

  // Area chart SVG
  const areaChartSize = { w: 800, h: 80 };
  const { line: areaLine, area: areaArea } = buildAreaPath(weeklyPremiumData, areaChartSize.w, areaChartSize.h);
  const premiumMax = Math.max(...weeklyPremiumData.map(d => d.total), 1);

  // Radar chart
  const radarSize = 140;
  const radar = buildRadarChart(cityCounts, radarSize);

  // Tier totals for progress bars
  const tierTotal = activePolicies.length || 1;

  return (
    <div className="space-y-6">
      {/* Injected keyframe animations */}
      <style>{animationStyles}</style>

      {/* Tooltip -- dark indigo gradient with glow */}
      {tip.visible && (
        <div style={{
          position:'fixed',
          left:tip.x+12,
          top:tip.y+12,
          background:'linear-gradient(135deg, #312E81, #4338CA)',
          color:'#fff',
          borderRadius:10,
          padding:'10px 14px',
          fontSize:12,
          fontFamily:'monospace',
          boxShadow:'0 4px 20px rgba(99,102,241,0.4), 0 0 40px rgba(99,102,241,0.15)',
          pointerEvents:'none',
          zIndex:9999,
          maxWidth:240,
          border:'1px solid rgba(129,140,248,0.3)',
          backdropFilter:'blur(8px)',
        }}>
          {tip.content.map((line,i)=><div key={i}>{line}</div>)}
        </div>
      )}

      <h1 className="p-s p-s-1" style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: "var(--font-inter),'Inter',sans-serif" }}>Policy Center</h1>

      {/* --- Policy Analytics KPI Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-s p-s-2">
        {/* Card 1: Active Policies -- indigo to purple gradient with sparkline */}
        <div style={{
          borderRadius: 16,
          padding: 20,
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          border: 'none',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 16px rgba(99,102,241,0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(99,102,241,0.4)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.25)'; }}
        >
          <p className="mono text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.8)' }}>Active Policies</p>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="serif text-3xl font-bold" style={{ color: '#ffffff' }}>{activePolicies.length}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>of {policies.length} total</p>
            </div>
            {/* Sparkline */}
            <svg width="80" height="28" viewBox="0 0 80 28" style={{ opacity: 0.7 }}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>
              {sparkPath && (
                <>
                  <path d={sparkPath + ` L80,28 L0,28 Z`} fill="url(#sparkGrad)" />
                  <path d={sparkPath} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" style={{ strokeDasharray: 200, animation: 'sparkDraw 1.2s ease forwards' }} />
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Card 2: By Tier -- horizontal progress bars on gradient */}
        <div style={{
          borderRadius: 16,
          padding: 20,
          background: 'linear-gradient(135deg, #EC4899, #F87171)',
          border: 'none',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 16px rgba(236,72,153,0.2)',
        }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(236,72,153,0.35)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(236,72,153,0.2)'; }}
        >
          <p className="mono text-xs uppercase tracking-wide mb-3" style={{ color: 'rgba(255,255,255,0.8)' }}>By Tier</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TIER_TYPES.map((t) => {
              const count = tierCounts[t] || 0;
              const pct = ((count / tierTotal) * 100);
              return (
                <div key={t}
                  onMouseEnter={e => showTip(e, [`${t}: ${count} policies`, `${pct.toFixed(1)}% of active`])}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: TIER_GRADIENTS[t],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, color: '#fff',
                        boxShadow: `0 2px 6px ${TIER_DONUT_COLORS[t]}40`,
                      }}>
                        {count}
                      </div>
                      <span className="mono text-xs capitalize" style={{ color: '#fff', fontWeight: 600 }}>{t}</span>
                    </div>
                    <span className="mono text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 3,
                      background: '#fff',
                      width: `${Math.max(pct, 2)}%`,
                      transition: 'width 0.6s ease',
                      boxShadow: '0 0 8px rgba(255,255,255,0.3)',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Premium Breakdown — stacked bar showing base/weather/UBI split */}
        {(() => {
          const totalBase = activePolicies.reduce((s, p) => s + Number(p.base_premium_inr), 0);
          const totalWeather = activePolicies.reduce((s, p) => s + Number(p.weather_risk_addon), 0);
          const totalUBI = activePolicies.reduce((s, p) => s + Number(p.ubi_addon), 0);
          const totalAll = totalBase + totalWeather + totalUBI || 1;
          const basePct = (totalBase / totalAll) * 100;
          const weatherPct = (totalWeather / totalAll) * 100;
          const ubiPct = (totalUBI / totalAll) * 100;
          return (
            <div style={{
              borderRadius: 16, padding: 20,
              background: 'linear-gradient(135deg, #14B8A6, #22C55E)',
              border: 'none', transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(20,184,166,0.2)',
            }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(20,184,166,0.35)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(20,184,166,0.2)'; }}
            >
              <p className="mono text-xs uppercase tracking-wide mb-3" style={{ color: 'rgba(255,255,255,0.8)' }}>Premium Split</p>
              {/* Stacked bar */}
              <div style={{ height: 14, borderRadius: 7, overflow: 'hidden', display: 'flex', marginBottom: 14, background: 'rgba(255,255,255,0.15)' }}>
                <div
                  style={{ width: `${basePct}%`, height: '100%', background: '#fff', transition: 'width 0.8s ease', cursor: 'pointer' }}
                  onMouseEnter={e => showTip(e, ['Base Premium', `₹${totalBase.toLocaleString()}`, `${basePct.toFixed(0)}% of total`])}
                  onMouseMove={moveTip} onMouseLeave={hideTip}
                />
                <div
                  style={{ width: `${weatherPct}%`, height: '100%', background: 'rgba(255,255,255,0.6)', transition: 'width 0.8s ease', cursor: 'pointer' }}
                  onMouseEnter={e => showTip(e, ['Weather Risk', `₹${totalWeather.toLocaleString()}`, `${weatherPct.toFixed(0)}% of total`])}
                  onMouseMove={moveTip} onMouseLeave={hideTip}
                />
                <div
                  style={{ width: `${ubiPct}%`, height: '100%', background: 'rgba(255,255,255,0.3)', transition: 'width 0.8s ease', cursor: 'pointer' }}
                  onMouseEnter={e => showTip(e, ['UBI Zone Addon', `₹${totalUBI.toLocaleString()}`, `${ubiPct.toFixed(0)}% of total`])}
                  onMouseMove={moveTip} onMouseLeave={hideTip}
                />
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Base', value: totalBase, pct: basePct, dot: '#fff' },
                  { label: 'Weather Risk', value: totalWeather, pct: weatherPct, dot: 'rgba(255,255,255,0.6)' },
                  { label: 'UBI Zone', value: totalUBI, pct: ubiPct, dot: 'rgba(255,255,255,0.3)' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: item.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{item.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Card 4: Weekly Trend -- blue to cyan gradient */}
        <div style={{
          borderRadius: 16,
          padding: 20,
          background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
          border: 'none',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 16px rgba(59,130,246,0.2)',
        }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(59,130,246,0.35)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.2)'; }}
        >
          <p className="mono text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.8)' }}>New This Week</p>
          <p className="serif text-3xl font-bold mt-2" style={{ color: '#ffffff' }}>{weeklyTrend.thisWeek}</p>
          <p className="text-xs mt-1" style={{ color: weeklyTrend.diff >= 0 ? 'rgba(255,255,255,0.9)' : '#FCA5A5' }}>
            {weeklyTrend.diff >= 0 ? '+' : ''}{weeklyTrend.diff} vs last week ({weeklyTrend.lastWeek})
          </p>
        </div>
      </div>

      {/* --- Dynamic Premium Calculator --- */}
      <div className="p-s p-s-3" style={{ borderRadius: 16, overflow: 'hidden', background: '#ffffff', border: '1px solid rgba(99,102,241,0.15)', boxShadow: '0 2px 12px rgba(99,102,241,0.06)' }}>
        {/* Dark indigo gradient header strip */}
        <div className="px-5 py-4" style={{
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          borderBottom: 'none',
        }}>
          <h2 className="serif text-lg font-bold" style={{ color: '#ffffff' }}>Dynamic Premium Calculator</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Test ML premium predictions for any combination.</p>
        </div>
        <div className="p-5">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Row 1: City, Tier, Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label className="mono block text-xs font-medium mb-1" style={{ color: '#1A1A1A' }}>City</label>
                <select
                  value={calcCity}
                  onChange={(e) => setCalcCity(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm calc-focus"
                  style={{ border: '1px solid #E8E8EA', background: '#ffffff', transition: 'all 0.2s ease' }}
                >
                  {CITIES.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono block text-xs font-medium mb-1" style={{ color: '#1A1A1A' }}>Tier</label>
                <select
                  value={calcTier}
                  onChange={(e) => setCalcTier(e.target.value as TierType)}
                  className="w-full rounded-lg px-3 py-2 text-sm capitalize calc-focus"
                  style={{ border: '1px solid #E8E8EA', background: '#ffffff', transition: 'all 0.2s ease' }}
                >
                  {TIER_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono block text-xs font-medium mb-1" style={{ color: '#1A1A1A' }}>Date</label>
                <input
                  type="date"
                  value={calcDate}
                  onChange={(e) => setCalcDate(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm calc-focus"
                  style={{ border: '1px solid #E8E8EA', background: '#ffffff', transition: 'all 0.2s ease' }}
                />
              </div>
            </div>
            {/* Row 2: Driver ID -- full width */}
            <div>
              <label className="mono block text-xs font-medium mb-1" style={{ color: '#1A1A1A' }}>Driver (for UBI zone lookup)</label>
              <select
                value={calcDriverId}
                onChange={(e) => setCalcDriverId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm calc-focus"
                style={{ border: '1px solid #E8E8EA', background: '#ffffff', transition: 'all 0.2s ease' }}
              >
                <option value="">Select a driver</option>
                <option value="aaaaaaaa-1111-1111-1111-111111111111">Rajesh Kumar — Mumbai (Kurla/Sion, high risk)</option>
                <option value="aaaaaaaa-2222-2222-2222-222222222222">Priya Sharma — Delhi (Anand Vihar, AQI hotspot)</option>
                <option value="aaaaaaaa-3333-3333-3333-333333333333">Suresh Patel — Bangalore (Whitefield)</option>
                <option value="aaaaaaaa-4444-4444-4444-444444444444">Meera Devi — Chennai (Velachery, cyclone risk)</option>
                <option value="aaaaaaaa-5555-5555-5555-555555555555">Amit Singh — Pune (Katraj, flood risk)</option>
                <option value="aaaaaaaa-6666-6666-6666-666666666666">Lakshmi Rao — Hyderabad (Gachibowli, low risk)</option>
                <option value="aaaaaaaa-7777-7777-7777-777777777777">Vikram Tiwari — Kolkata (Diamond Harbour, cyclone)</option>
              </select>
              <p className="mono text-xs mt-1" style={{ color: '#9CA3AF' }}>Required — determines zone-based UBI premium adjustment</p>
            </div>
          </div>
          {/* Gradient indigo-purple calculate button with hover pulse */}
          <button
            onClick={handleCalculatePremium}
            disabled={calcLoading}
            className="calc-btn mt-4 text-white font-medium px-6 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}
            onMouseOver={e => { if (!calcLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {calcLoading ? 'Calculating...' : 'Calculate Premium'}
          </button>

          {calcResult && (
            <div className="mt-4">
              {calcResult.error ? (
                <div className="rounded-xl p-4" style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid #dc2626' }}>
                  <p className="text-sm font-medium" style={{ color: '#dc2626' }}>Error</p>
                  <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{calcResult.error}</p>
                </div>
              ) : (
                /* Premium result — colorful multi-section layout.
                 * Round each component first, then sum, so the banner total
                 * always equals base + weather + ubi at the precision the user
                 * sees. Backend's final_premium is computed on unrounded floats
                 * and therefore drifts by ±1 from the rounded display values. */
                (() => {
                  const displayBase = Math.round(Number(calcResult.base_premium || 0));
                  const displayWeather = Math.round(Number(calcResult.weather_risk_addon || 0));
                  const displayUbi = Math.round(Number(calcResult.ubi_addon || 0));
                  const displayTotal = displayBase + displayWeather + displayUbi;
                  return (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E8EA' }}>
                  {/* Top banner — final premium */}
                  <div style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', padding: '20px 24px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                    <div className="mono text-xs" style={{ opacity: 0.8, marginBottom: 4 }}>FINAL WEEKLY PREMIUM</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 36, fontWeight: 800 }}>&#8377;{displayTotal}</span>
                      <span style={{ fontSize: 14, opacity: 0.7 }}>/week</span>
                    </div>
                  </div>

                  {/* Breakdown cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
                    <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRight: '1px solid #E8E8EA' }}>
                      <div className="mono" style={{ fontSize: 10, color: '#6B7280', marginBottom: 4 }}>BASE PREMIUM</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#3B82F6' }}>&#8377;{displayBase}</div>
                    </div>
                    <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #fefce8, #fef9c3)', borderRight: '1px solid #E8E8EA' }}>
                      <div className="mono" style={{ fontSize: 10, color: '#6B7280', marginBottom: 4 }}>WEATHER RISK</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#D97706' }}>+&#8377;{displayWeather}</div>
                    </div>
                    <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #faf5ff, #ede9fe)' }}>
                      <div className="mono" style={{ fontSize: 10, color: '#6B7280', marginBottom: 4 }}>UBI ZONE</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#7C3AED' }}>+&#8377;{displayUbi}</div>
                    </div>
                  </div>

                  {/* Bottom section — probabilities + zone risk side by side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #E8E8EA' }}>
                    {/* Disruption probabilities */}
                    {calcResult.breakdown && (
                      <div style={{ padding: '16px 20px', borderRight: '1px solid #E8E8EA' }}>
                        <div className="mono" style={{ fontSize: 10, color: '#6B7280', marginBottom: 10 }}>DISRUPTION PROBABILITIES</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {[
                            { label: 'Rainfall', value: calcResult.breakdown.rainfall_probability, color: '#3B82F6', bg: '#dbeafe' },
                            { label: 'Wind', value: calcResult.breakdown.wind_probability, color: '#F59E0B', bg: '#fef3c7' },
                            { label: 'AQI', value: calcResult.breakdown.aqi_probability, color: '#EF4444', bg: '#fee2e2' },
                          ].map(item => (
                            <div key={item.label}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span className="mono" style={{ fontSize: 11, color: '#6B7280' }}>{item.label}</span>
                                <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{(item.value * 100).toFixed(1)}%</span>
                              </div>
                              <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 3, background: item.color, width: `${Math.max(item.value * 100, 2)}%`, transition: 'width 0.6s ease' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Zone risk details */}
                    {calcResult.ubi_details && (
                      <div style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span className="mono" style={{ fontSize: 10, color: '#6B7280' }}>ZONE RISK</span>
                          <span className="mono" style={{ fontSize: 12, fontWeight: 800, color: calcResult.ubi_details.risk_level === 'high' ? '#EF4444' : calcResult.ubi_details.risk_level === 'medium' ? '#F59E0B' : '#22C55E' }}>
                            {(calcResult.ubi_details.weighted_risk_score * 100).toFixed(1)}%
                          </span>
                          <span className="mono" style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: calcResult.ubi_details.risk_level === 'high' ? '#fee2e2' : calcResult.ubi_details.risk_level === 'medium' ? '#fef3c7' : '#dcfce7', color: calcResult.ubi_details.risk_level === 'high' ? '#DC2626' : calcResult.ubi_details.risk_level === 'medium' ? '#D97706' : '#16A34A' }}>
                            {calcResult.ubi_details.risk_level.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {calcResult.ubi_details.zone_contributions.map((z, zi) => {
                            const zoneColors = ['#6366F1', '#3B82F6', '#8B5CF6', '#14B8A6', '#EC4899'];
                            const zc = zoneColors[zi % zoneColors.length];
                            return (
                              <div key={z.zone_name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: `${zc}08`, border: `1px solid ${zc}20` }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: zc, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', flex: 1 }}>{z.zone_name}</span>
                                <span className="mono" style={{ fontSize: 10, color: '#6B7280' }}>{z.time_percentage}%</span>
                                <div style={{ width: 32, height: 4, borderRadius: 2, background: '#F3F4F6', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: 2, background: z.risk_score > 0.7 ? '#EF4444' : z.risk_score > 0.5 ? '#F59E0B' : '#22C55E', width: `${z.risk_score * 100}%` }} />
                                </div>
                                <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: z.risk_score > 0.7 ? '#EF4444' : z.risk_score > 0.5 ? '#F59E0B' : '#22C55E' }}>{(z.risk_score * 100).toFixed(0)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- Premium Distribution Area Chart --- */}
      <div className="p-s p-s-4" style={{ borderRadius: 16, overflow: 'hidden', background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', boxShadow: '0 2px 12px rgba(99,102,241,0.06)', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p className="mono text-xs uppercase tracking-wide" style={{ color: '#6B7280' }}>Weekly Premium Distribution</p>
          <p className="mono text-xs" style={{ color: '#9CA3AF' }}>Last 8 weeks</p>
        </div>
        <svg width="100%" height="80" viewBox={`0 0 ${areaChartSize.w} ${areaChartSize.h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(139,92,246,0.3)" />
              <stop offset="100%" stopColor="rgba(139,92,246,0.02)" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          {areaArea && <path d={areaArea} fill="url(#areaGrad)" />}
          {areaLine && <path d={areaLine} fill="none" stroke="url(#lineGrad)" strokeWidth="2" strokeLinecap="round" />}
          {/* Data points */}
          {weeklyPremiumData.map((d, i) => {
            const stepX = areaChartSize.w / (weeklyPremiumData.length - 1 || 1);
            const x = i * stepX;
            const y = areaChartSize.h - (d.total / premiumMax) * (areaChartSize.h - 8) - 4;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="#8B5CF6"
                stroke="#fff"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => showTip(e, [`${d.label}`, `Premium: ${d.total.toLocaleString()}`])}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              />
            );
          })}
        </svg>
        {/* Week labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {weeklyPremiumData.map((d, i) => (
            <span key={i} className="mono" style={{ fontSize: 9, color: '#9CA3AF' }}>{d.label}</span>
          ))}
        </div>
      </div>

      {/* --- Policy Table --- */}
      <div className="p-s p-s-5" style={{ borderRadius: 16, overflow: 'hidden', background: '#ffffff', border: '1px solid rgba(99,102,241,0.12)', boxShadow: '0 2px 12px rgba(99,102,241,0.06)' }}>
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.1)', background: 'linear-gradient(90deg, rgba(99,102,241,0.03), rgba(139,92,246,0.02))' }}>
          <h2 className="serif text-lg font-bold" style={{ color: '#1A1A1A' }}>All Policies</h2>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="mono text-xs rounded-lg px-3 py-1.5 calc-focus"
              style={{ border: '1px solid #E8E8EA', background: '#ffffff', transition: 'all 0.2s ease' }}
            >
              <option value="all">All Cities</option>
              {policyCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="mono text-xs rounded-lg px-3 py-1.5 capitalize calc-focus"
              style={{ border: '1px solid #E8E8EA', background: '#ffffff', transition: 'all 0.2s ease' }}
            >
              <option value="all">All Tiers</option>
              {TIER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))', color: '#6B7280' }}>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer select-none"
                  onClick={() => handleSort('final_premium_inr')}
                  style={{ color: sortField === 'final_premium_inr' ? '#6366F1' : '#6B7280' }}
                >
                  Premium{sortIcon('final_premium_inr')}
                </th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer select-none"
                  onClick={() => handleSort('week_start_date')}
                  style={{ color: sortField === 'week_start_date' ? '#6366F1' : '#6B7280' }}
                >
                  Week{sortIcon('week_start_date')}
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer select-none"
                  onClick={() => handleSort('total_payout_this_week')}
                  style={{ color: sortField === 'total_payout_this_week' ? '#6366F1' : '#6B7280' }}
                >
                  Payout{sortIcon('total_payout_this_week')}
                </th>
              </tr>
            </thead>
            <tbody>
              {displayPolicies.map((p, idx) => {
                const tierKey = p.plan_packages?.tier || 'normal';
                const paymentStyle = PAYMENT_STATUS_STYLES[p.payment_status] || { border: '1px solid #6B7280', color: '#6B7280' };
                const rowGradient = ROW_GRADIENT_PALETTE[idx % ROW_GRADIENT_PALETTE.length];
                const cityColor = ROW_CITY_COLORS[idx % ROW_CITY_COLORS.length];
                const tierGrad = TIER_GRADIENTS[tierKey] || TIER_GRADIENTS.normal;
                const paymentGrad = PAYMENT_GRADIENTS[p.payment_status] || 'linear-gradient(135deg, #6B7280, #4B5563)';
                return (
                  <tr
                    key={p.id}
                    className="admin-row"
                    style={{
                      borderTop: '1px solid rgba(99,102,241,0.06)',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                      background: rowGradient,
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'linear-gradient(90deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.1)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = rowGradient; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: '#1A1A1A' }}>
                      {p.profiles?.full_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: cityColor }}>
                      {p.profiles?.city || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="mono text-xs font-medium px-2.5 py-1 rounded-full capitalize" style={{
                        background: tierGrad,
                        color: '#ffffff',
                        border: 'none',
                        boxShadow: `0 2px 6px ${TIER_DONUT_COLORS[tierKey]}30`,
                        transition: 'transform 0.15s ease',
                        display: 'inline-block',
                      }} onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.08)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                        {p.plan_packages?.name || p.plan_packages?.tier || '-'}
                      </span>
                    </td>
                    <td className="serif px-4 py-3 font-bold" style={{ color: '#4F46E5' }}>
                      &#8377;{Number(p.final_premium_inr).toLocaleString()}
                    </td>
                    <td className="mono px-4 py-3 text-xs" style={{ color: '#6B7280' }}>
                      {p.week_start_date}
                    </td>
                    <td className="px-4 py-3">
                      <span className="mono text-xs font-medium px-2.5 py-1 rounded-full" style={{
                        background: paymentGrad,
                        color: '#ffffff',
                        border: 'none',
                        boxShadow: `0 2px 6px ${paymentStyle.color}30`,
                        transition: 'transform 0.15s ease',
                        display: 'inline-block',
                      }} onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.08)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="serif px-4 py-3 font-bold" style={{ color: p.total_payout_this_week > 0 ? '#3B82F6' : '#9CA3AF' }}>
                      &#8377;{Number(p.total_payout_this_week).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {displayPolicies.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>
                    No policies found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
