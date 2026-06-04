'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Info, XCircle, Filter, RefreshCw, Terminal, Clock, Database, Search } from 'lucide-react';

/* ═══════ Types ═══════ */

interface LogRow {
  id: string;
  event_type: string;
  severity: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface TriggerLedgerRow {
  id: string;
  event_type: string | null;
  city: string | null;
  trigger_value: number | null;
  outcome: string | null;
  claims_created: number;
  payouts_initiated: number;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
}

/* ═══════ Palette ═══════ */

const SEV_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string; gradient: string }> = {
  info:    { icon: Info,           color: '#3B82F6', bg: 'rgba(59,130,246,0.08)',  gradient: 'linear-gradient(135deg, #3B82F6, #06B6D4)' },
  warning: { icon: AlertTriangle,  color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  gradient: 'linear-gradient(135deg, #F59E0B, #FACC15)' },
  error:   { icon: XCircle,        color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   gradient: 'linear-gradient(135deg, #EF4444, #EC4899)' },
};

const OUTCOME_CONFIG: Record<string, { color: string; bg: string }> = {
  triggered: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  no_pay:    { color: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
  deferred:  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  error:     { color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
};

const F = "var(--font-inter),'Inter',sans-serif";
const M = "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace";

const ROW_GRADS = [
  'linear-gradient(90deg, rgba(99,102,241,0.04), rgba(139,92,246,0.02))',
  'linear-gradient(90deg, rgba(59,130,246,0.04), rgba(6,182,212,0.02))',
  'linear-gradient(90deg, rgba(236,72,153,0.03), rgba(248,113,113,0.02))',
  'linear-gradient(90deg, rgba(20,184,166,0.04), rgba(34,197,94,0.02))',
  'linear-gradient(90deg, rgba(249,115,22,0.03), rgba(250,204,21,0.02))',
];

/* ═══════ Page ═══════ */

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [ledger, setLedger] = useState<TriggerLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSev, setFilterSev] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  async function loadData() {
    const supabase = createClient();
    const [logsRes, ledgerRes] = await Promise.all([
      supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('parametric_trigger_ledger').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setLogs((logsRes.data as unknown as LogRow[]) || []);
    setLedger((ledgerRes.data as unknown as TriggerLedgerRow[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(loadData, 10000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  /* Computed */
  const sevCounts = useMemo(() => {
    const c: Record<string, number> = { info: 0, warning: 0, error: 0 };
    for (const l of logs) c[l.severity] = (c[l.severity] || 0) + 1;
    return c;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (filterSev !== 'all') result = result.filter(l => l.severity === filterSev);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => l.event_type.toLowerCase().includes(q) || JSON.stringify(l.metadata).toLowerCase().includes(q));
    }
    return result;
  }, [logs, filterSev, searchQuery]);

  const avgLatency = useMemo(() => {
    const withLatency = ledger.filter(l => l.latency_ms != null);
    if (withLatency.length === 0) return 0;
    return Math.round(withLatency.reduce((s, l) => s + (l.latency_ms || 0), 0) / withLatency.length);
  }, [ledger]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #F3F4F6', borderTopColor: '#8B5CF6' }} />
    </div>
  );

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes logSlide { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .log-s { animation: logSlide 0.4s ease both; }
        .log-s1 { animation-delay:0.05s } .log-s2 { animation-delay:0.1s } .log-s3 { animation-delay:0.15s } .log-s4 { animation-delay:0.2s }
      `}</style>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: F }}>System Logs</h1>

      {/* KPI row */}
      <div className="log-s log-s1 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Logs', value: logs.length, gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)', icon: Terminal },
          { label: 'Errors', value: sevCounts.error, gradient: 'linear-gradient(135deg, #EF4444, #EC4899)', icon: XCircle },
          { label: 'Warnings', value: sevCounts.warning, gradient: 'linear-gradient(135deg, #F59E0B, #FACC15)', icon: AlertTriangle },
          { label: 'Avg Latency', value: `${avgLatency}ms`, gradient: 'linear-gradient(135deg, #14B8A6, #22C55E)', icon: Clock },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-2xl p-4 relative overflow-hidden" style={{ background: kpi.gradient, color: '#fff', borderRadius: 16, transition: 'all 0.25s ease' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(99,102,241,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ position: 'absolute', top: -8, right: -8, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <Icon size={16} style={{ opacity: 0.8, marginBottom: 4 }} />
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, fontFamily: M }}>{kpi.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2, fontFamily: F }}>{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="log-s log-s2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 10, padding: '5px 12px' }}>
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search logs..." style={{ border: 'none', outline: 'none', fontSize: 13, width: 180, fontFamily: F, background: 'transparent', color: '#1A1A1A' }} />
        </div>
        <div className="flex items-center gap-1">
          <Filter size={14} style={{ color: '#6B7280' }} />
          {['all', 'info', 'warning', 'error'].map(s => (
            <button key={s} onClick={() => setFilterSev(s)} style={{ padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, border: filterSev === s ? 'none' : '1px solid #E8E8EA', background: filterSev === s ? (SEV_CONFIG[s]?.gradient || 'linear-gradient(135deg, #6366F1, #8B5CF6)') : '#fff', color: filterSev === s ? '#fff' : '#6B7280', cursor: 'pointer', transition: 'all 0.2s', fontFamily: M }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} {s !== 'all' && `(${sevCounts[s] || 0})`}
            </button>
          ))}
        </div>
        <button onClick={() => { setLoading(true); loadData(); }} style={{ padding: '5px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, border: '1px solid #E8E8EA', background: '#fff', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: M }}>
          <RefreshCw size={12} /> Refresh
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280', cursor: 'pointer', fontFamily: M }}>
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: '#8B5CF6' }} />
          Auto-refresh (10s)
        </label>
      </div>

      {/* System Logs table */}
      <div className="log-s log-s3 rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 16 }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid #E8E8EA', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={16} style={{ color: '#6366F1' }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', fontFamily: F }}>Event Log</h2>
          <span className="mono" style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>{filteredLogs.length} entries</span>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.06), rgba(139,92,246,0.03))' }}>
                {['Severity', 'Event', 'Details', 'Time'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide" style={{ color: '#6B7280', fontFamily: M }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => {
                const sev = SEV_CONFIG[log.severity] || SEV_CONFIG.info;
                const Icon = sev.icon;
                const time = new Date(log.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const metaStr = JSON.stringify(log.metadata || {});
                return (
                  <tr key={log.id} className="admin-row" style={{ borderTop: '1px solid #F3F4F6', background: ROW_GRADS[idx % ROW_GRADS.length], transition: 'all 0.15s', cursor: 'pointer' }}>
                    <td className="px-4 py-2.5">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 16, background: sev.bg, color: sev.color, fontSize: 11, fontWeight: 600, fontFamily: M }}>
                        <Icon size={12} /> {log.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: '#1A1A1A', fontSize: 13 }}>{log.event_type}</td>
                    <td className="px-4 py-2.5" style={{ maxWidth: 300 }}>
                      <span className="mono text-xs" style={{ color: '#6B7280', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{metaStr.length > 80 ? metaStr.slice(0, 80) + '...' : metaStr}</span>
                    </td>
                    <td className="px-4 py-2.5 mono text-xs" style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>{time}</td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>No logs found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trigger Ledger */}
      <div className="log-s log-s4 rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 16 }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid #E8E8EA', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={16} style={{ color: '#14B8A6' }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', fontFamily: F }}>Trigger Processing Ledger</h2>
          <span className="mono" style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>{ledger.length} entries</span>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: 360, overflowY: 'auto' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, rgba(20,184,166,0.06), rgba(34,197,94,0.03))' }}>
                {['Event', 'City', 'Value', 'Outcome', 'Claims', 'Payouts', 'Latency', 'Error', 'Time'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide" style={{ color: '#6B7280', fontFamily: M }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry, idx) => {
                const oc = OUTCOME_CONFIG[entry.outcome || ''] || { color: '#6B7280', bg: 'rgba(107,114,128,0.08)' };
                const time = new Date(entry.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                const latencyColor = (entry.latency_ms || 0) > 5000 ? '#EF4444' : (entry.latency_ms || 0) > 2000 ? '#F59E0B' : '#22C55E';
                return (
                  <tr key={entry.id} className="admin-row" style={{ borderTop: '1px solid #F3F4F6', background: ROW_GRADS[idx % ROW_GRADS.length], transition: 'all 0.15s' }}>
                    <td className="px-3 py-2.5" style={{ color: '#1A1A1A', fontSize: 12 }}>{entry.event_type || '-'}</td>
                    <td className="px-3 py-2.5" style={{ color: '#6B7280', fontSize: 12 }}>{entry.city || '-'}</td>
                    <td className="px-3 py-2.5 mono" style={{ color: '#6B7280', fontSize: 11 }}>{entry.trigger_value ?? '-'}</td>
                    <td className="px-3 py-2.5">
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: oc.bg, color: oc.color, fontFamily: M }}>{entry.outcome || '-'}</span>
                    </td>
                    <td className="px-3 py-2.5 mono" style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{entry.claims_created}</td>
                    <td className="px-3 py-2.5 mono" style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{entry.payouts_initiated}</td>
                    <td className="px-3 py-2.5">
                      {entry.latency_ms != null ? (
                        <div className="flex items-center gap-2">
                          <div style={{ width: 28, height: 4, borderRadius: 2, background: '#F3F4F6', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min((entry.latency_ms / 5000) * 100, 100)}%`, height: '100%', borderRadius: 2, background: latencyColor }} />
                          </div>
                          <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: latencyColor }}>{entry.latency_ms}ms</span>
                        </div>
                      ) : <span style={{ color: '#D1D5DB', fontSize: 11 }}>-</span>}
                    </td>
                    <td className="px-3 py-2.5 mono text-xs" style={{ color: entry.error_message ? '#EF4444' : '#D1D5DB', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.error_message || '-'}</td>
                    <td className="px-3 py-2.5 mono text-xs" style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>{time}</td>
                  </tr>
                );
              })}
              {ledger.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>No ledger entries</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
