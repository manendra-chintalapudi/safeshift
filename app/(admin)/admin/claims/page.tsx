'use client';

import { useEffect, useState, useMemo, useCallback, type MouseEvent as RME } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TRIGGERS } from '@/lib/config/constants';
import type { DisruptionType } from '@/lib/config/constants';

/* ---------- Types ---------- */

interface ClaimRow {
  id: string;
  profile_id: string;
  payout_amount_inr: number;
  status: string;
  fraud_score: number;
  is_flagged: boolean;
  flag_reason: string | null;
  fraud_signals: Record<string, unknown>;
  created_at: string;
  profiles: { full_name: string | null; city: string | null } | null;
  live_disruption_events: {
    event_type: string;
    city: string;
    severity_score: number;
  } | null;
}

/* ---------- Constants ---------- */

const STATUS_STYLES: Record<string, { border: string; color: string }> = {
  paid: { border: '1px solid #22C55E', color: '#22C55E' },
  approved: { border: '1px solid #22C55E', color: '#22C55E' },
  gate1_passed: { border: '1px solid #f59e0b', color: '#f59e0b' },
  gate2_passed: { border: '1px solid #f59e0b', color: '#f59e0b' },
  triggered: { border: '1px solid #6B7280', color: '#6B7280' },
  pending_review: { border: '1px solid #f59e0b', color: '#f59e0b' },
  rejected: { border: '1px solid #dc2626', color: '#dc2626' },
  appealed: { border: '1px solid #6B7280', color: '#6B7280' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SEASONS: Record<string, string> = {
  'Dec': 'Winter', 'Jan': 'Winter', 'Feb': 'Winter',
  'Mar': 'Pre-Monsoon', 'Apr': 'Pre-Monsoon', 'May': 'Pre-Monsoon',
  'Jun': 'Monsoon', 'Jul': 'Monsoon', 'Aug': 'Monsoon', 'Sep': 'Monsoon',
  'Oct': 'Post-Monsoon', 'Nov': 'Post-Monsoon',
};

const ROW_GRADIENTS = [
  'linear-gradient(90deg, rgba(99,102,241,0.06), rgba(139,92,246,0.03))',
  'linear-gradient(90deg, rgba(236,72,153,0.05), rgba(248,113,113,0.03))',
  'linear-gradient(90deg, rgba(249,115,22,0.05), rgba(250,204,21,0.03))',
  'linear-gradient(90deg, rgba(20,184,166,0.06), rgba(34,197,94,0.03))',
];

const ROW_NAME_COLORS = ['#6366F1', '#EC4899', '#F97316', '#14B8A6'];

const CITY_COLORS = ['#6366F1', '#3B82F6', '#EC4899', '#14B8A6', '#F97316', '#8B5CF6'];

/* ---------- Skeleton ---------- */

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: '#F3F4F6' }}
    />
  );
}

/* ---------- Page ---------- */

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  /* --- Tooltip --- */
  const [tip, setTip] = useState<{x:number;y:number;content:string[];visible:boolean}>({x:0,y:0,content:[],visible:false});
  function showTip(e: React.MouseEvent, content: string[]) { setTip({x:e.clientX,y:e.clientY,content,visible:true}); }
  function moveTip(e: React.MouseEvent) { setTip(prev=>({...prev,x:e.clientX,y:e.clientY})); }
  function hideTip() { setTip(prev=>({...prev,visible:false})); }

  const loadClaims = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchErr } = await supabase
        .from('parametric_claims')
        .select('*, profiles(full_name, city), live_disruption_events(event_type, city, severity_score)')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setClaims((data as unknown as ClaimRow[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  /* --- Computed analytics --- */

  const kpis = useMemo(() => {
    let total = 0, paid = 0, rejected = 0, pending = 0;
    for (const c of claims) {
      total++;
      if (c.status === 'paid' || c.status === 'approved') paid++;
      else if (c.status === 'rejected') rejected++;
      else pending++;
    }
    return { total, paid, rejected, pending };
  }, [claims]);

  // Claims by zone (city)
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of claims) {
      const city = c.live_disruption_events?.city || c.profiles?.city || 'Unknown';
      counts[city] = (counts[city] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [claims]);

  const zoneMax = zoneCounts.length > 0 ? zoneCounts[0][1] : 1;

  // Claims by month
  const monthlyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of claims) {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    return sorted;
  }, [claims]);

  const monthlyMax = monthlyCounts.length > 0 ? Math.max(...monthlyCounts.map((m) => m[1])) : 1;

  // Claims by season
  const seasonCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of claims) {
      const d = new Date(c.created_at);
      const monthName = MONTHS[d.getMonth()];
      const season = SEASONS[monthName] || 'Unknown';
      counts[season] = (counts[season] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [claims]);

  // Flagged claims
  const flaggedClaims = useMemo(() => claims.filter((c) => c.is_flagged), [claims]);

  // Filtered claims
  const filteredClaims = useMemo(() => {
    if (filterStatus === 'all') return claims;
    if (filterStatus === 'flagged') return claims.filter((c) => c.is_flagged);
    return claims.filter((c) => c.status === filterStatus);
  }, [claims, filterStatus]);

  /* --- Review handler --- */

  async function handleReview(claimId: string, action: 'approve' | 'reject') {
    setReviewingId(claimId);
    try {
      const res = await fetch('/api/admin/review-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: claimId, action }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || 'Review failed');
      }
      // Reload
      await loadClaims();
    } catch (err) {
      console.error('Review error:', err);
    } finally {
      setReviewingId(null);
    }
  }

  /* --- Fraud Score Gauge --- */

  function FraudGauge({ score, wide }: { score: number; wide?: boolean }) {
    const pct = Math.min(score * 100, 100);
    const color = score >= 0.7 ? '#dc2626' : score >= 0.3 ? '#f59e0b' : '#22C55E';
    return (
      <div className="flex items-center gap-2">
        <div className={`${wide ? 'w-20' : 'w-16'} h-2 rounded-full`} style={{ background: '#F3F4F6' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="serif text-xs font-bold" style={{ color }}>{(score * 100).toFixed(0)}%</span>
      </div>
    );
  }

  /* --- Area Chart Helper --- */

  function buildAreaChart(data: [string, number][], max: number) {
    if (data.length === 0) return null;
    const padX = 30;
    const padTop = 10;
    const padBottom = 20;
    const chartW = 400 - padX * 2;
    const chartH = 100 - padTop - padBottom;

    const points = data.map(([, count], i) => ({
      x: padX + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
      y: padTop + chartH - (count / max) * chartH,
    }));

    // Build smooth bezier path
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
      linePath += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const areaPath = linePath + ` L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;

    return { points, linePath, areaPath, padX, padTop, padBottom, chartW, chartH };
  }

  /* --- Season Ring Helper --- */

  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const rad = (a: number) => ((a - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  /* --- Loading / Error --- */

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em' }}>Claim Center</h1>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid #dc2626' }}>
          <p className="font-medium" style={{ color: '#dc2626' }}>Failed to load data</p>
          <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{error}</p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Claims', value: kpis.total, gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)', glow: 'rgba(99,102,241,0.35)' },
    { label: 'Paid', value: kpis.paid, gradient: 'linear-gradient(135deg, #14B8A6, #22C55E)', glow: 'rgba(20,184,166,0.35)' },
    { label: 'Rejected', value: kpis.rejected, gradient: 'linear-gradient(135deg, #F87171, #EC4899)', glow: 'rgba(248,113,113,0.35)' },
    { label: 'Pending', value: kpis.pending, gradient: 'linear-gradient(135deg, #F97316, #FACC15)', glow: 'rgba(249,115,22,0.35)' },
  ];

  // Season chart data
  const seasonColors: Record<string, string> = {
    Monsoon: '#3B82F6',
    Winter: '#8B5CF6',
    'Pre-Monsoon': '#FACC15',
    'Post-Monsoon': '#A78BFA',
  };
  const seasonOrder = ['Monsoon', 'Pre-Monsoon', 'Post-Monsoon', 'Winter'];
  const seasonTotal = seasonCounts.reduce((sum, [, c]) => sum + c, 0) || 1;
  const seasonRadii = [68, 56, 44, 32]; // outer to inner for each season in seasonOrder
  const strokeW = 9;

  // Area chart data
  const areaData = buildAreaChart(monthlyCounts, monthlyMax);

  // Status badge helper
  function statusBadgeStyle(status: string): { background: string; color: string } {
    const s = status.toLowerCase();
    if (s === 'paid' || s === 'approved') return { background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: '#fff' };
    if (s === 'pending_review' || s === 'gate1_passed' || s === 'gate2_passed') return { background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' };
    if (s === 'rejected') return { background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff' };
    return { background: 'linear-gradient(135deg, #6B7280, #4B5563)', color: '#fff' };
  }

  return (
    <div className="space-y-6">
      {/* --- Animation Styles --- */}
      <style>{`
        @keyframes riskSlideIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .risk-slide {
          animation: riskSlideIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        .risk-slide-d1 { animation-delay: 0.05s; }
        .risk-slide-d2 { animation-delay: 0.12s; }
        .risk-slide-d3 { animation-delay: 0.19s; }
        .risk-slide-d4 { animation-delay: 0.26s; }
        .risk-slide-d5 { animation-delay: 0.33s; }
        .risk-slide-d6 { animation-delay: 0.40s; }
        @keyframes ringGrow { from { stroke-dashoffset: var(--ring-len); } to { stroke-dashoffset: 0; } }
      `}</style>

      {/* Tooltip */}
      {tip.visible && (
        <div style={{position:'fixed',left:tip.x+12,top:tip.y+12,background:'linear-gradient(135deg, #1e1b4b, #312e81)',color:'#fff',borderRadius:8,padding:'8px 12px',fontSize:12,fontFamily:'monospace',boxShadow:'0 4px 20px rgba(99,102,241,0.35)',pointerEvents:'none',zIndex:9999,maxWidth:220}}>
          {tip.content.map((line,i)=><div key={i}>{line}</div>)}
        </div>
      )}

      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: "var(--font-inter),'Inter',sans-serif" }}>Claim Center</h1>

      {/* --- KPI Tiles --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 risk-slide risk-slide-d2">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: kpi.gradient,
              borderRadius: 16,
              padding: 20,
              transition: 'all 0.25s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 30px ${kpi.glow}`; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ position: 'absolute', top: -15, right: -15, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
            <p className="mono text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.75)' }}>{kpi.label}</p>
            <p className="serif text-3xl font-bold mt-2" style={{ color: '#fff' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* --- Claims Analytics Charts --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 risk-slide risk-slide-d3">
        {/* By Zone */}
        <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.04))', border: '1px solid #E8E8EA', borderRadius: 16, padding: 20, transition: 'all 0.2s ease' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(99,102,241,0.08)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
          <p className="mono text-xs uppercase tracking-wide mb-3" style={{ color: '#6B7280' }}>Claims by Zone</p>
          <div className="space-y-2">
            {zoneCounts.slice(0, 7).map(([zone, count]) => (
              <div key={zone} className="flex items-center gap-2">
                <span className="mono text-xs w-20 truncate" style={{ color: '#6B7280' }}>{zone}</span>
                <div className="flex-1 h-4 rounded" style={{ background: '#F3F4F6' }}>
                  <div className="h-full rounded" style={{ width: `${(count / zoneMax) * 100}%`, background: '#8B5CF6', minWidth: 4, transition: 'all 0.15s ease', cursor: 'pointer', transformOrigin: 'left' }} onMouseOver={e => { e.currentTarget.style.transform = 'scaleX(1.02)'; e.currentTarget.style.opacity = '0.85'; }} onMouseOut={e => { e.currentTarget.style.transform = 'scaleX(1)'; e.currentTarget.style.opacity = '1'; }} onMouseEnter={e => showTip(e, [`Zone: ${zone}`, `Claims: ${count}`])} onMouseMove={moveTip} onMouseLeave={hideTip} />
                </div>
                <span className="serif text-xs font-medium w-6 text-right" style={{ color: '#1A1A1A' }}>{count}</span>
              </div>
            ))}
            {zoneCounts.length === 0 && <p className="text-xs" style={{ color: '#9CA3AF' }}>No data</p>}
          </div>
        </div>

        {/* By Month - Area Chart */}
        <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(6,182,212,0.04))', border: '1px solid #E8E8EA', borderRadius: 16, padding: 20, transition: 'all 0.2s ease' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(99,102,241,0.08)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
          <p className="mono text-xs uppercase tracking-wide mb-3" style={{ color: '#6B7280' }}>Claims by Month</p>
          {areaData ? (
            <svg viewBox="0 0 400 100" width="100%" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaData.areaPath} fill="url(#areaGrad)" />
              <path d={areaData.linePath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {areaData.points.map((pt, i) => {
                const monthIdx = parseInt(monthlyCounts[i][0].split('-')[1], 10);
                const label = MONTHS[monthIdx] || monthlyCounts[i][0];
                const count = monthlyCounts[i][1];
                return (
                  <g key={i}>
                    <circle
                      cx={pt.x} cy={pt.y} r={4}
                      fill="#3B82F6" stroke="#fff" strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => showTip(e, [`Month: ${label}`, `Claims: ${count}`])}
                      onMouseMove={moveTip}
                      onMouseLeave={hideTip}
                    />
                    <text x={pt.x} y={areaData.padTop + areaData.chartH + 14} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="monospace">{label}</text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <p className="text-xs w-full text-center" style={{ color: '#9CA3AF' }}>No data</p>
          )}
        </div>

        {/* By Season - Donut Rings */}
        <div style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.04), rgba(139,92,246,0.04))', border: '1px solid #E8E8EA', borderRadius: 16, padding: 20, transition: 'all 0.2s ease' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(99,102,241,0.08)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
          <p className="mono text-xs uppercase tracking-wide mb-3" style={{ color: '#6B7280' }}>Claims by Season</p>
          {seasonCounts.length > 0 ? (
            <div className="flex items-center gap-4">
              <svg viewBox="0 0 160 160" width="120" height="120">
                {seasonOrder.map((season, si) => {
                  const r = seasonRadii[si];
                  const circumference = 2 * Math.PI * r;
                  const count = seasonCounts.find(([s]) => s === season)?.[1] || 0;
                  const ratio = count / seasonTotal;
                  const dashLen = ratio * circumference;
                  const color = seasonColors[season] || '#8B5CF6';
                  return (
                    <g key={season}>
                      <circle cx="80" cy="80" r={r} fill="none" stroke="#F3F4F6" strokeWidth={strokeW} />
                      <circle
                        cx="80" cy="80" r={r}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeW}
                        strokeLinecap="round"
                        strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                        strokeDashoffset="0"
                        transform="rotate(-90 80 80)"
                        style={{
                          '--ring-len': `${dashLen}`,
                          animation: `ringGrow 1s cubic-bezier(0.22,1,0.36,1) both`,
                          animationDelay: `${si * 0.15}s`,
                          cursor: 'pointer',
                        } as React.CSSProperties}
                        onMouseEnter={e => showTip(e, [`Season: ${season}`, `Claims: ${count}`, `${(ratio * 100).toFixed(1)}%`])}
                        onMouseMove={moveTip}
                        onMouseLeave={hideTip}
                      />
                    </g>
                  );
                })}
              </svg>
              <div className="flex flex-col gap-2">
                {seasonOrder.map((season) => {
                  const count = seasonCounts.find(([s]) => s === season)?.[1] || 0;
                  const color = seasonColors[season] || '#8B5CF6';
                  return (
                    <div key={season} className="flex items-center gap-2">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span className="mono text-xs" style={{ color: '#6B7280' }}>{season}</span>
                      <span className="serif text-xs font-medium" style={{ color: '#1A1A1A' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: '#9CA3AF' }}>No data</p>
          )}
        </div>
      </div>

      {/* --- Fraud Detection Panel --- */}
      <div className="overflow-hidden risk-slide risk-slide-d4" style={{ background: '#ffffff', border: '1px solid #E8E8EA', borderRadius: 16 }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E8E8EA' }}>
          <div>
            <h2 className="serif text-lg font-bold" style={{ color: '#1A1A1A' }}>Fraud Detection</h2>
            <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
              {flaggedClaims.length} flagged claim{flaggedClaims.length !== 1 ? 's' : ''} requiring review
            </p>
          </div>
          {flaggedClaims.length > 0 && (
            <span
              className="mono text-xs font-medium px-3 py-1.5 rounded-full blink"
              style={{ background: 'linear-gradient(135deg, #F87171, #EC4899)', color: '#fff', transition: 'transform 0.15s ease', display: 'inline-block' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {flaggedClaims.length} flagged
            </span>
          )}
        </div>
        {flaggedClaims.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ background: '#F6F7F9', color: '#6B7280' }}>
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Event Type</th>
                  <th className="px-4 py-3 font-medium">Fraud Score</th>
                  <th className="px-4 py-3 font-medium">Flag Reason</th>
                  <th className="px-4 py-3 font-medium">Signals</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flaggedClaims.map((claim, idx) => {
                  const eventType = claim.live_disruption_events?.event_type as DisruptionType | undefined;
                  const triggerLabel = eventType ? TRIGGERS[eventType]?.label : 'Unknown';
                  const signals = Object.entries(claim.fraud_signals || {})
                    .filter(([, v]) => v)
                    .map(([k]) => k.replace(/_/g, ' '));
                  const isReviewing = reviewingId === claim.id;
                  const rowGrad = ROW_GRADIENTS[idx % ROW_GRADIENTS.length];
                  const nameColor = ROW_NAME_COLORS[idx % ROW_NAME_COLORS.length];

                  return (
                    <tr key={claim.id} className="admin-row" style={{ borderTop: '1px solid #F3F4F6', background: rowGrad, transition: 'background 0.15s ease', cursor: 'pointer' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: nameColor }}>
                        {claim.profiles?.full_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#6B7280' }}>
                        {triggerLabel}
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>{claim.live_disruption_events?.city}</div>
                      </td>
                      <td className="px-4 py-3">
                        <FraudGauge score={claim.fraud_score} wide />
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[180px] truncate" style={{ color: '#6B7280' }}>
                        {claim.flag_reason || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {signals.map((s) => (
                            <span
                              key={s}
                              className="mono text-xs px-1.5 py-0.5 rounded"
                              style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(236,72,153,0.1))', color: '#DC2626', transition: 'transform 0.15s ease', display: 'inline-block' }}
                              onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                              onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(claim.status === 'pending_review' || claim.is_flagged) &&
                         claim.status !== 'approved' && claim.status !== 'rejected' && claim.status !== 'paid' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleReview(claim.id, 'approve')}
                              disabled={isReviewing}
                              className="text-xs text-white px-3 py-1 rounded-lg disabled:opacity-50 transition-colors"
                              style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', transition: 'all 0.2s ease' }}
                              onMouseOver={e => { if (!isReviewing) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(34,197,94,0.3)'; } }}
                              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              {isReviewing ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReview(claim.id, 'reject')}
                              disabled={isReviewing}
                              className="text-xs text-white px-3 py-1 rounded-lg disabled:opacity-50 transition-colors"
                              style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', transition: 'all 0.2s ease' }}
                              onMouseOver={e => { if (!isReviewing) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(192,57,43,0.3)'; } }}
                              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              {isReviewing ? '...' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center" style={{ color: '#9CA3AF' }}>
            No flagged claims - all clear
          </div>
        )}
      </div>

      {/* --- Claims Table --- */}
      <div className="overflow-hidden risk-slide risk-slide-d5" style={{ background: '#ffffff', border: '1px solid #E8E8EA', borderRadius: 16 }}>
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderBottom: '1px solid #E8E8EA' }}>
          <h2 className="serif text-lg font-bold" style={{ color: '#1A1A1A' }}>All Claims</h2>
          <div className="flex gap-2 flex-wrap">
            {['all', 'paid', 'pending_review', 'rejected', 'flagged'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className="mono text-xs px-3 py-1.5 rounded-full transition-colors"
                style={{
                  ...(filterStatus === status
                    ? { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff', border: '1px solid #8B5CF6' }
                    : { border: '1px solid #E8E8EA', color: '#6B7280', background: 'transparent' }),
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {status === 'all' ? 'All' : status === 'pending_review' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))', color: '#6B7280' }}>
                <th className="px-4 py-3 font-medium">Claim ID</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Event Type</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Fraud Score</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim, idx) => {
                const eventType = claim.live_disruption_events?.event_type as DisruptionType | undefined;
                const triggerLabel = eventType ? TRIGGERS[eventType]?.label : 'Unknown';
                const date = new Date(claim.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                });
                const shortId = `SS-CLM-${claim.id.slice(-4).toUpperCase()}`;
                const rowGrad = ROW_GRADIENTS[idx % ROW_GRADIENTS.length];
                const cityColor = CITY_COLORS[idx % CITY_COLORS.length];
                const sBadge = statusBadgeStyle(claim.status);

                return (
                  <tr
                    key={claim.id}
                    className="admin-row"
                    style={{
                      borderTop: '1px solid #F3F4F6',
                      background: rowGrad,
                      transition: 'background 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <td className="mono px-4 py-3 text-xs font-medium" style={{ color: '#1A1A1A' }}>{shortId}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: '#1A1A1A' }}>
                      {claim.profiles?.full_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#6B7280' }}>{triggerLabel}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: cityColor }}>
                      {claim.live_disruption_events?.city || claim.profiles?.city || '-'}
                    </td>
                    <td className="serif px-4 py-3 font-bold" style={{ color: '#4F46E5' }}>
                      &#8377;{Number(claim.payout_amount_inr).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="mono text-xs font-medium px-2 py-1 rounded-full" style={{ background: sBadge.background, color: sBadge.color, transition: 'transform 0.15s ease', display: 'inline-block' }} onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                        {claim.status.replace(/_/g, ' ')}
                      </span>
                      {claim.is_flagged && (
                        <span
                          className="mono ml-1 text-xs font-medium px-2 py-1 rounded-full"
                          style={{ background: 'linear-gradient(135deg, #F87171, #EC4899)', color: '#fff', transition: 'transform 0.15s ease', display: 'inline-block' }}
                          onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                          onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          flagged
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <FraudGauge score={claim.fraud_score} wide />
                    </td>
                    <td className="mono px-4 py-3 text-xs" style={{ color: '#6B7280' }}>{date}</td>
                  </tr>
                );
              })}
              {filteredClaims.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>
                    No claims found
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
