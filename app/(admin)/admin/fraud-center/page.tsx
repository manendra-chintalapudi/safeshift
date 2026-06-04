'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TRIGGERS, FRAUD } from '@/lib/config/constants';
import type { DisruptionType } from '@/lib/config/constants';
import {
  ShieldAlert, AlertTriangle, Users, Activity, Eye, RefreshCw, Clock,
  MapPin, BarChart3, UserCheck, MapPinOff, UsersRound, Layers,
  FlaskConical, Sparkles, Target, ShieldCheck,
} from 'lucide-react';
import { computeFraudScore, type FraudSignalsInput } from '@/lib/fraud/scoring';

/* ═══════ Types ═══════ */

interface ClaimRow {
  id: string;
  profile_id: string;
  disruption_event_id: string;
  payout_amount_inr: number;
  status: string;
  fraud_score: number;
  is_flagged: boolean;
  flag_reason: string | null;
  fraud_signals: Record<string, boolean>;
  gate2_passed: boolean | null;
  activity_minutes: number | null;
  gps_within_zone: boolean | null;
  created_at: string;
  profiles: { full_name: string | null; city: string | null; trust_score: number } | null;
  live_disruption_events: { event_type: string; city: string; severity_score: number } | null;
}

interface ClusterRow {
  disruption_event_id: string;
  event_type: string | null;
  city: string | null;
  claim_count: number;
  window_seconds: number;
  unique_devices: number;
  flag_rate: number;
  first_claim_at: string;
  last_claim_at: string;
}

/* ═══════ Palette ═══════ */

const F = "var(--font-inter),'Inter',sans-serif";
const M = "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace";

// Badges shown on per-claim rows. New weighted signals up top; legacy
// (system-health) signals kept so historical DB rows still render a label.
const SIGNAL_CONFIG: Record<string, { label: string; icon: typeof AlertTriangle; color: string; weight: number }> = {
  trust_history:        { label: 'Prior History & Trust', icon: UserCheck,     color: '#6366F1', weight: FRAUD.WEIGHTS.trust_history },
  location_anomaly:     { label: 'Location Integrity',    icon: MapPin,        color: '#EC4899', weight: FRAUD.WEIGHTS.location_anomaly },
  cluster:              { label: 'Cluster / Syndicate',   icon: Users,         color: '#3B82F6', weight: FRAUD.WEIGHTS.cluster },
  duplicate:            { label: 'Duplicate Claim',       icon: AlertTriangle, color: '#EF4444', weight: 0 },
  rapid_claims:         { label: 'Rapid Claims',          icon: Clock,         color: '#F59E0B', weight: 0 },
  weather_mismatch:     { label: 'Weather Mismatch',      icon: Activity,      color: '#8B5CF6', weight: 0 },
  daily_limit_exceeded: { label: 'Daily Limit',           icon: BarChart3,     color: '#F97316', weight: 0 },
};

const ROW_GRADS = [
  'linear-gradient(90deg, rgba(99,102,241,0.05), rgba(139,92,246,0.02))',
  'linear-gradient(90deg, rgba(236,72,153,0.04), rgba(248,113,113,0.02))',
  'linear-gradient(90deg, rgba(59,130,246,0.04), rgba(6,182,212,0.02))',
  'linear-gradient(90deg, rgba(20,184,166,0.04), rgba(34,197,94,0.02))',
  'linear-gradient(90deg, rgba(249,115,22,0.04), rgba(250,204,21,0.02))',
];

/* ═══════ Simulator data ═══════ */

type Preset = 'clean' | 'spoof' | 'ring' | 'mixed';

const PRESETS: Record<Preset, { label: string; desc: string; icon: typeof UserCheck; gradient: string; input: FraudSignalsInput }> = {
  clean: {
    label: 'Honest driver',
    desc: 'Long tenure, clean history, GPS matches IP',
    icon: ShieldCheck,
    gradient: 'linear-gradient(135deg, #22C55E, #16A34A)',
    input: {
      trust_history:    { trustScore: 0.85, priorFlaggedCount: 0, confirmedFraudCount: 0, tenureMonths: 14 },
      location_anomaly: { gpsToIpDistanceKm: 3, impossibleTravel: false },
      cluster:          { claimCountInWindow: 4, uniqueDevices: 4, sharedIpsAcrossProfiles: 0, lowGpsEntropy: false },
    },
  },
  spoof: {
    label: 'GPS spoof',
    desc: 'Phone GPS disagrees with IP, impossible travel',
    icon: MapPinOff,
    gradient: 'linear-gradient(135deg, #EC4899, #F97316)',
    input: {
      trust_history:    { trustScore: 0.45, priorFlaggedCount: 1, confirmedFraudCount: 0, tenureMonths: 2 },
      location_anomaly: { gpsToIpDistanceKm: 180, impossibleTravel: true },
      cluster:          { claimCountInWindow: 2, uniqueDevices: 2, sharedIpsAcrossProfiles: 0, lowGpsEntropy: false },
    },
  },
  ring: {
    label: 'Fraud ring',
    desc: 'Many accounts, shared devices and IPs, clustered GPS',
    icon: UsersRound,
    gradient: 'linear-gradient(135deg, #3B82F6, #6366F1)',
    input: {
      trust_history:    { trustScore: 0.5, priorFlaggedCount: 0, confirmedFraudCount: 0, tenureMonths: 1 },
      location_anomaly: { gpsToIpDistanceKm: 8, impossibleTravel: false },
      cluster:          { claimCountInWindow: 25, uniqueDevices: 6, sharedIpsAcrossProfiles: 3, lowGpsEntropy: true },
    },
  },
  mixed: {
    label: 'Mixed signals',
    desc: 'Some concerns across multiple axes',
    icon: Layers,
    gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)',
    input: {
      trust_history:    { trustScore: 0.4, priorFlaggedCount: 2, confirmedFraudCount: 1, tenureMonths: 4 },
      location_anomaly: { gpsToIpDistanceKm: 70, impossibleTravel: false },
      cluster:          { claimCountInWindow: 12, uniqueDevices: 5, sharedIpsAcrossProfiles: 1, lowGpsEntropy: false },
    },
  },
};

const SIGNAL_ICONS = {
  trust_history: UserCheck,
  location_anomaly: MapPin,
  cluster: Users,
} as const;

const SIGNAL_GRADS = {
  trust_history: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
  location_anomaly: 'linear-gradient(135deg, #EC4899, #F43F5E)',
  cluster: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
} as const;

const DECISION_META = {
  auto_approve: { label: 'Auto-approve → pay instantly', color: '#22C55E', Icon: ShieldCheck },
  flag:         { label: 'Approve but flag for monitoring', color: '#F59E0B', Icon: AlertTriangle },
  manual_review:{ label: 'Send to manual review', color: '#EF4444', Icon: ShieldAlert },
} as const;

/* ═══════ Page ═══════ */

export default function FraudCenterPage() {
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [clusters, setClusters] = useState<ClusterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'simulator' | 'flagged' | 'clusters'>('simulator');

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [claimsRes, clustersRes] = await Promise.all([
      supabase.from('parametric_claims')
        .select('*, profiles(full_name, city, trust_score), live_disruption_events(event_type, city, severity_score)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('fraud_cluster_signals')
        .select('*')
        .order('claim_count', { ascending: false })
        .limit(20),
    ]);
    setClaims((claimsRes.data as unknown as ClaimRow[]) || []);
    setClusters((clustersRes.data as unknown as ClusterRow[]) || []);
    setLoading(false);
  }, []);

  // setState calls happen after await inside loadData — linter can't statically prove that.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  /* Computed */
  const totalClaims = claims.length;
  const flaggedClaims = useMemo(() => claims.filter(c => c.is_flagged), [claims]);
  const pendingReview = useMemo(() => claims.filter(c => c.status === 'pending_review'), [claims]);
  const rejectedClaims = useMemo(() => claims.filter(c => c.status === 'rejected'), [claims]);
  const avgFraudScore = useMemo(() => claims.length > 0 ? claims.reduce((s, c) => s + c.fraud_score, 0) / claims.length : 0, [claims]);

  /* Review handler */
  async function handleReview(claimId: string, action: 'approve' | 'reject') {
    try {
      await fetch('/api/admin/review-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: claimId, action }),
      });
      await loadData();
    } catch { /* best effort */ }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #F3F4F6', borderTopColor: '#EF4444' }} />
    </div>
  );

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes fSlide { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .f-s { animation: fSlide 0.4s ease both; }
        .f-s1{animation-delay:.05s} .f-s2{animation-delay:.1s} .f-s3{animation-delay:.15s} .f-s4{animation-delay:.2s}
        @keyframes simPulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.0);} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0.10);} }
        .sim-triggered { animation: simPulse 2.4s ease-in-out infinite; }
        @keyframes simPop { 0%{transform:scale(0.96); opacity:0.4} 100%{transform:scale(1); opacity:1} }
        .sim-pop { animation: simPop 0.25s ease-out; }
        @keyframes simGrow { from{width:0} }
        .sim-grow { animation: simGrow 0.5s ease-out; }
        .sim-preset { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .sim-preset:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(99,102,241,0.18); }
        .sim-slider { accent-color: #8B5CF6; }
      `}</style>

      <div className="flex items-center justify-between">
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: F }}>Fraud Center</h1>
        <button onClick={() => { setLoading(true); loadData(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, border: '1px solid #E8E8EA', background: '#fff', color: '#6B7280', cursor: 'pointer', fontFamily: M }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="f-s f-s1 grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Claims', value: totalClaims, gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)', icon: BarChart3 },
          { label: 'Flagged', value: flaggedClaims.length, gradient: 'linear-gradient(135deg, #F97316, #FACC15)', icon: AlertTriangle },
          { label: 'Fraud Rejected', value: rejectedClaims.length, gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', icon: ShieldAlert },
          { label: 'Legacy Pending', value: pendingReview.length, gradient: 'linear-gradient(135deg, #6B7280, #9CA3AF)', icon: Eye },
          { label: 'Avg Fraud Score', value: (avgFraudScore * 100).toFixed(0) + '%', gradient: 'linear-gradient(135deg, #14B8A6, #22C55E)', icon: Activity },
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

      {/* Tabs */}
      <div className="f-s f-s2 flex gap-2">
        {[
          { id: 'simulator' as const, label: 'Fraud Simulator', icon: FlaskConical },
          { id: 'flagged' as const, label: `Flagged & Rejected (${flaggedClaims.length + rejectedClaims.length})`, icon: AlertTriangle },
          { id: 'clusters' as const, label: `Cluster Signals (${clusters.length})`, icon: Users },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: M,
              background: tab === t.id ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#fff',
              color: tab === t.id ? '#fff' : '#6B7280',
              border: tab === t.id ? 'none' : '1px solid #E8E8EA',
            }}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══════ Tab: Fraud Simulator ═══════ */}
      {tab === 'simulator' && <SimulatorTab />}

      {/* ═══════ Tab: Flagged Claims ═══════ */}
      {tab === 'flagged' && (
        <div className="f-s f-s3 rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 16 }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid #E8E8EA' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', fontFamily: F }}>Flagged & Auto-Rejected Claims</h3>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.06), rgba(236,72,153,0.03))' }}>
                  {['Driver', 'City', 'Event', 'Fraud Score', 'Signals', 'Gate 2', 'Trust', 'Reason', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide" style={{ color: '#6B7280', fontFamily: M }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...rejectedClaims, ...flaggedClaims.filter(c => c.status !== 'rejected')].map((claim, idx) => {
                  const scoreColor = claim.fraud_score >= 0.7 ? '#EF4444' : claim.fraud_score >= 0.3 ? '#F59E0B' : '#22C55E';
                  const activeSignals = Object.entries(claim.fraud_signals || {}).filter(([, v]) => v).map(([k]) => k);
                  return (
                    <tr key={claim.id} style={{ borderTop: '1px solid #F3F4F6', background: ROW_GRADS[idx % ROW_GRADS.length], transition: 'all 0.15s' }}>
                      <td className="px-3 py-2.5 font-medium" style={{ color: '#1A1A1A', fontSize: 12 }}>{claim.profiles?.full_name || 'Unknown'}</td>
                      <td className="px-3 py-2.5" style={{ color: '#6B7280', fontSize: 12 }}>{claim.profiles?.city || '-'}</td>
                      <td className="px-3 py-2.5">
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(139,92,246,0.08)', color: '#8B5CF6', fontFamily: M }}>
                          {TRIGGERS[claim.live_disruption_events?.event_type as DisruptionType]?.label || claim.live_disruption_events?.event_type || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div style={{ width: 32, height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                            <div style={{ width: `${claim.fraud_score * 100}%`, height: '100%', borderRadius: 3, background: scoreColor }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor, fontFamily: M }}>{(claim.fraud_score * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {activeSignals.map(s => {
                            const cfg = SIGNAL_CONFIG[s];
                            return cfg ? (
                              <span key={s} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: `${cfg.color}15`, color: cfg.color, fontFamily: M, fontWeight: 600 }}>{cfg.label}</span>
                            ) : null;
                          })}
                          {activeSignals.length === 0 && <span style={{ fontSize: 10, color: '#D1D5DB' }}>none</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8, fontFamily: M, background: claim.gate2_passed ? 'rgba(34,197,94,0.1)' : claim.gate2_passed === false ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: claim.gate2_passed ? '#22C55E' : claim.gate2_passed === false ? '#EF4444' : '#F59E0B' }}>
                          {claim.gate2_passed ? 'Pass' : claim.gate2_passed === false ? 'Fail' : 'Pending'}
                        </span>
                        {claim.activity_minutes != null && <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2, fontFamily: M }}>{claim.activity_minutes}min | GPS: {claim.gps_within_zone ? 'Yes' : 'No'}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span style={{ fontSize: 11, fontWeight: 700, color: (claim.profiles?.trust_score ?? 0.5) < 0.3 ? '#EF4444' : (claim.profiles?.trust_score ?? 0.5) < 0.5 ? '#F59E0B' : '#22C55E', fontFamily: M }}>
                          {((claim.profiles?.trust_score ?? 0.5) * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5" style={{ maxWidth: 180 }}>
                        <span style={{ fontSize: 10, color: '#6B7280', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{claim.flag_reason || '-'}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {claim.status === 'pending_review' ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleReview(claim.id, 'approve')} style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: '#fff', fontFamily: M }}>Approve</button>
                            <button onClick={() => handleReview(claim.id, 'reject')} style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff', fontFamily: M }}>Reject</button>
                          </div>
                        ) : (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 10, fontFamily: M, display: 'inline-block',
                            background: claim.status === 'rejected' ? 'linear-gradient(135deg, #EF4444, #DC2626)' : claim.status === 'paid' ? 'linear-gradient(135deg, #22C55E, #16A34A)' : claim.status === 'approved' ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                            color: claim.status === 'rejected' || claim.status === 'paid' ? '#fff' : claim.status === 'approved' ? '#22C55E' : '#6B7280',
                          }}>{claim.status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {pendingReview.length === 0 && flaggedClaims.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>No flagged or pending claims</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ Tab: Cluster Signals ═══════ */}
      {tab === 'clusters' && (
        <div className="f-s f-s3 rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 16 }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid #E8E8EA' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', fontFamily: F }}>Syndicate / Cluster Detection</h3>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Flags when {FRAUD.CLUSTER_THRESHOLD}+ claims fire on the same event within {FRAUD.CLUSTER_WINDOW_MINUTES} minutes with shared devices/IPs</p>
          </div>
          {clusters.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.06), rgba(6,182,212,0.03))' }}>
                    {['Event Type', 'City', 'Claims', 'Window', 'Unique Devices', 'Flag Rate', 'First Claim', 'Last Claim'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide" style={{ color: '#6B7280', fontFamily: M }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clusters.map((c, idx) => (
                    <tr key={c.disruption_event_id} style={{ borderTop: '1px solid #F3F4F6', background: ROW_GRADS[idx % ROW_GRADS.length] }}>
                      <td className="px-4 py-2.5" style={{ color: '#1A1A1A', fontSize: 12, fontWeight: 500 }}>{TRIGGERS[c.event_type as DisruptionType]?.label || c.event_type || '-'}</td>
                      <td className="px-4 py-2.5" style={{ color: '#6B7280', fontSize: 12 }}>{c.city || '-'}</td>
                      <td className="px-4 py-2.5" style={{ fontSize: 14, fontWeight: 800, color: c.claim_count >= FRAUD.CLUSTER_THRESHOLD ? '#EF4444' : '#1A1A1A', fontFamily: M }}>{c.claim_count}</td>
                      <td className="px-4 py-2.5 mono" style={{ fontSize: 11, color: '#6B7280' }}>{Math.round(c.window_seconds / 60)}min</td>
                      <td className="px-4 py-2.5 mono" style={{ fontSize: 11, color: '#6B7280' }}>{c.unique_devices}</td>
                      <td className="px-4 py-2.5">
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.flag_rate > 0.5 ? '#EF4444' : '#F59E0B', fontFamily: M }}>{(c.flag_rate * 100).toFixed(0)}%</span>
                      </td>
                      <td className="px-4 py-2.5 mono" style={{ fontSize: 10, color: '#9CA3AF' }}>{new Date(c.first_claim_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-2.5 mono" style={{ fontSize: 10, color: '#9CA3AF' }}>{new Date(c.last_claim_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center" style={{ color: '#9CA3AF' }}>No cluster signals detected yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════ Simulator ═══════ */

function SimulatorTab() {
  const [preset, setPreset] = useState<Preset>('mixed');
  const [input, setInput] = useState<FraudSignalsInput>(PRESETS.mixed.input);

  const result = useMemo(() => computeFraudScore(input), [input]);

  function applyPreset(p: Preset) {
    setPreset(p);
    setInput(PRESETS[p].input);
  }

  const decision = DECISION_META[result.decision];

  return (
    <div className="f-s f-s3 space-y-5">
      {/* Intro */}
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.03))', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16 }}>
        <div className="flex items-start gap-3">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={17} style={{ color: '#fff' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', fontFamily: F, marginBottom: 4 }}>
              Simulate a claim&rsquo;s fraud score
            </h3>
            <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.55 }}>
              Pick a scenario or tune each signal manually. The score updates instantly. Only signals a driver or
              ring can actually control are weighted — duplicate / rapid / weather-mismatch are backend health checks
              surfaced elsewhere.
            </p>
          </div>
        </div>
      </div>

      {/* Preset scenarios */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: M, marginBottom: 10 }}>
          Preset scenarios
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(PRESETS) as Preset[]).map(p => {
            const cfg = PRESETS[p];
            const Icon = cfg.icon;
            const active = preset === p;
            return (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className="sim-preset rounded-2xl p-4 text-left"
                style={{
                  background: active ? cfg.gradient : '#fff',
                  color: active ? '#fff' : '#1A1A1A',
                  border: active ? 'none' : '1px solid #E8E8EA',
                  cursor: 'pointer',
                  borderRadius: 16,
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: active ? 'rgba(255,255,255,0.2)' : `${cfg.gradient}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 8,
                }}>
                  <Icon size={16} style={{ color: '#fff' }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: F, marginBottom: 2 }}>{cfg.label}</div>
                <div style={{ fontSize: 10, opacity: active ? 0.85 : 0.55, fontFamily: F, lineHeight: 1.4 }}>{cfg.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main grid: signal cards + score panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,360px)] gap-4">
        <div className="space-y-4">
          <SignalCard
            signal="trust_history"
            title="Prior history & trust"
            weight={FRAUD.WEIGHTS.trust_history}
            blurb="Past flagged claims, confirmed fraud, and how long the account has been clean."
            contribution={result.contributions.find(c => c.signal === 'trust_history')!}
          >
            <NumberRow label="Trust score (0–1)" min={0} max={1} step={0.05}
              value={input.trust_history.trustScore}
              onChange={v => setInput({ ...input, trust_history: { ...input.trust_history, trustScore: v } })} />
            <NumberRow label="Prior flagged claims" min={0} max={20} step={1}
              value={input.trust_history.priorFlaggedCount}
              onChange={v => setInput({ ...input, trust_history: { ...input.trust_history, priorFlaggedCount: v } })} />
            <NumberRow label="Confirmed fraud" min={0} max={10} step={1}
              value={input.trust_history.confirmedFraudCount}
              onChange={v => setInput({ ...input, trust_history: { ...input.trust_history, confirmedFraudCount: v } })} />
            <NumberRow label="Tenure (months)" min={0} max={48} step={1}
              value={input.trust_history.tenureMonths}
              onChange={v => setInput({ ...input, trust_history: { ...input.trust_history, tenureMonths: v } })} />
          </SignalCard>

          <SignalCard
            signal="location_anomaly"
            title="Location integrity"
            weight={FRAUD.WEIGHTS.location_anomaly}
            blurb="GPS comes from the phone. IP comes from the network. A big mismatch means the phone is claiming to be somewhere it isn&rsquo;t."
            contribution={result.contributions.find(c => c.signal === 'location_anomaly')!}
          >
            <NumberRow label="GPS ↔ IP distance (km)" min={0} max={500} step={1}
              value={input.location_anomaly.gpsToIpDistanceKm ?? 0}
              onChange={v => setInput({ ...input, location_anomaly: { ...input.location_anomaly, gpsToIpDistanceKm: v } })} />
            <BoolRow label="Impossible travel (>50km in <30min)"
              value={input.location_anomaly.impossibleTravel}
              onChange={v => setInput({ ...input, location_anomaly: { ...input.location_anomaly, impossibleTravel: v } })} />
          </SignalCard>

          <SignalCard
            signal="cluster"
            title="Ring / cluster"
            weight={FRAUD.WEIGHTS.cluster}
            blurb="Many accounts claiming the same event from shared devices, IPs, or a single GPS spot."
            contribution={result.contributions.find(c => c.signal === 'cluster')!}
          >
            <NumberRow label="Claims on this event in 10min" min={0} max={100} step={1}
              value={input.cluster.claimCountInWindow}
              onChange={v => setInput({ ...input, cluster: { ...input.cluster, claimCountInWindow: v } })} />
            <NumberRow label="Unique devices among those claims" min={0} max={100} step={1}
              value={input.cluster.uniqueDevices}
              onChange={v => setInput({ ...input, cluster: { ...input.cluster, uniqueDevices: v } })} />
            <NumberRow label="Shared IPs across profiles" min={0} max={20} step={1}
              value={input.cluster.sharedIpsAcrossProfiles}
              onChange={v => setInput({ ...input, cluster: { ...input.cluster, sharedIpsAcrossProfiles: v } })} />
            <BoolRow label="Low GPS entropy (everyone at same spot)"
              value={input.cluster.lowGpsEntropy}
              onChange={v => setInput({ ...input, cluster: { ...input.cluster, lowGpsEntropy: v } })} />
          </SignalCard>
        </div>

        <aside className="lg:sticky lg:top-6 self-start space-y-4">
          {/* Score card */}
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: `2px solid ${decision.color}`, borderRadius: 16, transition: 'border-color 0.25s' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: M }}>
              Fraud score
            </div>
            <div key={Math.round(result.score * 100)} className="sim-pop" style={{ fontSize: 54, fontWeight: 800, color: decision.color, fontFamily: F, lineHeight: 1.05, marginTop: 6 }}>
              {(result.score * 100).toFixed(0)}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              <decision.Icon size={14} style={{ color: decision.color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: decision.color, fontFamily: F }}>{decision.label}</span>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 14, height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                width: `${result.score * 100}%`,
                height: '100%',
                borderRadius: 4,
                background: decision.color,
                transition: 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
              }} />
              {/* Threshold markers */}
              <div title="Auto-approve threshold" style={{ position: 'absolute', top: -2, left: `${FRAUD.AUTO_APPROVE_THRESHOLD * 100}%`, width: 2, height: 12, background: '#22C55E', opacity: 0.5 }} />
              <div title="Manual review threshold" style={{ position: 'absolute', top: -2, left: `${FRAUD.MANUAL_REVIEW_THRESHOLD * 100}%`, width: 2, height: 12, background: '#EF4444', opacity: 0.5 }} />
            </div>
            <div className="flex justify-between mt-1" style={{ fontSize: 9, color: '#9CA3AF', fontFamily: M }}>
              <span>0</span>
              <span style={{ color: '#22C55E' }}>auto-pay &lt; {Math.round(FRAUD.AUTO_APPROVE_THRESHOLD * 100)}</span>
              <span style={{ color: '#EF4444' }}>review ≥ {Math.round(FRAUD.MANUAL_REVIEW_THRESHOLD * 100)}</span>
              <span>100</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: M, marginBottom: 10 }}>
              Score breakdown
            </div>
            <div className="space-y-3">
              {result.contributions.map(c => {
                const sig = c.signal as keyof typeof SIGNAL_ICONS;
                const Icon = SIGNAL_ICONS[sig];
                const grad = SIGNAL_GRADS[sig];
                const triggered = c.triggered;
                return (
                  <div key={c.signal}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={12} style={{ color: '#fff' }} />
                        </div>
                        <div className="min-w-0">
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', fontFamily: F }}>
                            {c.signal === 'trust_history' ? 'Trust' : c.signal === 'location_anomaly' ? 'Location' : 'Cluster'}
                          </div>
                          <div style={{ fontSize: 9, color: '#9CA3AF', fontFamily: M }}>
                            sev {(c.severity * 100).toFixed(0)}% × weight {Math.round(c.weight * 100)}%
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: triggered ? '#EF4444' : '#D1D5DB', fontFamily: F }}>
                        +{(c.contribution * 100).toFixed(0)}
                      </div>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#F3F4F6', overflow: 'hidden' }}>
                      <div style={{
                        width: `${c.contribution * 100 / (c.weight || 1)}%`,
                        height: '100%',
                        borderRadius: 2,
                        background: grad,
                        transition: 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weights pie-ish */}
            <div style={{ marginTop: 14, padding: 10, borderRadius: 10, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#9CA3AF', fontFamily: M, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Model weights
              </div>
              <div className="flex h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                <div title={`Trust ${Math.round(FRAUD.WEIGHTS.trust_history * 100)}%`} style={{ width: `${FRAUD.WEIGHTS.trust_history * 100}%`, background: SIGNAL_GRADS.trust_history }} />
                <div title={`Location ${Math.round(FRAUD.WEIGHTS.location_anomaly * 100)}%`} style={{ width: `${FRAUD.WEIGHTS.location_anomaly * 100}%`, background: SIGNAL_GRADS.location_anomaly }} />
                <div title={`Cluster ${Math.round(FRAUD.WEIGHTS.cluster * 100)}%`} style={{ width: `${FRAUD.WEIGHTS.cluster * 100}%`, background: SIGNAL_GRADS.cluster }} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ═══════ Simulator sub-components ═══════ */

type ContributionShape = ReturnType<typeof computeFraudScore>['contributions'][number];

function SignalCard(props: {
  signal: keyof typeof SIGNAL_ICONS;
  title: string;
  weight: number;
  blurb: string;
  contribution: ContributionShape;
  children: React.ReactNode;
}) {
  const { signal, title, weight, blurb, contribution, children } = props;
  const Icon = SIGNAL_ICONS[signal];
  const grad = SIGNAL_GRADS[signal];
  const active = contribution.triggered;

  return (
    <section
      className={`rounded-2xl p-5 ${active ? 'sim-triggered' : ''}`}
      style={{
        background: '#fff',
        border: `1px solid ${active ? '#EF4444' : '#E8E8EA'}`,
        borderRadius: 16,
        transition: 'border-color 0.25s',
      }}
    >
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={17} style={{ color: '#fff' }} />
          </div>
          <div className="min-w-0">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', fontFamily: F }}>{title}</h3>
            <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2, lineHeight: 1.45 }}>{blurb}</p>
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
          background: `${grad}`, color: '#fff', fontFamily: M, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {Math.round(weight * 100)}%
        </span>
      </div>
      <div className="space-y-3">{children}</div>

      <div className="flex items-center gap-2 mt-3" style={{ padding: '8px 10px', borderRadius: 10, background: active ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.05)', border: `1px solid ${active ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.12)'}` }}>
        <Target size={12} style={{ color: active ? '#EF4444' : '#22C55E', flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: active ? '#B91C1C' : '#15803D', fontFamily: F, flex: 1 }}>{contribution.reason}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: active ? '#EF4444' : '#9CA3AF', fontFamily: M, flexShrink: 0 }}>
          +{(contribution.contribution * 100).toFixed(0)}
        </span>
      </div>
    </section>
  );
}

function NumberRow({ label, value, onChange, min, max, step }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number;
}) {
  return (
    <label className="block">
      <div className="flex justify-between items-center mb-1">
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', fontFamily: F }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', fontFamily: M, padding: '2px 8px', borderRadius: 6, background: '#F3F4F6' }}>
          {value}
        </span>
      </div>
      <input
        className="sim-slider w-full"
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function BoolRow({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between"
      style={{
        padding: '9px 12px', borderRadius: 10,
        background: value ? 'rgba(239,68,68,0.06)' : '#F9FAFB',
        border: `1px solid ${value ? 'rgba(239,68,68,0.25)' : '#E8E8EA'}`,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: value ? '#B91C1C' : '#4B5563', fontFamily: F, textAlign: 'left' }}>{label}</span>
      <span style={{
        width: 34, height: 20, borderRadius: 10, position: 'relative',
        background: value ? '#EF4444' : '#D1D5DB', transition: 'background 0.18s', flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 2, left: value ? 16 : 2, width: 16, height: 16, borderRadius: '50%',
          background: '#fff', transition: 'left 0.18s', boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }} />
      </span>
    </button>
  );
}
