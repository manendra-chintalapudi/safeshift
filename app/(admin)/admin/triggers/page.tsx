'use client';

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { CITIES } from '@/lib/config/cities';
import { DISRUPTION_TYPES, TRIGGERS } from '@/lib/config/constants';
import { getZonesForCity, type CityZone } from '@/lib/config/zones';
import { RING_SIZE_BY_TYPE, disk, toCell } from '@/lib/utils/h3';
import type { DisruptionType } from '@/lib/config/constants';
import type { RiderPoint, EventOverlay } from '@/components/admin/ZoneH3Map';
import { Zap, Activity, BarChart3, TrendingUp, MapPin, CloudLightning, Gauge, Radio, Hexagon } from 'lucide-react';

// Leaflet pulls window; client-side only.
const ZoneH3Map = dynamic(() => import('@/components/admin/ZoneH3Map'), { ssr: false });

/* ═══════════════ Types ═══════════════ */

interface TriggerEvent {
  id: string; event_type: string; city: string; severity_score: number;
  trigger_value: number | null; trigger_threshold: number | null;
  data_sources: string[] | null; resolved_at: string | null; created_at: string;
}
interface TriggerResult { status: string; event_id?: string; message?: string; claims_created?: number; payouts_completed?: number; error?: string; }

/* ═══════════════ Palette ═══════════════ */

const NEON = {
  purple: '#8B5CF6', blue: '#3B82F6', cyan: '#06B6D4', green: '#22C55E',
  yellow: '#FACC15', orange: '#F97316', pink: '#EC4899', red: '#F87171',
  indigo: '#6366F1', violet: '#A78BFA', teal: '#14B8A6',
};

const TYPE_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  heavy_rainfall:  { bg: 'rgba(59,130,246,0.1)',  color: NEON.blue,   border: NEON.blue },
  aqi_grap_iv:     { bg: 'rgba(107,114,128,0.1)', color: '#6B7280',   border: '#6B7280' },
  cyclone:         { bg: 'rgba(248,113,113,0.1)',  color: '#dc2626',   border: '#dc2626' },
  platform_outage: { bg: 'rgba(250,204,21,0.1)',   color: '#a16207',   border: NEON.yellow },
  curfew_bandh:    { bg: 'rgba(139,92,246,0.1)',   color: NEON.purple, border: NEON.purple },
};

const TYPE_DONUT_COLORS: Record<string, string> = {
  heavy_rainfall: NEON.blue, aqi_grap_iv: '#6b7280', cyclone: '#dc2626',
  platform_outage: NEON.yellow, curfew_bandh: NEON.purple,
};

const KPI_GRADIENTS = [
  `linear-gradient(135deg, ${NEON.indigo}, ${NEON.purple})`,
  `linear-gradient(135deg, ${NEON.blue}, ${NEON.cyan})`,
  `linear-gradient(135deg, ${NEON.teal}, ${NEON.green})`,
  `linear-gradient(135deg, ${NEON.orange}, ${NEON.yellow})`,
];

const F = "var(--font-inter),'Inter',sans-serif";
const M = "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace";

/* ═══════════════ SVG: Severity Area Chart ═══════════════ */

function SeverityAreaChart({ events, onShowTip, onMoveTip, onHideTip }: { events: TriggerEvent[]; onShowTip: (e: React.MouseEvent, c: string[]) => void; onMoveTip: (e: React.MouseEvent) => void; onHideTip: () => void }) {
  if (events.length < 2) return <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 24 }}>Not enough data for trend</p>;

  const W = 500, H = 160, PAD = 40;
  const byDay: Record<string, { sum: number; count: number }> = {};
  for (const e of events) { const day = e.created_at.slice(0, 10); if (!byDay[day]) byDay[day] = { sum: 0, count: 0 }; byDay[day].sum += e.severity_score; byDay[day].count++; }
  const sorted = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  if (sorted.length < 2) return <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 24 }}>Not enough data</p>;

  const avgScores = sorted.map(([, v]) => v.sum / v.count);
  const counts = sorted.map(([, v]) => v.count);
  const maxScore = Math.max(...avgScores, 1);
  const maxCount = Math.max(...counts, 1);

  function toPoints(data: number[], max: number) {
    return data.map((v, i) => ({ x: PAD + (i / (data.length - 1)) * (W - PAD * 2), y: H - 24 - (v / max) * (H - 48) }));
  }
  function smoothPath(pts: { x: number; y: number }[]) {
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) { const mx = (pts[i - 1].x + pts[i].x) / 2; d += ` C ${mx} ${pts[i - 1].y} ${mx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`; }
    return d;
  }

  const scorePts = toPoints(avgScores, maxScore);
  const countPts = toPoints(counts, maxCount);
  const scoreLine = smoothPath(scorePts);
  const countLine = smoothPath(countPts);
  const scoreFill = `${scoreLine} L ${scorePts[scorePts.length - 1].x} ${H - 24} L ${scorePts[0].x} ${H - 24} Z`;
  const countFill = `${countLine} L ${countPts[countPts.length - 1].x} ${H - 24} L ${countPts[0].x} ${H - 24} Z`;
  const labels = sorted.map(([day]) => new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));

  // Invisible hover zones for each data point — wide rectangles so easy to hit
  const colW = sorted.length > 1 ? (W - PAD * 2) / (sorted.length - 1) : W;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sev-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={NEON.purple} stopOpacity="0.3" /><stop offset="100%" stopColor={NEON.purple} stopOpacity="0.02" /></linearGradient>
        <linearGradient id="cnt-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={NEON.cyan} stopOpacity="0.25" /><stop offset="100%" stopColor={NEON.cyan} stopOpacity="0.02" /></linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(v => (<line key={v} x1={PAD} y1={H - 24 - v * (H - 48)} x2={W - PAD} y2={H - 24 - v * (H - 48)} stroke="#E8E8EA" strokeWidth="1" strokeDasharray="4 4" />))}
      <path d={scoreFill} fill="url(#sev-fill)" />
      <path d={countFill} fill="url(#cnt-fill)" />
      <path d={scoreLine} fill="none" stroke={NEON.purple} strokeWidth="2.5" strokeLinecap="round" />
      <path d={countLine} fill="none" stroke={NEON.cyan} strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" />
      {/* Dots + hover zones */}
      {scorePts.map((p, i) => (
        <g key={i}>
          {/* Invisible hover rect */}
          <rect x={p.x - colW / 2} y={0} width={colW} height={H} fill="transparent" style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => onShowTip(e as unknown as React.MouseEvent, [labels[i], `Avg Severity: ${avgScores[i].toFixed(1)}`, `Triggers: ${counts[i]}`])}
            onMouseMove={(e) => onMoveTip(e as unknown as React.MouseEvent)}
            onMouseLeave={() => onHideTip()}
          />
          {/* Vertical guide line (shown on hover via CSS) */}
          <line x1={p.x} y1={8} x2={p.x} y2={H - 24} stroke={NEON.purple} strokeWidth="1" strokeDasharray="3 3" opacity="0" style={{ pointerEvents: 'none' }}>
            <set attributeName="opacity" to="0.3" begin={`rect-${i}.mouseenter`} end={`rect-${i}.mouseleave`} />
          </line>
          {/* Severity dot */}
          <circle cx={p.x} cy={p.y} r="4" fill={NEON.purple} stroke="#fff" strokeWidth="2" style={{ pointerEvents: 'none', transition: 'r 0.15s' }} />
          {/* Count dot */}
          <circle cx={countPts[i].x} cy={countPts[i].y} r="3" fill={NEON.cyan} stroke="#fff" strokeWidth="1.5" style={{ pointerEvents: 'none' }} />
        </g>
      ))}
      {/* X labels */}
      {labels.map((l, i) => {
        if (sorted.length > 7 && i % 2 !== 0 && i !== sorted.length - 1) return null;
        return <text key={i} x={scorePts[i].x} y={H - 6} textAnchor="middle" fill="#9CA3AF" fontSize="9" fontFamily={M}>{l}</text>;
      })}
    </svg>
  );
}

/* ═══════════════ Tooltip ═══════════════ */

function Tooltip({ x, y, content, visible }: { x: number; y: number; content: string[]; visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', left: x + 14, top: y - 8, background: 'linear-gradient(135deg, #1e1b4b, #312e81)', color: '#fff', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontFamily: M, lineHeight: 1.7, zIndex: 9999, pointerEvents: 'none', boxShadow: '0 8px 32px rgba(99,102,241,0.3)', border: '1px solid rgba(139,92,246,0.3)', whiteSpace: 'nowrap' }}>
      {content.map((line, i) => <div key={i}>{line}</div>)}
    </div>
  );
}

/* ═══════════════ Page ═══════════════ */

export default function AdminTriggersPage() {
  const [events, setEvents] = useState<TriggerEvent[]>([]);
  const [claimCounts, setClaimCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const [tip, setTip] = useState<{ x: number; y: number; content: string[]; visible: boolean }>({ x: 0, y: 0, content: [], visible: false });
  function showTip(e: React.MouseEvent, content: string[]) { setTip({ x: e.clientX, y: e.clientY, content, visible: true }); }
  function moveTip(e: React.MouseEvent) { setTip(prev => ({ ...prev, x: e.clientX, y: e.clientY })); }
  function hideTip() { setTip(prev => ({ ...prev, visible: false })); }

  // Demo state
  const [demoCity, setDemoCity] = useState(CITIES[0].slug);
  const [demoEventType, setDemoEventType] = useState<DisruptionType>(DISRUPTION_TYPES[0]);
  const [demoSeverity, setDemoSeverity] = useState(7);
  const [demoTriggerValue, setDemoTriggerValue] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<TriggerResult | null>(null);
  const triggerConfig = TRIGGERS[demoEventType];

  // Zone-level (H3) controls
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [zoneId, setZoneId] = useState<string>(''); // '' = city-wide
  const [ringSize, setRingSize] = useState<number>(RING_SIZE_BY_TYPE[DISRUPTION_TYPES[0]]);
  const [riders, setRiders] = useState<RiderPoint[]>([]);
  const [activeEvents, setActiveEvents] = useState<EventOverlay[]>([]);

  const demoCityMeta = useMemo(() => CITIES.find((c) => c.slug === demoCity) ?? CITIES[0], [demoCity]);
  const demoMapCenter: [number, number] = [demoCityMeta.latitude, demoCityMeta.longitude];
  const cityZones: CityZone[] = useMemo(() => getZonesForCity(demoCity), [demoCity]);
  const selectedZone = useMemo(() => cityZones.find((z) => z.zone_id === zoneId), [cityZones, zoneId]);

  // When city changes, clear the zone + pin (they belonged to the previous city).
  useEffect(() => { setZoneId(''); setPin(null); }, [demoCity]);

  // Picking a zone from the dropdown drops the pin at its centroid.
  function handleZoneChange(newId: string) {
    setZoneId(newId);
    if (!newId) { setPin(null); return; }
    const z = cityZones.find((zz) => zz.zone_id === newId);
    if (z) setPin({ lat: z.lat, lng: z.lng });
  }

  // Re-snap ring size to the recommended default when event type changes
  useEffect(() => { setRingSize(RING_SIZE_BY_TYPE[demoEventType]); }, [demoEventType]);

  // Preview: which H3 cells will be affected by the current pin + ring?
  const previewCells = useMemo(() => {
    const origin = pin ?? { lat: demoCityMeta.latitude, lng: demoCityMeta.longitude };
    return disk(toCell(origin.lat, origin.lng), ringSize);
  }, [pin, ringSize, demoCityMeta]);

  // Riders that would be eligible if we fired right now
  const previewRiders = useMemo(() => {
    const set = new Set(previewCells);
    return riders.filter((r) => set.has(r.h3_cell));
  }, [previewCells, riders]);

  // Load live riders + active events (scoped to last 30 min of heartbeats)
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h window for preview

    async function load() {
      const [logsRes, profilesRes, evtRes] = await Promise.all([
        supabase
          .from('driver_activity_logs')
          .select('profile_id, latitude, longitude, h3_cell, status, recorded_at, profiles(full_name)')
          .gte('recorded_at', since)
          .neq('status', 'offline')
          .order('recorded_at', { ascending: false })
          .limit(2000),
        // Fallback: all active drivers with zone coordinates (same as claim processor)
        supabase
          .from('profiles')
          .select('id, full_name, zone_latitude, zone_longitude, city')
          .eq('role', 'driver')
          .eq('onboarding_status', 'complete')
          .not('zone_latitude', 'is', null)
          .not('zone_longitude', 'is', null),
        supabase
          .from('live_disruption_events')
          .select('id, event_type, center_h3_cell, h3_ring_size, severity_score, resolved_at')
          .is('resolved_at', null)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;

      // Build rider points from activity logs
      const latest = new Map<string, { profile_id: string; latitude: number | null; longitude: number | null; h3_cell: string | null; status: string; recorded_at: string; profiles: { full_name: string | null } | null }>();
      for (const row of (logsRes.data as never[]) || []) {
        const r = row as { profile_id: string; latitude: number | null; longitude: number | null; h3_cell: string | null; status: string; recorded_at: string; profiles: { full_name: string | null } | null };
        if (!latest.has(r.profile_id)) latest.set(r.profile_id, r);
      }
      const points: RiderPoint[] = [];
      const seenIds = new Set<string>();
      for (const r of latest.values()) {
        if (!r.h3_cell || r.latitude == null || r.longitude == null) continue;
        points.push({ profile_id: r.profile_id, name: r.profiles?.full_name ?? null, lat: r.latitude, lng: r.longitude, status: r.status, h3_cell: r.h3_cell, recorded_at: r.recorded_at });
        seenIds.add(r.profile_id);
      }

      // Fallback: add drivers from profiles who have zone coordinates but no recent activity log
      for (const row of (profilesRes.data as never[]) || []) {
        const p = row as { id: string; full_name: string | null; zone_latitude: number; zone_longitude: number; city: string };
        if (seenIds.has(p.id)) continue;
        const cell = toCell(p.zone_latitude, p.zone_longitude);
        points.push({ profile_id: p.id, name: p.full_name, lat: p.zone_latitude, lng: p.zone_longitude, status: 'online', h3_cell: cell, recorded_at: new Date().toISOString() });
      }

      const evs: EventOverlay[] = [];
      for (const row of (evtRes.data as never[]) || []) {
        const e = row as { id: string; event_type: string; center_h3_cell: string | null; h3_ring_size: number | null; severity_score: number };
        if (!e.center_h3_cell || e.h3_ring_size == null) continue;
        evs.push({ id: e.id, event_type: e.event_type, center_h3_cell: e.center_h3_cell, h3_ring_size: e.h3_ring_size, severity_score: e.severity_score });
      }
      setRiders(points);
      setActiveEvents(evs);
    }

    load();
    return () => { cancelled = true; };
  }, [demoCity, demoResult?.event_id]);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: eventsData, error: eventsErr } = await supabase.from('live_disruption_events').select('*').order('created_at', { ascending: false });
        if (eventsErr) throw eventsErr;
        const allEvents = (eventsData as unknown as TriggerEvent[]) || [];
        setEvents(allEvents);
        const eventIds = allEvents.map((e) => e.id);
        if (eventIds.length > 0) {
          const { data: claimsData } = await supabase.from('parametric_claims').select('disruption_event_id').in('disruption_event_id', eventIds);
          const counts: Record<string, number> = {};
          for (const c of (claimsData || []) as unknown as { disruption_event_id: string }[]) { counts[c.disruption_event_id] = (counts[c.disruption_event_id] || 0) + 1; }
          setClaimCounts(counts);
        }
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load triggers'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  /* Computed */
  const typeCounts = useMemo(() => { const c: Record<string, number> = {}; for (const e of events) c[e.event_type] = (c[e.event_type] || 0) + 1; return c; }, [events]);
  const cityCounts = useMemo(() => { const c: Record<string, number> = {}; for (const e of events) c[e.city] = (c[e.city] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]); }, [events]);
  const cityMaxCount = cityCounts.length > 0 ? cityCounts[0][1] : 1;

  const heatmapData = useMemo(() => {
    const cities = [...new Set(events.map((e) => e.city))].sort();
    const types = DISRUPTION_TYPES as readonly string[];
    const matrix: Record<string, Record<string, number>> = {};
    for (const city of cities) { matrix[city] = {}; for (const t of types) matrix[city][t] = 0; }
    for (const e of events) { if (matrix[e.city]) matrix[e.city][e.event_type] = (matrix[e.city][e.event_type] || 0) + 1; }
    let maxVal = 1;
    for (const row of Object.values(matrix)) for (const v of Object.values(row)) if (v > maxVal) maxVal = v;
    return { cities, types, matrix, maxVal };
  }, [events]);

  const donutGradient = useMemo(() => {
    const total = events.length || 1; const segs: string[] = []; let cum = 0;
    for (const dt of DISRUPTION_TYPES) { const cnt = typeCounts[dt] || 0; const pct = (cnt / total) * 100; segs.push(`${TYPE_DONUT_COLORS[dt] || '#ccc'} ${cum}% ${cum + pct}%`); cum += pct; }
    return `conic-gradient(${segs.join(', ')})`;
  }, [events.length, typeCounts]);

  const filteredEvents = useMemo(() => events.filter((e) => { if (filterCity !== 'all' && e.city !== filterCity) return false; if (filterType !== 'all' && e.event_type !== filterType) return false; return true; }), [events, filterCity, filterType]);
  const eventCities = useMemo(() => [...new Set(events.map((e) => e.city))].sort(), [events]);

  // Extra analytics
  const activeCount = useMemo(() => events.filter(e => !e.resolved_at).length, [events]);
  const avgSeverity = useMemo(() => events.length > 0 ? (events.reduce((s, e) => s + e.severity_score, 0) / events.length) : 0, [events]);
  const totalClaims = useMemo(() => Object.values(claimCounts).reduce((a, b) => a + b, 0), [claimCounts]);

  /* Demo handler */
  async function handleFireTrigger() {
    setDemoLoading(true); setDemoResult(null);
    try {
      const body: Record<string, unknown> = {
        city: demoCity,
        event_type: demoEventType,
        severity: demoSeverity,
        h3_ring_size: ringSize,
      };
      if (demoTriggerValue) body.trigger_value = Number(demoTriggerValue);
      if (pin) { body.zone_latitude = pin.lat; body.zone_longitude = pin.lng; }
      const res = await fetch('/api/admin/demo-trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json()) as TriggerResult;
      setDemoResult(data);
      if (!data.error) { const supabase = createClient(); const { data: refreshed } = await supabase.from('live_disruption_events').select('*').order('created_at', { ascending: false }); if (refreshed) setEvents(refreshed as unknown as TriggerEvent[]); }
    } catch (err) { setDemoResult({ status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }); }
    finally { setDemoLoading(false); }
  }

  /* Loading / Error */
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full mx-auto mb-3 animate-spin" style={{ border: '3px solid #F3F4F6', borderTopColor: NEON.purple }} />
        <p style={{ fontSize: 13, color: '#6B7280' }}>Loading triggers...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="space-y-4">
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: F }}>Trigger Events</h1>
      <div style={{ borderRadius: 16, padding: 20, background: 'rgba(248,113,113,0.08)', border: '1px solid #F87171' }}>
        <p style={{ fontWeight: 600, color: '#dc2626' }}>Failed to load data</p>
        <p style={{ fontSize: 13, color: '#dc2626', marginTop: 4 }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes tSlide { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes tFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
        @keyframes tPulse { 0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,0.4)} 50%{box-shadow:0 0 0 14px rgba(139,92,246,0)} }
        @keyframes tGlow { 0%,100%{box-shadow:0 4px 16px rgba(139,92,246,0.2)} 50%{box-shadow:0 8px 32px rgba(139,92,246,0.4)} }
        .t-s { animation: tSlide 0.5s ease both; }
        .t-s1 { animation-delay:0.05s } .t-s2 { animation-delay:0.1s } .t-s3 { animation-delay:0.15s }
        .t-s4 { animation-delay:0.2s } .t-s5 { animation-delay:0.25s } .t-s6 { animation-delay:0.3s }
      `}</style>

      <Tooltip x={tip.x} y={tip.y} content={tip.content} visible={tip.visible} />

      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: F }}>Trigger Events</h1>

      {/* ═══════════ ROW 1: 4 gradient KPI cards ═══════════ */}
      <div className="t-s t-s1 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Triggers', value: String(events.length), sub: `${DISRUPTION_TYPES.length} types`, icon: Zap, grad: KPI_GRADIENTS[0] },
          { label: 'Active Now', value: String(activeCount), sub: `${events.length - activeCount} resolved`, icon: Activity, grad: KPI_GRADIENTS[1] },
          { label: 'Avg Severity', value: avgSeverity.toFixed(1), sub: 'out of 10', icon: TrendingUp, grad: KPI_GRADIENTS[2] },
          { label: 'Claims Triggered', value: String(totalClaims), sub: `across ${eventCities.length} cities`, icon: BarChart3, grad: KPI_GRADIENTS[3] },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-2xl p-5 relative overflow-hidden" style={{ background: kpi.grad, color: '#fff', borderRadius: 16, transition: 'all 0.25s ease' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.25)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ position: 'absolute', top: -10, right: -10, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
              <Icon size={18} style={{ opacity: 0.8, marginBottom: 6 }} />
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85, fontFamily: M }}>{kpi.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, marginTop: 4, fontFamily: F }}>{kpi.value}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ═══════════ ROW 2: Severity Area Chart + Donut + City Bars ═══════════ */}
      <div className="t-s t-s2 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity trend area chart */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 16, transition: 'all 0.2s ease' }}
          onMouseOver={e => { e.currentTarget.style.boxShadow = '0 8px 25px rgba(99,102,241,0.08)'; }}
          onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', fontFamily: F }}>Severity & Frequency Trend</h2>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#6B7280' }}>
                <span style={{ width: 12, height: 3, borderRadius: 2, background: NEON.purple, display: 'inline-block' }} /> Avg Severity
              </span>
              <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#6B7280' }}>
                <span style={{ width: 12, height: 3, borderRadius: 2, background: NEON.cyan, display: 'inline-block', borderTop: '1px dashed ' + NEON.cyan }} /> Count
              </span>
            </div>
          </div>
          <SeverityAreaChart events={events} onShowTip={showTip} onMoveTip={moveTip} onHideTip={hideTip} />
        </div>

        {/* Donut chart */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 16, transition: 'all 0.2s ease' }}
          onMouseOver={e => { e.currentTarget.style.boxShadow = '0 8px 25px rgba(99,102,241,0.08)'; }}
          onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', fontFamily: F, marginBottom: 12 }}>By Type</h2>
          <div className="flex items-center justify-center" style={{ height: 120 }}>
            <div style={{ position: 'relative', width: 100, height: 100 }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: donutGradient, mask: 'radial-gradient(circle, transparent 42%, black 42%)', WebkitMask: 'radial-gradient(circle, transparent 42%, black 42%)', cursor: 'pointer', transition: 'transform 0.3s', filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.15))' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; showTip(e, DISRUPTION_TYPES.map(dt => `${TRIGGERS[dt].label}: ${typeCounts[dt] || 0}`)); }}
                onMouseMove={moveTip}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; hideTip(); }}
              />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A' }}>{events.length}</div>
              </div>
            </div>
          </div>
          <div className="space-y-1 mt-3">
            {DISRUPTION_TYPES.map((dt) => (
              <div key={dt} className="flex items-center gap-1.5" style={{ fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_DONUT_COLORS[dt], flexShrink: 0, display: 'inline-block' }} />
                <span style={{ color: '#6B7280', fontFamily: M }} className="truncate">{TRIGGERS[dt].label}: {typeCounts[dt] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ ROW 3: Proper Heatmap Matrix ═══════════ */}
      <div className="t-s t-s3 rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 16 }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E8E8EA' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', fontFamily: F }}>City-Trigger Heatmap</h2>
          {/* Level-based color legend */}
          <div className="flex items-center gap-3">
            {[
              { label: 'None', bg: '#F3F4F6', color: '#D1D5DB' },
              { label: 'Low', bg: 'rgba(34,197,94,0.25)', color: '#16a34a' },
              { label: 'Medium', bg: 'rgba(250,204,21,0.35)', color: '#a16207' },
              { label: 'High', bg: 'rgba(249,115,22,0.4)', color: '#c2410c' },
              { label: 'Critical', bg: 'rgba(239,68,68,0.5)', color: '#dc2626' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div style={{ width: 14, height: 14, borderRadius: 4, background: l.bg, border: `1px solid ${l.color}20` }} />
                <span style={{ fontSize: 10, color: '#6B7280', fontFamily: M }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          {heatmapData.cities.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: `100px repeat(${heatmapData.types.length}, 1fr)`, gap: 3 }}>
              {/* Header row */}
              <div />
              {heatmapData.types.map((t) => (
                <div key={t} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#6B7280', fontFamily: M, padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t === 'heavy_rainfall' ? 'Rainfall' : t === 'aqi_grap_iv' ? 'AQI' : t === 'platform_outage' ? 'Outage' : t === 'curfew_bandh' ? 'Curfew' : TRIGGERS[t as DisruptionType]?.label.split(' ')[0] || t}
                </div>
              ))}
              {/* Data rows */}
              {heatmapData.cities.map((city) => (
                <React.Fragment key={city}>
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 600, color: '#1A1A1A', fontFamily: F, paddingRight: 8 }}>
                    {city}
                  </div>
                  {heatmapData.types.map((t) => {
                    const val = heatmapData.matrix[city][t];
                    const pct = heatmapData.maxVal > 0 ? val / heatmapData.maxVal : 0;
                    // Level-based colors: none → green → yellow → orange → red
                    let bg: string, text: string, glow: string, levelLabel: string;
                    if (val === 0) {
                      bg = '#FAFAFA'; text = '#D1D5DB'; glow = 'rgba(0,0,0,0.05)'; levelLabel = 'None';
                    } else if (pct <= 0.25) {
                      bg = 'rgba(34,197,94,0.2)'; text = '#16a34a'; glow = 'rgba(34,197,94,0.3)'; levelLabel = 'Low';
                    } else if (pct <= 0.5) {
                      bg = 'rgba(250,204,21,0.3)'; text = '#a16207'; glow = 'rgba(250,204,21,0.35)'; levelLabel = 'Medium';
                    } else if (pct <= 0.75) {
                      bg = 'rgba(249,115,22,0.35)'; text = '#c2410c'; glow = 'rgba(249,115,22,0.35)'; levelLabel = 'High';
                    } else {
                      bg = 'rgba(239,68,68,0.4)'; text = '#dc2626'; glow = 'rgba(239,68,68,0.35)'; levelLabel = 'Critical';
                    }
                    return (
                      <div
                        key={`${city}-${t}`}
                        style={{
                          background: bg, borderRadius: 8,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          minHeight: 40, fontSize: val > 0 ? 14 : 12,
                          fontWeight: val > 0 ? 800 : 400, color: text, fontFamily: M,
                          cursor: 'pointer', transition: 'all 0.2s ease',
                          border: val > 0 ? `1px solid ${text}20` : '1px solid #F3F4F6',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'scale(1.08)';
                          e.currentTarget.style.zIndex = '10';
                          e.currentTarget.style.boxShadow = `0 4px 20px ${glow}`;
                          showTip(e, [`${city}`, `${TRIGGERS[t as DisruptionType]?.label || t}`, `Count: ${val}`, `Level: ${levelLabel}`]);
                        }}
                        onMouseMove={moveTip}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.zIndex = '0';
                          e.currentTarget.style.boxShadow = 'none';
                          hideTip();
                        }}
                      >
                        {val > 0 ? val : '-'}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          ) : <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 24 }}>No trigger events</p>}
        </div>
      </div>

      {/* ═══════════ ROW 4: Demo Trigger Panel ═══════════ */}
      <div className="t-s t-s4 rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 16 }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8E8EA', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #F97316, #FB923C)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'tFloat 3s ease-in-out infinite' }}>
            <Radio size={15} style={{ color: '#fff' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', fontFamily: F }}>Demo Trigger Panel</h2>
            <p style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
              Click on the map to fire at a specific zone. Leave unpinned to fire at the city centroid.
            </p>
          </div>
        </div>

        {/* Zone-level pin-drop map */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <ZoneH3Map
            center={demoMapCenter}
            zoom={11}
            riders={riders}
            events={activeEvents}
            pin={pin}
            previewCells={previewCells}
            onPin={(lat, lng) => { setPin({ lat, lng }); setZoneId(''); }}
            resolutionLabel="H3 res-8 · click to drop pin"
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginTop: 10 }}>
            <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Hexagon size={13} style={{ color: NEON.orange }} />
              {selectedZone ? (
                <>
                  Zone <span style={{ fontFamily: F, fontWeight: 700, color: '#1A1A1A' }}>{selectedZone.name}</span> —
                  <span style={{ fontFamily: M, color: '#9A3412' }}>{pin ? toCell(pin.lat, pin.lng) : ''}</span>
                </>
              ) : pin ? (
                <>
                  Custom pin <span style={{ fontFamily: M, color: '#1A1A1A' }}>{pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</span> —
                  <span style={{ fontFamily: M, color: '#9A3412' }}>{toCell(pin.lat, pin.lng)}</span>
                </>
              ) : (
                <>No pin — firing at {demoCityMeta.name} centroid</>
              )}
              <span style={{ marginLeft: 4, fontFamily: M, color: NEON.orange, fontWeight: 700 }}>
                · {previewCells.length} cells
              </span>
            </div>
            {(pin || zoneId) && (
              <button
                onClick={() => { setPin(null); setZoneId(''); }}
                style={{ fontSize: 11, fontFamily: M, border: '1px solid #E8E8EA', padding: '3px 10px', borderRadius: 8, background: '#fff', color: '#6B7280', cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* 2-column layout: Gauge left, form fields right */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0 }}>
          {/* LEFT: Severity Gauge */}
          <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #F3F4F6' }}>
            {(() => {
              const angle = (demoSeverity / 10) * 180;
              const needleColor = demoSeverity > 7 ? NEON.red : demoSeverity > 4 ? NEON.yellow : NEON.green;
              return (
                <>
                  <div style={{ position: 'relative', width: 180, height: 100, cursor: 'pointer' }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const cx = rect.left + rect.width / 2;
                      const cy = rect.top + rect.height;
                      const dx = e.clientX - cx;
                      const dy = -(e.clientY - cy);
                      let a = Math.atan2(dy, dx) * (180 / Math.PI);
                      if (a < 0) a = 0; if (a > 180) a = 180;
                      setDemoSeverity(Math.round(((180 - a) / 180) * 100) / 10);
                    }}
                  >
                    <svg width="180" height="100" viewBox="0 0 180 100" style={{ display: 'block' }}>
                      <path d="M 8 90 A 82 82 0 0 1 172 90" fill="none" stroke="#F3F4F6" strokeWidth="12" strokeLinecap="round" />
                      <path d="M 8 90 A 82 82 0 0 1 172 90" fill="none" stroke="url(#gauge-grad)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(angle / 180) * 257.6} 257.6`} />
                      <defs><linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={NEON.green} /><stop offset="40%" stopColor={NEON.yellow} /><stop offset="100%" stopColor={NEON.red} /></linearGradient></defs>
                      {[0, 2, 4, 6, 8, 10].map((v) => {
                        const a2 = Math.PI - (v / 10) * Math.PI;
                        const x1 = 90 + Math.cos(a2) * 68, y1 = 90 - Math.sin(a2) * 68;
                        const x2 = 90 + Math.cos(a2) * 78, y2 = 90 - Math.sin(a2) * 78;
                        const tx = 90 + Math.cos(a2) * 56, ty = 90 - Math.sin(a2) * 56;
                        return (<g key={v}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" /><text x={tx} y={ty + 3} textAnchor="middle" fill="#9CA3AF" fontSize="9" fontFamily={M}>{v}</text></g>);
                      })}
                      {(() => {
                        const na = Math.PI - (demoSeverity / 10) * Math.PI;
                        const nx = 90 + Math.cos(na) * 62, ny = 90 - Math.sin(na) * 62;
                        return (<><line x1={90} y1={90} x2={nx} y2={ny} stroke={needleColor} strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'all 0.3s ease' }} /><circle cx={90} cy={90} r="5" fill={needleColor} stroke="#fff" strokeWidth="2" style={{ transition: 'fill 0.3s' }} /></>);
                      })()}
                    </svg>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: -4 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: needleColor, fontFamily: F, transition: 'color 0.3s' }}>{demoSeverity.toFixed(1)}</span>
                    <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 3 }}>/ 10</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Click gauge to set</div>
                </>
              );
            })()}
          </div>

          {/* RIGHT: Form fields + button */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* City + Zone (side by side) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#1A1A1A', marginBottom: 4, fontFamily: M }}>
                  <MapPin size={12} style={{ color: NEON.blue }} /> City
                </label>
                <select value={demoCity} onChange={(e) => setDemoCity(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: '1.5px solid #E8E8EA', transition: 'all 0.2s', outline: 'none' }} onFocus={e => { e.currentTarget.style.borderColor = NEON.purple; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)'; }} onBlur={e => { e.currentTarget.style.borderColor = '#E8E8EA'; e.currentTarget.style.boxShadow = 'none'; }}>
                  {CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#1A1A1A', marginBottom: 4, fontFamily: M }}>
                  <Hexagon size={12} style={{ color: NEON.orange }} /> Zone
                </label>
                <select value={zoneId} onChange={(e) => handleZoneChange(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: '1.5px solid #E8E8EA', transition: 'all 0.2s', outline: 'none' }} onFocus={e => { e.currentTarget.style.borderColor = NEON.orange; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'; }} onBlur={e => { e.currentTarget.style.borderColor = '#E8E8EA'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <option value="">— whole city (centroid) —</option>
                  {cityZones.map((z) => <option key={z.zone_id} value={z.zone_id}>{z.name}</option>)}
                </select>
                {selectedZone && (
                  <div style={{ fontSize: 9, color: '#9CA3AF', fontFamily: M, marginTop: 3 }}>
                    risk {(selectedZone.risk_score * 100).toFixed(0)}% · {selectedZone.risk_factors.slice(0, 2).join(', ')}
                  </div>
                )}
              </div>
            </div>
            {/* Disruption Type */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#1A1A1A', marginBottom: 4, fontFamily: M }}>
                <CloudLightning size={12} style={{ color: NEON.orange }} /> Disruption Type
              </label>
              <select value={demoEventType} onChange={(e) => setDemoEventType(e.target.value as DisruptionType)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: '1.5px solid #E8E8EA', transition: 'all 0.2s' }} onFocus={e => { e.currentTarget.style.borderColor = NEON.purple; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)'; }} onBlur={e => { e.currentTarget.style.borderColor = '#E8E8EA'; e.currentTarget.style.boxShadow = 'none'; }}>
                {DISRUPTION_TYPES.map((dt) => <option key={dt} value={dt}>{TRIGGERS[dt].label}</option>)}
              </select>
            </div>
            {/* Ring size */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#1A1A1A', marginBottom: 4, fontFamily: M, justifyContent: 'space-between' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Hexagon size={12} style={{ color: NEON.orange }} /> Ring size
                </span>
                <span style={{ color: NEON.orange, fontWeight: 800 }}>
                  {ringSize} · ~{(ringSize * 0.92).toFixed(1)} km
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={ringSize}
                onChange={(e) => setRingSize(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: NEON.orange }}
              />
              <div style={{ fontSize: 9, color: '#9CA3AF', fontFamily: M, marginTop: 2 }}>
                default for {demoEventType.replace(/_/g, ' ')}: {RING_SIZE_BY_TYPE[demoEventType]} · covers {previewCells.length} hexagons
              </div>
            </div>
            {/* Trigger Value */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#1A1A1A', marginBottom: 4, fontFamily: M }}>
                <Zap size={12} style={{ color: NEON.purple }} /> Trigger Value ({triggerConfig.unit})
              </label>
              <input type="number" value={demoTriggerValue} onChange={(e) => setDemoTriggerValue(e.target.value)} placeholder={`Default: ${triggerConfig.threshold * 1.5} ${triggerConfig.unit}`} className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: '1.5px solid #E8E8EA', transition: 'all 0.2s', outline: 'none' }} onFocus={e => { e.currentTarget.style.borderColor = NEON.purple; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)'; }} onBlur={e => { e.currentTarget.style.borderColor = '#E8E8EA'; e.currentTarget.style.boxShadow = 'none'; }} />
            </div>
            {/* Fire button */}
            <button onClick={handleFireTrigger} disabled={demoLoading} className="text-white font-bold py-2.5 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: `linear-gradient(135deg, ${NEON.indigo}, ${NEON.purple})`, transition: 'all 0.25s ease', fontSize: 13, boxShadow: '0 4px 16px rgba(139,92,246,0.25)', display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', cursor: demoLoading ? 'not-allowed' : 'pointer', alignSelf: 'flex-end', marginTop: 4 }}
              onMouseOver={e => { if (!demoLoading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(139,92,246,0.4)'; } }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,92,246,0.25)'; }}
            >
              <Zap size={14} />
              {demoLoading
                ? 'Firing...'
                : selectedZone
                  ? `Fire in ${selectedZone.name}`
                  : pin
                    ? `Fire at pin`
                    : 'Fire at city centroid'}
            </button>
          </div>
        </div>

        {/* Result */}
        {demoResult && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #F3F4F6' }}>
            <div className="t-s rounded-xl p-4 flex items-start gap-3" style={demoResult.error ? { background: 'rgba(248,113,113,0.08)', border: '1px solid #F87171' } : { background: 'rgba(34,197,94,0.08)', border: '1px solid #22C55E' }}>
              {demoResult.error ? (
                <>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Activity size={16} style={{ color: NEON.red }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: NEON.red, fontSize: 14 }}>Error</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{demoResult.error}</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: 'tFloat 2s ease-in-out infinite' }}>
                    <Zap size={16} style={{ color: NEON.green }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 14 }}>Trigger Fired Successfully</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{demoResult.message}</div>
                    {demoResult.event_id && <div style={{ fontSize: 11, color: NEON.purple, marginTop: 4, fontFamily: M }}>Event ID: {demoResult.event_id}</div>}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ ROW 5: Trigger History — Active Zones style ═══════════ */}
      <div className="t-s t-s5 rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 16 }}>
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderBottom: '1px solid #E8E8EA' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', fontFamily: F }}>Trigger History</h2>
          <div className="flex gap-2 flex-wrap">
            <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="text-xs rounded-lg px-3 py-1.5" style={{ border: '1px solid #E8E8EA', fontFamily: M }}>
              <option value="all">All Cities</option>
              {eventCities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-xs rounded-lg px-3 py-1.5" style={{ border: '1px solid #E8E8EA', fontFamily: M }}>
              <option value="all">All Types</option>
              {DISRUPTION_TYPES.map((dt) => <option key={dt} value={dt}>{TRIGGERS[dt].label}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E8EA' }}>
                {['Date', 'Type', 'City', 'Severity', 'Value / Threshold', 'Status', 'Claims'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: '#6B7280', fontFamily: M }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const ROW_GRADS = [
                  'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))',
                  'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(6,182,212,0.06))',
                  'linear-gradient(135deg, rgba(236,72,153,0.05), rgba(248,113,113,0.05))',
                  'linear-gradient(135deg, rgba(20,184,166,0.06), rgba(34,197,94,0.06))',
                  'linear-gradient(135deg, rgba(249,115,22,0.05), rgba(250,204,21,0.05))',
                  'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(236,72,153,0.05))',
                  'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(59,130,246,0.05))',
                  'linear-gradient(135deg, rgba(34,197,94,0.05), rgba(132,204,22,0.05))',
                ];
                const ROW_CITY_COLORS = [NEON.indigo, NEON.blue, NEON.pink, NEON.teal, NEON.orange, NEON.purple, NEON.cyan, NEON.green];
                return filteredEvents.map((event, idx) => {
                  const eventType = event.event_type as DisruptionType;
                  const trigger = TRIGGERS[eventType];
                  const badge = TYPE_BADGE[event.event_type] || { bg: 'rgba(107,114,128,0.1)', color: '#6B7280', border: '#6B7280' };
                  const isActive = !event.resolved_at;
                  const time = new Date(event.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={event.id} className="admin-row" style={{ borderBottom: '1px solid #F3F4F6', background: ROW_GRADS[idx % ROW_GRADS.length], transition: 'all 0.2s ease', cursor: 'pointer' }}>
                      <td className="px-4 py-3" style={{ fontSize: 12, color: '#6B7280', fontFamily: M }}>{time}</td>
                      <td className="px-4 py-3">
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, display: 'inline-block', fontFamily: M }}>
                          {trigger?.label || event.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: ROW_CITY_COLORS[idx % ROW_CITY_COLORS.length] }}>{event.city}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div style={{ width: 40, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                            <div style={{ width: `${(event.severity_score / 10) * 100}%`, height: '100%', borderRadius: 3, background: event.severity_score > 7 ? NEON.red : event.severity_score > 4 ? NEON.yellow : NEON.green }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: event.severity_score > 7 ? NEON.red : event.severity_score > 4 ? '#a16207' : NEON.green, fontFamily: M }}>{event.severity_score.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#6B7280', fontSize: 12 }}>
                        {event.trigger_value ?? '-'} / {event.trigger_threshold ?? '-'}
                        {trigger && <span style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 4 }}>{trigger.unit}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, display: 'inline-block', fontFamily: M, background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(156,163,175,0.08)', color: isActive ? '#16a34a' : '#9CA3AF', border: isActive ? '1px solid #22C55E' : '1px solid #D1D5DB' }}>
                          {isActive ? 'Active' : 'Resolved'}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', fontFamily: M }}>{claimCounts[event.id] || 0}</td>
                    </tr>
                  );
                });
              })()}
              {filteredEvents.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px 0', textAlign: 'center', color: '#9CA3AF' }}>No trigger events found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
