'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

/* ---------- Types ---------- */

interface PolicyRow {
  id: string;
  profile_id: string;
  week_start_date: string;
  final_premium_inr: number;
  payment_status: string;
  total_payout_this_week: number;
  created_at: string;
}

interface ClaimRow {
  id: string;
  payout_amount_inr: number;
  status: string;
  created_at: string;
  live_disruption_events: { city: string } | null;
}

interface PayoutRow {
  id: string;
  amount_inr: number;
  status: string;
  completed_at: string | null;
  created_at: string;
}

/* ---------- Skeleton ---------- */

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: '#F3F4F6' }}
    />
  );
}

/* ---------- Tooltip Component ---------- */

function Tooltip({ x, y, content, visible }: { x: number; y: number; content: string[]; visible: boolean }) {
  if (!visible || content.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: x + 12,
        top: y - 10,
        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        color: '#ffffff',
        borderRadius: 8,
        fontSize: 12,
        fontFamily: 'monospace',
        padding: '8px 12px',
        pointerEvents: 'none',
        zIndex: 9999,
        whiteSpace: 'nowrap',
        boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
        border: '1px solid rgba(139,92,246,0.3)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 3,
      }}
    >
      {content.map((line, i) => (
        <span key={i}>{line}</span>
      ))}
    </div>
  );
}

/* ---------- Helpers ---------- */

function formatINR(n: number): string {
  if (n >= 100000) return `\u20B9${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `\u20B9${(n / 1000).toFixed(1)}k`;
  return `\u20B9${n.toLocaleString()}`;
}

function trendArrow(current: number, previous: number): { arrow: string; pct: string; up: boolean } {
  if (previous === 0) return { arrow: '-', pct: '0%', up: true };
  const change = ((current - previous) / previous) * 100;
  return {
    arrow: change >= 0 ? '\u2191' : '\u2193',
    pct: `${Math.abs(change).toFixed(1)}%`,
    up: change >= 0,
  };
}

/* ---------- Page ---------- */

export default function AdminBillingPage() {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tip, setTip] = useState<{x:number;y:number;content:string[];visible:boolean}>({x:0,y:0,content:[],visible:false});
  function showTip(e: React.MouseEvent, content: string[]) { setTip({x:e.clientX,y:e.clientY,content,visible:true}); }
  function moveTip(e: React.MouseEvent) { setTip(prev=>({...prev,x:e.clientX,y:e.clientY})); }
  function hideTip() { setTip(prev=>({...prev,visible:false})); }

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const [policiesRes, claimsRes, payoutsRes] = await Promise.all([
          supabase.from('weekly_policies').select('*').order('created_at', { ascending: false }),
          supabase.from('parametric_claims').select('*, live_disruption_events(city)').order('created_at', { ascending: false }),
          supabase.from('payout_ledger').select('*').order('created_at', { ascending: false }),
        ]);

        if (policiesRes.error) throw policiesRes.error;
        if (claimsRes.error) throw claimsRes.error;
        if (payoutsRes.error) throw payoutsRes.error;

        setPolicies((policiesRes.data as unknown as PolicyRow[]) || []);
        setClaims((claimsRes.data as unknown as ClaimRow[]) || []);
        setPayouts((payoutsRes.data as unknown as PayoutRow[]) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load billing data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* --- KPI Calculations --- */

  const totalPremiums = useMemo(() => {
    return policies
      .filter((p) => p.payment_status === 'paid' || p.payment_status === 'demo')
      .reduce((sum, p) => sum + Number(p.final_premium_inr), 0);
  }, [policies]);

  const totalPayouts = useMemo(() => {
    return claims
      .filter((c) => c.status === 'paid' || c.status === 'approved')
      .reduce((sum, c) => sum + Number(c.payout_amount_inr), 0);
  }, [claims]);

  const lossRatio = totalPremiums > 0 ? totalPayouts / totalPremiums : 0;

  const totalClaimsAmount = useMemo(() => {
    return claims.reduce((sum, c) => sum + Number(c.payout_amount_inr), 0);
  }, [claims]);

  const bcr = totalPremiums > 0 ? totalClaimsAmount / totalPremiums : 0;

  const failedPayments = useMemo(() => {
    return policies.filter((p) => p.payment_status === 'failed').length;
  }, [policies]);

  /* --- Weekly data for trends --- */

  const weeklyData = useMemo(() => {
    // Group policies by week
    const weekPremiums: Record<string, number> = {};
    for (const p of policies) {
      if (p.payment_status === 'paid' || p.payment_status === 'demo') {
        const week = p.week_start_date;
        weekPremiums[week] = (weekPremiums[week] || 0) + Number(p.final_premium_inr);
      }
    }

    // Group claims by week
    const weekPayouts: Record<string, number> = {};
    for (const c of claims) {
      if (c.status === 'paid' || c.status === 'approved') {
        const d = new Date(c.created_at);
        const dayOfWeek = d.getDay();
        const mondayDate = new Date(d);
        mondayDate.setDate(d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        const week = mondayDate.toISOString().split('T')[0];
        weekPayouts[week] = (weekPayouts[week] || 0) + Number(c.payout_amount_inr);
      }
    }

    // Combine
    const allWeeks = [...new Set([...Object.keys(weekPremiums), ...Object.keys(weekPayouts)])].sort();
    const last8 = allWeeks.slice(-8);

    return last8.map((week) => ({
      week,
      premiums: weekPremiums[week] || 0,
      payouts: weekPayouts[week] || 0,
      lossRatio: (weekPremiums[week] || 0) > 0
        ? (weekPayouts[week] || 0) / (weekPremiums[week] || 1)
        : 0,
    }));
  }, [policies, claims]);

  /* --- Monthly payouts --- */

  const monthlyPayouts = useMemo(() => {
    const months: Record<string, number> = {};
    for (const p of payouts) {
      if (p.status === 'completed' || p.status === 'success') {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        months[key] = (months[key] || 0) + Number(p.amount_inr);
      }
    }
    // Also count from claims if payout_ledger is empty
    if (Object.keys(months).length === 0) {
      for (const c of claims) {
        if (c.status === 'paid' || c.status === 'approved') {
          const d = new Date(c.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
          months[key] = (months[key] || 0) + Number(c.payout_amount_inr);
        }
      }
    }
    return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [payouts, claims]);

  const monthlyMax = monthlyPayouts.length > 0 ? Math.max(...monthlyPayouts.map((m) => m[1])) : 1;

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* --- Zone-wise payout breakdown --- */

  const zonePayouts = useMemo(() => {
    const zones: Record<string, number> = {};
    for (const c of claims) {
      if (c.status === 'paid' || c.status === 'approved') {
        const city = c.live_disruption_events?.city || 'Unknown';
        zones[city] = (zones[city] || 0) + Number(c.payout_amount_inr);
      }
    }
    const total = Object.values(zones).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(zones)
      .sort((a, b) => b[1] - a[1])
      .map(([city, amount]) => ({ city, amount, pct: (amount / total) * 100 }));
  }, [claims]);

  const zoneMax = zonePayouts.length > 0 ? zonePayouts[0].amount : 1;

  /* --- Premium vs Payout weekly --- */

  const weeklyMaxVal = useMemo(() => {
    if (weeklyData.length === 0) return 1;
    return Math.max(...weeklyData.map((w) => Math.max(w.premiums, w.payouts)), 1);
  }, [weeklyData]);

  /* --- Failed policies list --- */
  const failedPolicies = useMemo(() => {
    return policies.filter((p) => p.payment_status === 'failed');
  }, [policies]);

  /* --- Trend calculations (compare last 2 weeks) --- */
  const trends = useMemo(() => {
    if (weeklyData.length < 2) {
      return { premiums: { arrow: '-', pct: '0%', up: true }, payouts: { arrow: '-', pct: '0%', up: true }, lr: { arrow: '-', pct: '0%', up: true } };
    }
    const curr = weeklyData[weeklyData.length - 1];
    const prev = weeklyData[weeklyData.length - 2];
    return {
      premiums: trendArrow(curr.premiums, prev.premiums),
      payouts: trendArrow(curr.payouts, prev.payouts),
      lr: trendArrow(curr.lossRatio, prev.lossRatio),
    };
  }, [weeklyData]);

  /* --- Revenue Donut data --- */
  const netRevenue = totalPremiums - totalPayouts;
  const donutData = useMemo(() => {
    const total = totalPremiums || 1;
    const payoutPct = (totalPayouts / total) * 100;
    const netPct = Math.max(((totalPremiums - totalPayouts) / total) * 100, 0);
    const failedAmt = policies.filter(p => p.payment_status === 'failed').reduce((s, p) => s + Number(p.final_premium_inr), 0);
    const failedPct = (failedAmt / total) * 100;
    return { payoutPct, netPct, failedPct, failedAmt };
  }, [totalPremiums, totalPayouts, policies]);

  /* --- Loading / Error --- */

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="serif text-2xl font-bold">Billing Center</h1>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid #dc2626' }}>
          <p className="font-medium" style={{ color: '#dc2626' }}>Failed to load data</p>
          <p className="text-sm mt-1" style={{ color: '#dc2626' }}>{error}</p>
        </div>
      </div>
    );
  }

  /* --- BCR Gauge helpers --- */

  const bcrClamped = Math.min(bcr, 1.0);
  const bcrAngle = bcrClamped / 1.0 * 180;
  const bcrColor = bcr <= 0.70 ? '#22C55E' : bcr <= 0.85 ? '#f59e0b' : '#ef4444';
  const bcrStatus = bcr <= 0.55 ? 'Healthy' : bcr <= 0.70 ? 'Healthy' : bcr <= 0.85 ? 'Watch' : 'Critical';

  /* --- Loss Ratio accent --- */
  const lrColor = lossRatio <= 0.70 ? '#22C55E' : lossRatio <= 0.85 ? '#f59e0b' : '#ef4444';

  /* --- Card style helper --- */
  const card: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #E8E8EA',
    borderRadius: 16,
    transition: 'box-shadow 0.3s ease',
  };

  const cardHoverShadow = '0 8px 25px rgba(99,102,241,0.08)';

  /* --- SVG Gauge arc helper --- */
  const gaugeRadius = 90;
  const gaugeCx = 110;
  const gaugeCy = 115;
  function arcPath(startFrac: number, endFrac: number): string {
    const startAngle = Math.PI + startFrac * Math.PI;
    const endAngle = Math.PI + endFrac * Math.PI;
    const x1 = gaugeCx + gaugeRadius * Math.cos(startAngle);
    const y1 = gaugeCy + gaugeRadius * Math.sin(startAngle);
    const x2 = gaugeCx + gaugeRadius * Math.cos(endAngle);
    const y2 = gaugeCy + gaugeRadius * Math.sin(endAngle);
    const largeArc = (endFrac - startFrac) > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${gaugeRadius} ${gaugeRadius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }
  function scaleLabelPos(frac: number): { x: number; y: number } {
    const angle = Math.PI + frac * Math.PI;
    const r = gaugeRadius + 14;
    return { x: gaugeCx + r * Math.cos(angle), y: gaugeCy + r * Math.sin(angle) };
  }

  /* --- Zone bar palette --- */
  const zoneBarGradients = [
    'linear-gradient(to right, #6366F1, #818CF8)',
    'linear-gradient(to right, #EC4899, #F9A8D4)',
    'linear-gradient(to right, #14B8A6, #5EEAD4)',
    'linear-gradient(to right, #F97316, #FDBA74)',
    'linear-gradient(to right, #8B5CF6, #C4B5FD)',
    'linear-gradient(to right, #3B82F6, #93C5FD)',
  ];
  const zoneBarStartColors = ['#6366F1', '#EC4899', '#14B8A6', '#F97316', '#8B5CF6', '#3B82F6'];

  /* --- Table row tint palette --- */
  const rowTintPalette = [
    'linear-gradient(90deg, rgba(99,102,241,0.04), rgba(139,92,246,0.02))',
    'linear-gradient(90deg, rgba(236,72,153,0.04), rgba(249,168,212,0.02))',
    'linear-gradient(90deg, rgba(20,184,166,0.04), rgba(94,234,212,0.02))',
    'linear-gradient(90deg, rgba(249,115,22,0.04), rgba(253,186,116,0.02))',
    'linear-gradient(90deg, rgba(139,92,246,0.04), rgba(196,181,253,0.02))',
    'linear-gradient(90deg, rgba(59,130,246,0.04), rgba(147,197,253,0.02))',
  ];

  return (
    <div className="adm-s space-y-6">
      <Tooltip x={tip.x} y={tip.y} content={tip.content} visible={tip.visible} />
      <style>{`
        @keyframes growBar {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        @keyframes growBarX {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes riskSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .risk-slide {
          animation: riskSlideIn 0.5s ease both;
        }
        .bar-grow {
          animation: growBar 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          transform-origin: bottom;
        }
        .bar-grow-x {
          animation: growBarX 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          transform-origin: left;
        }
        .fade-up {
          animation: fadeUp 0.5s ease-out forwards;
        }
        .kpi-card {
          transition: transform 0.2s ease, box-shadow 0.3s ease;
        }
        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(99,102,241,0.25);
        }
      `}</style>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: "var(--font-inter),'Inter',sans-serif" }}>Billing Analytics</h1>

      {/* ====== Section 1: KPI Summary Row ====== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Premiums Collected */}
        <div
          className="kpi-card p-5 risk-slide"
          style={{
            background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
            borderRadius: 16,
            animationDelay: '0.05s',
          }}
        >
          <p className="mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Premiums Collected
          </p>
          <p className="serif text-[26px] font-bold mt-2 leading-none" style={{ color: '#ffffff' }}>
            {formatINR(totalPremiums)}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className="mono text-xs font-semibold"
              style={{ color: trends.premiums.up ? 'rgba(167,255,200,0.95)' : 'rgba(255,180,180,0.95)' }}
            >
              {trends.premiums.arrow} {trends.premiums.pct}
            </span>
            <span className="mono text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>vs last week</span>
          </div>
        </div>

        {/* Total Payouts */}
        <div
          className="kpi-card p-5 risk-slide"
          style={{
            background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
            borderRadius: 16,
            animationDelay: '0.1s',
          }}
        >
          <p className="mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Total Payouts
          </p>
          <p className="serif text-[26px] font-bold mt-2 leading-none" style={{ color: '#ffffff' }}>
            {formatINR(totalPayouts)}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className="mono text-xs font-semibold"
              style={{ color: trends.payouts.up ? 'rgba(255,180,180,0.95)' : 'rgba(167,255,200,0.95)' }}
            >
              {trends.payouts.arrow} {trends.payouts.pct}
            </span>
            <span className="mono text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>vs last week</span>
          </div>
        </div>

        {/* Net Revenue */}
        <div
          className="kpi-card p-5 risk-slide"
          style={{
            background: netRevenue >= 0
              ? 'linear-gradient(135deg, #14B8A6, #22C55E)'
              : 'linear-gradient(135deg, #F87171, #EC4899)',
            borderRadius: 16,
            animationDelay: '0.15s',
          }}
        >
          <p className="mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Net Revenue
          </p>
          <p className="serif text-[26px] font-bold mt-2 leading-none" style={{ color: '#ffffff' }}>
            {netRevenue >= 0 ? '' : '-'}{formatINR(Math.abs(netRevenue))}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className="mono text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
              }}
            >
              {netRevenue >= 0 ? 'Profitable' : 'Loss'}
            </span>
          </div>
        </div>

        {/* Loss Ratio */}
        <div
          className="kpi-card p-5 risk-slide"
          style={{
            background: 'linear-gradient(135deg, #F97316, #FACC15)',
            borderRadius: 16,
            animationDelay: '0.2s',
          }}
        >
          <p className="mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Loss Ratio
          </p>
          <p className="serif text-[26px] font-bold mt-2 leading-none" style={{ color: '#ffffff' }}>
            {(lossRatio * 100).toFixed(1)}%
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className="mono text-xs font-semibold"
              style={{ color: trends.lr.up ? 'rgba(255,180,180,0.95)' : 'rgba(167,255,200,0.95)' }}
            >
              {trends.lr.arrow} {trends.lr.pct}
            </span>
            <span className="mono text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>vs last week</span>
          </div>
        </div>

        {/* Burning Cost Rate */}
        <div
          className="kpi-card p-5 risk-slide"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            borderRadius: 16,
            animationDelay: '0.25s',
          }}
        >
          <p className="mono text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Burning Cost Rate
          </p>
          <p className="serif text-[26px] font-bold mt-2 leading-none" style={{ color: '#ffffff' }}>
            {bcr.toFixed(3)}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className="mono text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
              }}
            >
              {bcrStatus}
            </span>
          </div>
        </div>
      </div>

      {/* ====== Section 2: BCR Ring (left) + Monthly Payouts (right) ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BCR — circular progress ring */}
        <div
          className="p-5 risk-slide"
          style={{ ...card, animationDelay: '0.3s' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = cardHoverShadow; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <p className="mono text-[10px] uppercase tracking-widest mb-4" style={{ color: '#9CA3AF' }}>Burning Cost Rate</p>
          <div className="flex items-center gap-6">
            {/* Ring SVG */}
            <div
              style={{ flexShrink: 0, cursor: 'pointer', transition: 'filter 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'drop-shadow(0 0 10px rgba(99,102,241,0.3))'; showTip(e, [`BCR: ${bcr.toFixed(3)}`, `Status: ${bcrStatus}`, `Target: 0.55 - 0.70`, `Claims: ${formatINR(totalClaimsAmount)}`, `Premiums: ${formatINR(totalPremiums)}`]); }}
              onMouseMove={moveTip}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none'; hideTip(); }}
            >
              {(() => {
                const size = 120, strokeW = 10, r = (size - strokeW) / 2, circ = 2 * Math.PI * r;
                const filled = bcrClamped * circ;
                return (
                  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={strokeW} />
                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bcrColor} strokeWidth={strokeW}
                      strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                      transform={`rotate(-90 ${size/2} ${size/2})`}
                      style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s ease' }}
                    />
                    <text x={size/2} y={size/2 - 6} textAnchor="middle" dominantBaseline="middle" fill={bcrColor} fontSize={22} fontWeight={800} fontFamily="var(--font-inter),'Inter',sans-serif" style={{ transition: 'fill 0.5s' }}>
                      {bcr.toFixed(2)}
                    </text>
                    <text x={size/2} y={size/2 + 14} textAnchor="middle" fill="#9CA3AF" fontSize={9} fontFamily="monospace">
                      BCR
                    </text>
                  </svg>
                );
              })()}
            </div>
            {/* Right info */}
            <div style={{ flex: 1 }}>
              <span className="mono text-[10px] inline-block px-3 py-1 rounded-full font-semibold" style={{ background: bcr <= 0.70 ? 'rgba(34,197,94,0.1)' : bcr <= 0.85 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: bcrColor }}>{bcrStatus}</span>
              <p className="mono text-[10px] mt-3" style={{ color: '#9CA3AF' }}>Target: 0.55 – 0.70</p>
              {/* Breakdown bars */}
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Claims', value: totalClaimsAmount, color: '#EC4899', max: Math.max(totalClaimsAmount, totalPremiums, 1) },
                  { label: 'Premiums', value: totalPremiums, color: '#6366F1', max: Math.max(totalClaimsAmount, totalPremiums, 1) },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="mono text-[10px]" style={{ color: '#6B7280' }}>{item.label}</span>
                      <span className="mono text-[10px] font-bold" style={{ color: item.color }}>{formatINR(item.value)}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: item.color, width: `${(item.value / item.max) * 100}%`, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Payouts */}
        <div
          className="p-5 risk-slide"
          style={{ ...card, animationDelay: '0.35s' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = cardHoverShadow; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <p className="serif text-lg font-semibold" style={{ color: '#1A1A1A' }}>Monthly Payouts</p>
          <p className="mono text-[10px] uppercase tracking-widest mt-0.5 mb-4" style={{ color: '#9CA3AF' }}>
            Last {monthlyPayouts.length} months
          </p>
          {monthlyPayouts.length > 0 ? (
            <div className="flex items-end justify-around" style={{ height: 150 }}>
              {monthlyPayouts.map(([key, amount], i) => {
                const monthIdx = parseInt(key.split('-')[1], 10);
                const label = MONTH_NAMES[monthIdx] || key;
                const heightPx = Math.max((amount / monthlyMax) * 120, 6);
                return (
                  <div key={key} className="flex flex-col items-center" style={{ flex: '1 1 0', maxWidth: 64 }}>
                    <span className="mono text-[9px] font-semibold mb-1" style={{ color: '#14B8A6' }}>{formatINR(amount)}</span>
                    <div className="bar-grow w-full" style={{ height: heightPx, borderRadius: '4px 4px 0 0', background: 'linear-gradient(to top, #14B8A6, #5EEAD4)', maxWidth: 40, animationDelay: `${i * 0.12}s`, transition: 'opacity 0.15s, transform 0.15s', cursor: 'pointer', transformOrigin: 'bottom' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scaleY(1.03)'; showTip(e, [`Month: ${label}`, `Payout: ${formatINR(amount)}`]); }}
                      onMouseMove={moveTip}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scaleY(1)'; hideTip(); }}
                    />
                    <span className="mono text-[9px] mt-2 font-medium" style={{ color: '#9CA3AF' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-10" style={{ color: '#9CA3AF' }}><p className="mono text-sm">No payout data</p></div>
          )}
        </div>
      </div>

      {/* ====== Section 3: Premium vs Payouts Dual Bar Chart (8 weeks) ====== */}
      <div
        className="p-6 risk-slide"
        style={{ ...card, animationDelay: '0.4s' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = cardHoverShadow; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="serif text-lg font-semibold" style={{ color: '#1A1A1A' }}>Premium vs Payouts</p>
            <p className="mono text-[10px] uppercase tracking-widest mt-0.5" style={{ color: '#9CA3AF' }}>8-week comparison</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'linear-gradient(135deg, #6366F1, #818CF8)', display: 'inline-block' }} />
              <span className="mono text-[10px]" style={{ color: '#6B7280' }}>Premiums</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'linear-gradient(135deg, #EC4899, #F9A8D4)', display: 'inline-block' }} />
              <span className="mono text-[10px]" style={{ color: '#6B7280' }}>Payouts</span>
            </div>
          </div>
        </div>
        {weeklyData.length > 0 ? (
          <div className="flex items-end justify-center" style={{ gap: 16, height: 180 }}>
            {weeklyData.map((w, i) => {
              const premH = Math.max((w.premiums / weeklyMaxVal) * 140, 4);
              const payH = Math.max((w.payouts / weeklyMaxVal) * 140, 4);
              const d = new Date(w.week);
              const label = `${d.toLocaleDateString('en-IN', { month: 'short' })} ${d.getDate()}`;
              return (
                <div key={w.week} className="flex flex-col items-center" style={{ flex: '1 1 0', maxWidth: 80 }}>
                  {/* Amount labels */}
                  <div className="flex gap-1 mb-1">
                    <span className="mono text-[9px] font-medium" style={{ color: '#6366F1' }}>
                      {formatINR(w.premiums)}
                    </span>
                  </div>
                  {/* Bars */}
                  <div className="flex items-end" style={{ gap: 4, height: 140 }}>
                    <div
                      className="bar-grow"
                      style={{
                        width: 22,
                        height: premH,
                        borderRadius: '4px 4px 0 0',
                        background: 'linear-gradient(to top, #6366F1, #818CF8)',
                        animationDelay: `${i * 0.08}s`,
                        transition: 'opacity 0.15s ease, transform 0.15s ease',
                        cursor: 'pointer',
                        transformOrigin: 'bottom',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scaleY(1.03)'; showTip(e, [`Week: ${label}`, `Premium: ${formatINR(w.premiums)}`]); }}
                      onMouseMove={moveTip}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scaleY(1)'; hideTip(); }}
                    />
                    <div
                      className="bar-grow"
                      style={{
                        width: 22,
                        height: payH,
                        borderRadius: '4px 4px 0 0',
                        background: 'linear-gradient(to top, #EC4899, #F9A8D4)',
                        animationDelay: `${i * 0.08 + 0.04}s`,
                        transition: 'opacity 0.15s ease, transform 0.15s ease',
                        cursor: 'pointer',
                        transformOrigin: 'bottom',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scaleY(1.03)'; showTip(e, [`Week: ${label}`, `Payout: ${formatINR(w.payouts)}`]); }}
                      onMouseMove={moveTip}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scaleY(1)'; hideTip(); }}
                    />
                  </div>
                  {/* Week label */}
                  <span className="mono text-[10px] mt-2" style={{ color: '#9CA3AF' }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center py-12 mono text-sm" style={{ color: '#9CA3AF' }}>No weekly data available</p>
        )}
      </div>

      {/* ====== Section 4: Loss Ratio Trend — SVG area chart ====== */}
      <div
        className="p-6 risk-slide"
        style={{ ...card, animationDelay: '0.6s' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = cardHoverShadow; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="serif text-lg font-semibold" style={{ color: '#1A1A1A' }}>Loss Ratio Trend</p>
            <p className="mono text-[10px] uppercase tracking-widest mt-0.5" style={{ color: '#9CA3AF' }}>Weekly &middot; Target 70%</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5"><span style={{ width: 16, height: 3, borderRadius: 2, background: '#8B5CF6', display: 'inline-block' }} /><span className="mono text-[10px]" style={{ color: '#6B7280' }}>Loss Ratio</span></div>
            <div className="flex items-center gap-1.5"><span style={{ width: 16, height: 0, borderTop: '1.5px dashed #F59E0B', display: 'inline-block' }} /><span className="mono text-[10px]" style={{ color: '#6B7280' }}>Target 70%</span></div>
          </div>
        </div>
        {weeklyData.length > 0 ? (
          (() => {
            const W = 700, H = 160, PAD = 40;
            const pts = weeklyData.map((w, i) => ({
              x: PAD + (i / Math.max(weeklyData.length - 1, 1)) * (W - PAD * 2),
              y: H - 24 - Math.min(w.lossRatio, 1.0) * (H - 48),
            }));
            let line = `M ${pts[0].x} ${pts[0].y}`;
            for (let i = 1; i < pts.length; i++) { const mx = (pts[i-1].x + pts[i].x) / 2; line += ` C ${mx} ${pts[i-1].y} ${mx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`; }
            const area = `${line} L ${pts[pts.length-1].x} ${H - 24} L ${pts[0].x} ${H - 24} Z`;
            const targetY = H - 24 - 0.70 * (H - 48);
            return (
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
                <defs>
                  <linearGradient id="lr-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {/* Grid */}
                {[0.25, 0.5, 0.75].map(v => <line key={v} x1={PAD} y1={H - 24 - v * (H - 48)} x2={W - PAD} y2={H - 24 - v * (H - 48)} stroke="#F3F4F6" strokeWidth="1" />)}
                {/* Y labels */}
                {[0, 25, 50, 75, 100].map(v => <text key={v} x={PAD - 8} y={H - 24 - (v / 100) * (H - 48)} textAnchor="end" dominantBaseline="middle" fill="#9CA3AF" fontSize="9" fontFamily="monospace">{v}%</text>)}
                {/* Target line */}
                <line x1={PAD} y1={targetY} x2={W - PAD} y2={targetY} stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="6 4" />
                <text x={W - PAD + 4} y={targetY} dominantBaseline="middle" fill="#F59E0B" fontSize="9" fontFamily="monospace">70%</text>
                {/* Area + line */}
                <path d={area} fill="url(#lr-fill)" />
                <path d={line} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" />
                {/* Dots + hover zones */}
                {pts.map((p, i) => {
                  const w = weeklyData[i];
                  const dotColor = w.lossRatio <= 0.70 ? '#22C55E' : w.lossRatio <= 0.85 ? '#F59E0B' : '#EF4444';
                  const shortWeek = w.week.slice(5);
                  const colW = pts.length > 1 ? (W - PAD * 2) / (pts.length - 1) : W;
                  return (
                    <g key={i}>
                      <rect x={p.x - colW / 2} y={0} width={colW} height={H} fill="transparent" style={{ cursor: 'pointer' }}
                        onMouseEnter={e => showTip(e as unknown as React.MouseEvent, [`Week: ${shortWeek}`, `Loss Ratio: ${(w.lossRatio * 100).toFixed(1)}%`, `Premiums: ${formatINR(w.premiums)}`, `Payouts: ${formatINR(w.payouts)}`])}
                        onMouseMove={e => moveTip(e as unknown as React.MouseEvent)}
                        onMouseLeave={() => hideTip()}
                      />
                      <circle cx={p.x} cy={p.y} r="5" fill={dotColor} stroke="#fff" strokeWidth="2" style={{ pointerEvents: 'none' }} />
                      <text x={p.x} y={H - 6} textAnchor="middle" fill="#9CA3AF" fontSize="9" fontFamily="monospace">{shortWeek}</text>
                    </g>
                  );
                })}
              </svg>
            );
          })()
        ) : (
          <p className="text-center py-12 mono text-sm" style={{ color: '#9CA3AF' }}>No weekly data available</p>
        )}
      </div>

      {/* ====== Section 6 + 7: Zone Breakdown + Revenue Donut ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Section 6: Zone-wise Payout Breakdown */}
        <div
          className="p-6 risk-slide"
          style={{ ...card, animationDelay: '0.7s' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = cardHoverShadow; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <p className="serif text-lg font-semibold" style={{ color: '#1A1A1A' }}>Zone-wise Payouts</p>
          <p className="mono text-[10px] uppercase tracking-widest mt-0.5 mb-5" style={{ color: '#9CA3AF' }}>
            By city &middot; sorted by amount
          </p>
          {zonePayouts.length > 0 ? (
            <div className="space-y-3">
              {zonePayouts.slice(0, 8).map(({ city, amount, pct }, i) => {
                const gradientIdx = i % zoneBarGradients.length;
                return (
                  <div key={city}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="mono text-xs font-medium" style={{ color: '#6B7280' }}>{city}</span>
                      <div className="flex items-center gap-2">
                        <span className="mono text-xs font-semibold" style={{ color: zoneBarStartColors[gradientIdx] }}>
                          {formatINR(amount)}
                        </span>
                        <span
                          className="mono text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(139,92,246,0.08)', color: '#8B5CF6', transition: 'transform 0.15s ease', display: 'inline-block' }}
                          onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                          onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-3 rounded-full" style={{ background: '#F3F4F6' }}>
                      <div
                        className="h-full rounded-full bar-grow-x"
                        style={{
                          width: `${(amount / zoneMax) * 100}%`,
                          background: zoneBarGradients[gradientIdx],
                          minWidth: 4,
                          animationDelay: `${i * 0.1}s`,
                          transition: 'opacity 0.15s ease, transform 0.15s ease',
                          cursor: 'pointer',
                          transformOrigin: 'left',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scaleX(1.02)'; e.currentTarget.style.opacity = '0.85'; showTip(e, [`City: ${city}`, `Amount: ${formatINR(amount)}`, `Share: ${pct.toFixed(1)}%`]); }}
                        onMouseMove={moveTip}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scaleX(1)'; e.currentTarget.style.opacity = '1'; hideTip(); }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: '#9CA3AF' }}>
              <p className="mono text-sm">No zone data available</p>
            </div>
          )}
        </div>

        {/* Section 7: Revenue Breakdown Donut */}
        <div
          className="p-6 risk-slide"
          style={{ ...card, animationDelay: '0.8s' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = cardHoverShadow; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <p className="serif text-lg font-semibold" style={{ color: '#1A1A1A' }}>Revenue Breakdown</p>
          <p className="mono text-[10px] uppercase tracking-widest mt-0.5 mb-5" style={{ color: '#9CA3AF' }}>
            Premiums allocation
          </p>
          <div className="flex flex-col items-center">
            {/* Donut */}
            <div
              style={{
                position: 'relative',
                width: 160,
                height: 160,
                transition: 'transform 0.3s ease',
                filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.15))',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; showTip(e, [`Total Premiums: ${formatINR(totalPremiums)}`, `Payouts: ${formatINR(totalPayouts)} (${donutData.payoutPct.toFixed(1)}%)`, `Net Revenue: ${formatINR(Math.abs(netRevenue))} (${donutData.netPct.toFixed(1)}%)`, `Uncollected: ${formatINR(donutData.failedAmt)} (${donutData.failedPct.toFixed(1)}%)`]); }}
              onMouseMove={moveTip}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; hideTip(); }}
            >
              <div
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  background: `conic-gradient(
                    #EC4899 0deg ${(donutData.payoutPct / 100) * 360}deg,
                    ${netRevenue >= 0 ? '#6366F1' : '#ef4444'} ${(donutData.payoutPct / 100) * 360}deg ${((donutData.payoutPct + donutData.netPct) / 100) * 360}deg,
                    #F97316 ${((donutData.payoutPct + donutData.netPct) / 100) * 360}deg 360deg
                  )`,
                }}
              />
              {/* Inner hole */}
              <div
                style={{
                  position: 'absolute',
                  top: 32,
                  left: 32,
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="serif text-lg font-bold" style={{ color: '#1A1A1A' }}>
                  {formatINR(totalPremiums)}
                </span>
                <span className="mono text-[9px]" style={{ color: '#9CA3AF' }}>TOTAL</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-col gap-2.5 mt-5 w-full max-w-[240px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: '#EC4899', display: 'inline-block' }} />
                  <span className="mono text-xs" style={{ color: '#6B7280' }}>Payouts</span>
                </div>
                <span className="mono text-xs font-semibold" style={{ color: '#1A1A1A' }}>
                  {formatINR(totalPayouts)} ({donutData.payoutPct.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: netRevenue >= 0 ? '#6366F1' : '#ef4444', display: 'inline-block' }} />
                  <span className="mono text-xs" style={{ color: '#6B7280' }}>Net Revenue</span>
                </div>
                <span className="mono text-xs font-semibold" style={{ color: '#1A1A1A' }}>
                  {formatINR(Math.abs(netRevenue))} ({donutData.netPct.toFixed(1)}%)
                </span>
              </div>
              {donutData.failedPct > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: '#F97316', display: 'inline-block' }} />
                    <span className="mono text-xs" style={{ color: '#6B7280' }}>Uncollected</span>
                  </div>
                  <span className="mono text-xs font-semibold" style={{ color: '#1A1A1A' }}>
                    {formatINR(donutData.failedAmt)} ({donutData.failedPct.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ====== Section 8: Failed Payments ====== */}
      <div
        className="p-6 risk-slide"
        style={{ ...card, animationDelay: '0.9s' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = cardHoverShadow; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        <p className="serif text-lg font-semibold" style={{ color: '#1A1A1A' }}>Payment Status</p>
        <p className="mono text-[10px] uppercase tracking-widest mt-0.5 mb-5" style={{ color: '#9CA3AF' }}>
          Failed &amp; pending payments
        </p>
        {failedPolicies.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
              <thead>
                <tr>
                  {['Policy ID', 'Driver', 'Amount', 'Week', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="mono text-[10px] uppercase tracking-widest text-left px-4 py-2"
                      style={{ color: '#9CA3AF', background: 'linear-gradient(90deg, rgba(99,102,241,0.06), rgba(139,92,246,0.03))' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failedPolicies.slice(0, 20).map((p, rowIdx) => (
                  <tr key={p.id} className="admin-row" style={{ borderRadius: 8, transition: 'background 0.15s ease', cursor: 'pointer', background: rowTintPalette[rowIdx % rowTintPalette.length] }}>
                    <td className="mono text-xs px-4 py-2.5" style={{ color: '#6B7280' }}>
                      {p.id.slice(0, 8)}...
                    </td>
                    <td className="mono text-xs px-4 py-2.5" style={{ color: '#6B7280' }}>
                      {p.profile_id.slice(0, 8)}...
                    </td>
                    <td className="mono text-xs px-4 py-2.5 font-semibold" style={{ color: '#ef4444' }}>
                      {formatINR(Number(p.final_premium_inr))}
                    </td>
                    <td className="mono text-xs px-4 py-2.5" style={{ color: '#6B7280' }}>
                      {p.week_start_date}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="mono text-[10px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#ffffff', transition: 'transform 0.15s ease', display: 'inline-block' }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        Failed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(34,197,94,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 16,
                color: '#22C55E',
              }}
            >
              &#10003;
            </div>
            <div>
              <p className="sans text-sm font-medium" style={{ color: '#22C55E' }}>
                No failed payments
              </p>
              <p className="mono text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>
                100% collection rate across all {policies.length} policies
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
