'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Wifi, Server, Database, Cloud, Zap, RefreshCw, Activity } from 'lucide-react';

/* ═══════ Types ═══════ */

interface EndpointStatus {
  name: string;
  url: string;
  status: 'up' | 'down' | 'slow' | 'checking';
  latency: number | null;
  lastChecked: string;
  icon: typeof Server;
  detail?: string;
}

const F = "var(--font-inter),'Inter',sans-serif";
const M = "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace";

const STATUS_CONFIG = {
  up:       { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', gradient: 'linear-gradient(135deg, #22C55E, #16A34A)', label: 'Operational' },
  slow:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', gradient: 'linear-gradient(135deg, #F59E0B, #FACC15)', label: 'Slow' },
  down:     { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  gradient: 'linear-gradient(135deg, #EF4444, #EC4899)', label: 'Down' },
  checking: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', gradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA)', label: 'Checking...' },
};

/* ═══════ Page ═══════ */

export default function ApiHealthPage() {
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>([]);
  const [checking, setChecking] = useState(false);
  const [history, setHistory] = useState<{ time: string; upCount: number; total: number }[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const ML_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8001';

  const checkAll = useCallback(async () => {
    setChecking(true);

    const checks: Omit<EndpointStatus, 'status' | 'latency' | 'lastChecked'>[] = [
      { name: 'ML Service Health', url: `${ML_URL}/health`, icon: Server, detail: 'FastAPI ML prediction service' },
      { name: 'Premium Prediction', url: `${ML_URL}/predict/premium`, icon: Zap, detail: 'POST — dynamic premium calculation' },
      { name: 'Rainfall Prediction', url: `${ML_URL}/predict/rainfall`, icon: Cloud, detail: 'POST — rainfall probability model' },
      { name: 'Wind Prediction', url: `${ML_URL}/predict/wind`, icon: Cloud, detail: 'POST — wind/cyclone probability model' },
      { name: 'AQI Prediction', url: `${ML_URL}/predict/aqi`, icon: Activity, detail: 'POST — GRAP-IV AQI forecast' },
      { name: 'Zone Data', url: `${ML_URL}/zones/mumbai`, icon: Database, detail: 'GET — zone risk scores per city' },
      { name: 'Open-Meteo Weather', url: 'https://api.open-meteo.com/v1/forecast?latitude=19&longitude=72&current=temperature_2m', icon: Cloud, detail: 'External — real-time weather data' },
      { name: 'Open-Meteo AQI', url: 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=19&longitude=72&current=us_aqi', icon: Wifi, detail: 'External — air quality index' },
    ];

    const results: EndpointStatus[] = await Promise.all(
      checks.map(async (ep): Promise<EndpointStatus> => {
        const start = Date.now();
        try {
          const isPost = ep.url.includes('/predict/');
          const opts: RequestInit = isPost
            ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: 'mumbai', tier: 'normal' }), signal: AbortSignal.timeout(10000) }
            : { signal: AbortSignal.timeout(10000) };
          const res = await fetch(ep.url, opts);
          const latency = Date.now() - start;
          const status: EndpointStatus['status'] = res.ok ? (latency > 3000 ? 'slow' : 'up') : 'down';
          return { ...ep, status, latency, lastChecked: new Date().toISOString() };
        } catch {
          return { ...ep, status: 'down', latency: Date.now() - start, lastChecked: new Date().toISOString() };
        }
      })
    );

    setEndpoints(results);
    setHistory(prev => [...prev.slice(-29), { time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), upCount: results.filter(e => e.status === 'up').length, total: results.length }]);
    setChecking(false);
  }, [ML_URL]);

  useEffect(() => { checkAll(); }, [checkAll]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(checkAll, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, checkAll]);

  /* Computed */
  const upCount = endpoints.filter(e => e.status === 'up').length;
  const slowCount = endpoints.filter(e => e.status === 'slow').length;
  const downCount = endpoints.filter(e => e.status === 'down').length;
  const avgLatency = endpoints.length > 0 ? Math.round(endpoints.reduce((s, e) => s + (e.latency || 0), 0) / endpoints.length) : 0;
  const overallStatus = downCount > 0 ? 'down' : slowCount > 0 ? 'slow' : 'up';

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes hSlide { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes hPulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.3)} 50%{box-shadow:0 0 0 8px rgba(34,197,94,0)} }
        .h-s { animation: hSlide 0.4s ease both; }
        .h-s1 { animation-delay:0.05s } .h-s2 { animation-delay:0.1s } .h-s3 { animation-delay:0.15s } .h-s4 { animation-delay:0.2s }
        .pulse-green { animation: hPulse 2s ease-in-out infinite; }
      `}</style>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: F }}>API Health Monitor</h1>

      {/* Overall status banner */}
      <div className="h-s h-s1 rounded-2xl p-5 flex items-center gap-5" style={{ background: STATUS_CONFIG[overallStatus].gradient, color: '#fff', borderRadius: 16 }}>
        <div className={overallStatus === 'up' ? 'pulse-green' : ''} style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {overallStatus === 'up' ? <CheckCircle size={24} /> : overallStatus === 'slow' ? <Clock size={24} /> : <XCircle size={24} />}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: F }}>
            {overallStatus === 'up' ? 'All Systems Operational' : overallStatus === 'slow' ? 'Degraded Performance' : 'Service Disruption Detected'}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
            {upCount}/{endpoints.length} services up &middot; {slowCount} slow &middot; {downCount} down &middot; Avg latency: {avgLatency}ms
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={checkAll} disabled={checking} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, fontFamily: M }}>
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} /> {checking ? 'Checking...' : 'Re-check'}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontFamily: M }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: '#fff' }} /> Auto (30s)
          </label>
        </div>
      </div>

      {/* KPI cards */}
      <div className="h-s h-s2 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Services Up', value: upCount, icon: CheckCircle, gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)' },
          { label: 'Services Down', value: downCount, icon: XCircle, gradient: 'linear-gradient(135deg, #EF4444, #EC4899)' },
          { label: 'Avg Latency', value: `${avgLatency}ms`, icon: Clock, gradient: 'linear-gradient(135deg, #14B8A6, #22C55E)' },
          { label: 'Checks Run', value: history.length, icon: Activity, gradient: 'linear-gradient(135deg, #F97316, #FACC15)' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl p-4 relative overflow-hidden" style={{ background: k.gradient, color: '#fff', borderRadius: 16, transition: 'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(99,102,241,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ position: 'absolute', top: -8, right: -8, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <Icon size={16} style={{ opacity: 0.8, marginBottom: 4 }} />
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, fontFamily: M }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2, fontFamily: F }}>{k.value}</div>
            </div>
          );
        })}
      </div>

      {/* Uptime sparkline */}
      {history.length > 1 && (
        <div className="h-s h-s3 rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 16 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', fontFamily: F }}>Uptime History</h2>
            <span className="mono" style={{ fontSize: 11, color: '#9CA3AF' }}>Last {history.length} checks</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: 3, height: 40 }}>
            {history.map((h, i) => {
              const pct = h.total > 0 ? (h.upCount / h.total) * 100 : 0;
              const color = pct === 100 ? '#22C55E' : pct >= 75 ? '#F59E0B' : '#EF4444';
              return (
                <div key={i} title={`${h.time}: ${h.upCount}/${h.total} up`} style={{ flex: 1, height: `${Math.max(pct, 8)}%`, borderRadius: 3, background: color, transition: 'height 0.3s ease', cursor: 'pointer', minWidth: 6 }} />
              );
            })}
          </div>
        </div>
      )}

      {/* Endpoint status cards */}
      <div className="h-s h-s4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {endpoints.map((ep, idx) => {
          const st = STATUS_CONFIG[ep.status];
          const Icon = ep.icon;
          const latColor = (ep.latency || 0) > 3000 ? '#EF4444' : (ep.latency || 0) > 1000 ? '#F59E0B' : '#22C55E';
          const CARD_GRADS = [
            'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.03))',
            'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(6,182,212,0.03))',
            'linear-gradient(135deg, rgba(236,72,153,0.03), rgba(248,113,113,0.02))',
            'linear-gradient(135deg, rgba(20,184,166,0.04), rgba(34,197,94,0.03))',
          ];
          return (
            <div key={ep.name} className="rounded-2xl p-4" style={{ background: CARD_GRADS[idx % CARD_GRADS.length], border: `1px solid ${st.color}20`, borderRadius: 16, transition: 'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${st.color}15`; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} style={{ color: st.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', fontFamily: F }}>{ep.name}</div>
                    <div className="mono" style={{ fontSize: 10, color: '#9CA3AF' }}>{ep.detail}</div>
                  </div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color, fontFamily: M }}>{st.label}</span>
              </div>
              {/* Latency bar */}
              <div className="flex items-center gap-3">
                <span className="mono" style={{ fontSize: 10, color: '#9CA3AF', width: 50 }}>Latency</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: latColor, width: `${Math.min(((ep.latency || 0) / 5000) * 100, 100)}%`, transition: 'width 0.5s ease' }} />
                </div>
                <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: latColor, width: 50, textAlign: 'right' }}>{ep.latency != null ? `${ep.latency}ms` : '-'}</span>
              </div>
              {/* URL */}
              <div className="mono" style={{ fontSize: 9, color: '#D1D5DB', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.url}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
