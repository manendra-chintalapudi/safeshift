'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTranslator } from '@/lib/i18n/translations';
import { TRIGGERS } from '@/lib/config/constants';
import type { DisruptionType } from '@/lib/config/constants';
import { getCityBySlug } from '@/lib/config/cities';

// Lazy-load the analytics/history tab content
const HistoryContent = lazy(() => import('@/app/(dashboard)/dashboard/history/page'));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DisruptionEvent {
  event_type: string;
  city: string;
  severity_score: number;
  trigger_value: number | null;
  trigger_threshold: number | null;
}

interface ClaimRow {
  id: string;
  payout_amount_inr: number;
  status: string;
  gate1_passed: boolean | null;
  gate2_passed: boolean | null;
  activity_minutes: number | null;
  gps_within_zone: boolean | null;
  is_flagged: boolean;
  created_at: string;
  live_disruption_events: DisruptionEvent | null;
}

interface DashboardFast {
  profile: {
    full_name: string | null;
    city: string;
    zone_name: string | null;
  } | null;
}

interface PayoutRow {
  id: string;
  claim_id: string;
  amount_inr: number;
  status: string;
  mock_upi_ref: string | null;
  created_at: string;
}

interface PolicyRow {
  id: string;
  final_premium_inr: number;
  payment_status: string;
  created_at: string;
}

interface LedgerEntry {
  type: 'premium' | 'payout';
  id: string;
  date: string;
  amount: number;
  status: string;
  ref: string;
}

// ---------------------------------------------------------------------------
// Disruption icons (inline SVG paths, no emoji)
// ---------------------------------------------------------------------------

const DISRUPTION_ICONS: Record<string, React.ReactNode> = {
  heavy_rainfall: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M16 14v6" /><path d="M8 14v6" /><path d="M12 16v6" />
    </svg>
  ),
  aqi_grap_iv: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a7.5 7.5 0 1 0 0 8.6" />
      <path d="M21 12h-4" /><path d="M12 3v4" /><path d="M12 17v4" />
    </svg>
  ),
  cyclone: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 4H3" /><path d="M18 8H6" /><path d="M19 12H9" /><path d="M16 16H5" /><path d="M21 20H3" />
    </svg>
  ),
  platform_outage: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h.01" /><path d="M7 20v-4" /><path d="M12 20v-8" /><path d="M17 20V8" />
      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  curfew_bandh: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="2" rx="1" />
      <path d="M12 2v7" /><path d="M12 15v7" />
      <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />
    </svg>
  ),
};

function getDisruptionIcon(eventType: string): React.ReactNode {
  return DISRUPTION_ICONS[eventType] || (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type StatusBucket = 'paid' | 'pending' | 'rejected';

function bucketStatus(status: string): StatusBucket {
  if (status === 'paid' || status === 'approved' || status === 'gate2_passed') return 'paid';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

const STATUS_BADGE_STYLES: Record<StatusBucket, React.CSSProperties> = {
  paid: {
    color: '#F07820',
    border: '1px solid #F07820',
    background: 'rgba(240,120,32,0.08)',
  },
  pending: {
    color: '#D96A10',
    border: '1px solid #F07820',
    background: 'rgba(240,120,32,0.06)',
  },
  rejected: {
    color: 'var(--red-acc)',
    border: '1px solid var(--red-acc)',
    background: 'rgba(192,57,43,0.06)',
  },
};

function statusLabel(status: string, t: (key: string) => string): string {
  const b = bucketStatus(status);
  if (b === 'paid') return t('claims.settled');
  if (b === 'rejected') return t('claims.rejected');
  return t('claims.processing');
}

const TIMELINE_DOT_COLOR: Record<StatusBucket, string> = {
  paid: '#F07820',
  pending: '#F07820',
  rejected: 'var(--red-acc)',
};

// ---------------------------------------------------------------------------
// Short claim ID
// ---------------------------------------------------------------------------

function shortClaimId(uuid: string): string {
  // Use last 4 chars for uniqueness (seed UUIDs share the same prefix)
  return 'SS-CLM-' + uuid.slice(-4).toUpperCase();
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ---------------------------------------------------------------------------
// Checkmark / Cross icons
// ---------------------------------------------------------------------------

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PendingDotIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="5" fill="var(--ink-30)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ClaimsPage() {
  const [activeTab, setActiveTab] = useState<'claims' | 'analytics'>('claims');
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLang, setUserLang] = useState('en');
  const [driverZoneName, setDriverZoneName] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // Single Supabase client for all queries — avoids auth token lock race
        const supabase = createClient();

        // Fast dashboard call for user identity + profile data
        const res = await fetch('/api/driver/dashboard?fast=1');
        if (!res.ok) return;
        const dash = await res.json() as DashboardFast & {
          policy?: { week_end?: string } | null;
        };
        if (dash.profile?.zone_name) setDriverZoneName(dash.profile.zone_name);

        // Get the authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch claims, payouts, policies, and language in parallel (single client, no auth race)
        const [claimsRes, payoutsRes, policiesRes, profileRes] = await Promise.all([
          supabase
            .from('parametric_claims')
            .select(
              'id, payout_amount_inr, status, gate1_passed, gate2_passed, activity_minutes, gps_within_zone, is_flagged, created_at, live_disruption_events(event_type, city, severity_score, trigger_value, trigger_threshold)'
            )
            .eq('profile_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('payout_ledger')
            .select('id, claim_id, amount_inr, status, mock_upi_ref, created_at')
            .eq('profile_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('weekly_policies')
            .select('id, final_premium_inr, payment_status, created_at')
            .eq('profile_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('language')
            .eq('id', user.id)
            .single(),
        ]);

        setClaims((claimsRes.data as unknown as ClaimRow[]) || []);

        const pRows = (payoutsRes.data as unknown as PayoutRow[]) || [];
        const polRows = (policiesRes.data as unknown as PolicyRow[]) || [];
        setPayouts(pRows);

        const langRow = profileRes.data as unknown as { language: string } | null;
        if (langRow?.language) setUserLang(langRow.language);

        // Build unified ledger
        const entries: LedgerEntry[] = [];
        for (const p of polRows) {
          entries.push({ id: p.id, date: p.created_at, type: 'premium', amount: Number(p.final_premium_inr), ref: p.id.slice(0, 8), status: p.payment_status });
        }
        for (const p of pRows) {
          entries.push({ id: p.id, date: p.created_at, type: 'payout', amount: Number(p.amount_inr), ref: p.mock_upi_ref || p.id.slice(0, 8), status: p.status });
        }
        entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLedger(entries);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const t = getTranslator(userLang);

  // ---------- Computed stats ----------
  const totalClaims = claims.length;
  const paidClaims = claims.filter((c) => bucketStatus(c.status) === 'paid');
  const totalReceived = paidClaims.reduce((sum, c) => sum + Number(c.payout_amount_inr), 0);
  const successRate = totalClaims > 0 ? Math.round((paidClaims.length / totalClaims) * 100) : 0;

  const latestClaim = claims[0] || null;

  // ---------- Tab bar (always shown) + content ----------
  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    background: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
  };

  const tabBtnStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '9px 0',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: isActive ? '#F07820' : 'transparent',
    border: 'none',
    borderRadius: 8,
    color: isActive ? '#fff' : '#6B7280',
    cursor: 'pointer',
    fontFamily: "var(--font-inter),'Inter',sans-serif",
    transition: 'all 0.2s ease',
  });

  // Analytics tab
  if (activeTab === 'analytics') {
    return (
      <div style={{ padding: '20px 16px', maxWidth: 520, margin: '0 auto' }}>
        <h1
          className="serif"
          style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', marginBottom: 16 }}
        >
          {t('claims.title')}
        </h1>
        <div style={tabBarStyle}>
          <button onClick={() => setActiveTab('claims')} style={tabBtnStyle(false)}>{t('claims.title')}</button>
          <button onClick={() => setActiveTab('analytics')} style={tabBtnStyle(true)}>{t('claims.analytics')}</button>
        </div>
        <Suspense fallback={
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 14 }}>{t('claims.loadingAnalytics')}</div>
        }>
          <HistoryContent />
        </Suspense>
      </div>
    );
  }

  // ---------- Loading skeleton ----------
  if (loading) {
    return (
      <div style={{ padding: '20px 16px' }}>
        <style>{`
          @keyframes claimsPulse {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 0.65; }
          }
          .cl-skel {
            background: var(--ink-10);
            border-radius: 8px;
            animation: claimsPulse 1.5s ease-in-out infinite;
          }
        `}</style>
        <div className="cl-skel" style={{ width: 140, height: 16, marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <div className="cl-skel" style={{ flex: 1, height: 80 }} />
          <div className="cl-skel" style={{ flex: 1, height: 80 }} />
          <div className="cl-skel" style={{ flex: 1, height: 80 }} />
        </div>
        <div className="cl-skel" style={{ height: 200, marginBottom: 20 }} />
        <div className="cl-skel" style={{ height: 120, marginBottom: 12 }} />
        <div className="cl-skel" style={{ height: 120, marginBottom: 12 }} />
        <div className="cl-skel" style={{ height: 80 }} />
      </div>
    );
  }

  // ---------- Empty state ----------
  if (claims.length === 0) {
    return (
      <div style={{ padding: '20px 16px' }}>
        <h1
          className="serif"
          style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', marginBottom: 16 }}
        >
          {t('claims.title')}
        </h1>
        <div style={tabBarStyle}>
          <button onClick={() => setActiveTab('claims')} style={tabBtnStyle(true)}>{t('claims.title')}</button>
          <button onClick={() => setActiveTab('analytics')} style={tabBtnStyle(false)}>{t('claims.analytics')}</button>
        </div>

        <div
          style={{
            textAlign: 'center',
            padding: '56px 24px',
            border: '1px solid var(--rule)',
            borderRadius: 14,
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F07820"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: '0 auto 16px' }}
          >
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <circle cx="12" cy="12" r="6" opacity="0.4" />
            <circle cx="12" cy="12" r="2" />
            <path d="M12 2v4" opacity="0.6" />
          </svg>
          <p
            className="serif"
            style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}
          >
            {t('claims.noClaimsYet')}
          </p>
          <p
            className="sans"
            style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}
          >
            {t('claims.noClaimsDesc')}
          </p>
        </div>

      </div>
    );
  }

  // ---------- Main render (Claims tab with data) ----------
  return (
    <div id="card-claims-list" style={{ padding: '20px 16px', maxWidth: 520, margin: '0 auto' }}>
      {/* ---------------------------------------------------------------- */}
      {/* Section 1: Claims Summary Header                                 */}
      {/* ---------------------------------------------------------------- */}
      <h1
        className="serif"
        style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', marginBottom: 16 }}
      >
        {t('claims.title')}
      </h1>

      <div style={tabBarStyle}>
        <button onClick={() => setActiveTab('claims')} style={tabBtnStyle(true)}>{t('claims.title')}</button>
        <button onClick={() => setActiveTab('analytics')} style={tabBtnStyle(false)}>{t('claims.analytics')}</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <StatCard
          label={t('claims.totalClaims')}
          value={String(totalClaims)}
          accent="var(--ink)"
        />
        <StatCard
          label={t('claims.received')}
          value={`\u20B9${totalReceived.toLocaleString('en-IN')}`}
          accent="#F07820"
        />
      </div>


      {/* ---------------------------------------------------------------- */}
      {/* Section 3: Payout Timeline — grouped by month                    */}
      {/* ---------------------------------------------------------------- */}
      {claims.length > 0 && (() => {
        // Group claims by month
        const grouped: Record<string, ClaimRow[]> = {};
        for (const c of claims) {
          const d = new Date(c.created_at);
          const key = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(c);
        }
        const months = Object.keys(grouped);

        return (
          <div style={{ marginTop: 28, marginBottom: 28 }}>
            <p className="mono" style={{
              fontSize: 10, color: 'var(--ink-60)', textTransform: 'uppercase',
              letterSpacing: '0.1em', marginBottom: 16,
            }}>
              Payout Timeline
            </p>

            <div style={{ position: 'relative' }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute', left: 5, top: 6, bottom: 6,
                width: 2, background: 'var(--ink-10)', borderRadius: 1,
              }} />

              {months.map((month) => (
                <div key={month} style={{ marginBottom: 20 }}>
                  {/* Month header */}
                  <p className="mono" style={{
                    fontSize: 10, color: 'var(--ink-60)', textTransform: 'uppercase',
                    letterSpacing: '0.1em', marginBottom: 10, paddingBottom: 6,
                    borderBottom: '1px solid var(--ink-10)', marginLeft: 0,
                  }}>
                    {month} ({grouped[month].length})
                  </p>

                  <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                  {grouped[month].map((claim, idx) => {
                    const bucket = bucketStatus(claim.status);
                    const dotColor = TIMELINE_DOT_COLOR[bucket];
                    const eventType = claim.live_disruption_events?.event_type as DisruptionType | undefined;
                    const triggerCfg = eventType ? TRIGGERS[eventType] : undefined;
                    const triggerLabel = triggerCfg?.label || 'Unknown Event';
                    const citySlug = claim.live_disruption_events?.city || '';
                    const cityDisplay = getCityBySlug(citySlug.toLowerCase())?.name || citySlug || '--';
                    const city = driverZoneName ? `${driverZoneName}, ${cityDisplay}` : cityDisplay;
                    const triggerVal = claim.live_disruption_events?.trigger_value;
                    const triggerThresh = claim.live_disruption_events?.trigger_threshold ?? triggerCfg?.threshold;
                    const unit = triggerCfg?.unit || '';

                    return (
                      <div key={claim.id} style={{
                        display: 'flex', gap: 16,
                        paddingBottom: idx < grouped[month].length - 1 ? 16 : 20,
                        position: 'relative',
                      }}>
                        {/* Timeline dot */}
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%',
                          background: dotColor, flexShrink: 0, marginTop: 4,
                          position: 'relative', zIndex: 1,
                          boxShadow: '0 0 0 3px var(--cream)',
                        }} />

                        {/* Card */}
                        <div style={{
                          flex: 1, border: '1px solid var(--rule)',
                          borderRadius: 10, padding: '12px 14px',
                        }}>
                          {/* Top row: event + status */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: dotColor, display: 'flex' }}>
                                {getDisruptionIcon(eventType || '')}
                              </span>
                              <div>
                                <p className="sans" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                                  {triggerLabel}
                                </p>
                                <p className="mono" style={{ fontSize: 10, color: 'var(--ink-30)' }}>
                                  {city} · {formatDate(claim.created_at)}
                                </p>
                              </div>
                            </div>
                            <span className="mono" style={{
                              fontSize: 9, fontWeight: 600, padding: '2px 8px',
                              borderRadius: 100, whiteSpace: 'nowrap',
                              ...STATUS_BADGE_STYLES[bucket],
                            }}>
                              {statusLabel(claim.status, t)}
                            </span>
                          </div>

                          {/* Trigger detail */}
                          {triggerVal != null && (
                            <p className="sans" style={{
                              fontSize: 12, color: 'var(--ink-60)', marginTop: 8,
                              padding: '6px 8px', background: 'rgba(240,120,32,0.04)', borderRadius: 6,
                            }}>
                              {triggerLabel} — {triggerVal}{unit} detected
                            </p>
                          )}

                          {/* Payout amount + gate indicators */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="serif" style={{
                                fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em',
                                color: bucket === 'paid' ? '#F07820' : bucket === 'rejected' ? 'var(--red-acc)' : 'var(--ink)',
                              }}>
                                ₹{Number(claim.payout_amount_inr).toLocaleString('en-IN')}
                              </span>
                              {/* Gate status dots */}
                              <div style={{ display: 'flex', gap: 4 }}>
                                <span style={{
                                  width: 7, height: 7, borderRadius: '50%',
                                  background: claim.gate1_passed ? '#F07820' : 'var(--ink-10)',
                                }} title="Gate 1" />
                                <span style={{
                                  width: 7, height: 7, borderRadius: '50%',
                                  background: claim.gate2_passed ? '#F07820' : 'var(--ink-10)',
                                }} title="Gate 2" />
                              </div>
                            </div>
                            {/* UPI ref */}
                            {(() => {
                              const p = payouts.find((px) => px.claim_id === claim.id);
                              return p?.mock_upi_ref ? (
                                <span className="mono" style={{ fontSize: 9, color: 'var(--ink-30)' }}>
                                  UPI: {p.mock_upi_ref}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>{/* end scrollable */}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ---------------------------------------------------------------- */}
      {/* Section 4: Payment Ledger                                        */}
      {/* ---------------------------------------------------------------- */}
      {ledger.length > 0 && (
        <PaymentLedger entries={ledger} />
      )}

    </div>
  );
}

// ===========================================================================
// Sub-components
// ===========================================================================

// ---------- Stat card (Section 1) ----------

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        flex: 1,
        border: '1px solid var(--rule)',
        borderRadius: 10,
        padding: '14px 12px',
        textAlign: 'center',
      }}
    >
      <p
        className="mono"
        style={{
          fontSize: 9,
          color: 'var(--ink-60)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <p
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: accent,
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ---------- Featured claim card (Section 2) ----------

function FeaturedClaimCard({ claim, t }: { claim: ClaimRow; t: (key: string) => string }) {
  const bucket = bucketStatus(claim.status);
  const eventType = claim.live_disruption_events?.event_type as DisruptionType | undefined;
  const triggerCfg = eventType ? TRIGGERS[eventType] : undefined;
  const triggerLabel = triggerCfg?.label || 'Unknown Event';
  const triggerVal = claim.live_disruption_events?.trigger_value;
  const triggerThresh = claim.live_disruption_events?.trigger_threshold ?? triggerCfg?.threshold;
  const unit = triggerCfg?.unit || '';

  const borderColor = bucket === 'paid' ? '#F07820' : bucket === 'rejected' ? 'var(--red-acc)' : '#F07820';

  const gate1 = claim.gate1_passed;
  const gate2 = claim.gate2_passed;
  const gpsOk = claim.gps_within_zone;
  const noDuplicate = !claim.is_flagged;

  const validations: { label: string; passed: boolean | null }[] = [
    { label: t('claims.envVerified'), passed: gate1 },
    {
      label: claim.activity_minutes != null
        ? `${t('claims.activityConfirmed')} (${claim.activity_minutes}min active)`
        : t('claims.activityConfirmed'),
      passed: gate2,
    },
    { label: t('claims.gpsInZone'), passed: gpsOk },
    { label: t('claims.noDuplicates'), passed: noDuplicate },
  ];

  return (
    <div
      style={{
        border: '1px solid var(--rule)',
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 12,
        padding: '18px 16px',
        background: 'linear-gradient(135deg, rgba(240,120,32,0.03) 0%, transparent 60%)',
      }}
    >
      {/* Header: claim ID + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p className="mono" style={{ fontSize: 11, color: 'var(--ink-30)', letterSpacing: '0.06em' }}>
          {shortClaimId(claim.id)}
        </p>
        <span
          className="mono"
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 100,
            ...STATUS_BADGE_STYLES[bucket],
          }}
        >
          {statusLabel(claim.status, t)}
        </span>
      </div>

      {/* Event type + icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ color: borderColor, display: 'flex' }}>
          {getDisruptionIcon(eventType || '')}
        </span>
        <div>
          <p className="sans" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
            {triggerLabel}
          </p>
          {triggerVal != null && (
            <p className="mono" style={{ fontSize: 10, color: 'var(--ink-60)', marginTop: 2 }}>
              {triggerVal}{unit} detected
            </p>
          )}
        </div>
      </div>

      {/* Triggered time */}
      <p className="mono" style={{ fontSize: 10, color: 'var(--ink-30)', marginTop: 6, marginBottom: 12 }}>
        Triggered {relativeTime(claim.created_at)} &middot; {formatDate(claim.created_at)} at {formatTime(claim.created_at)}
      </p>

      {/* Payout amount */}
      <p
        className="serif"
        style={{
          fontSize: 32,
          fontWeight: 900,
          color: 'var(--ink)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          marginBottom: 18,
        }}
      >
        {'\u20B9'}{Number(claim.payout_amount_inr).toLocaleString('en-IN')}
      </p>

      {/* Validation checklist */}
      <div
        style={{
          background: 'var(--cream-d)',
          borderRadius: 8,
          padding: '12px 14px',
        }}
      >
        <p
          className="mono"
          style={{
            fontSize: 9,
            color: 'var(--ink-60)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 10,
          }}
        >
          {t('claims.validationChecklist')}
        </p>
        {validations.map((v, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingTop: i > 0 ? 8 : 0,
              borderTop: i > 0 ? '1px solid var(--ink-10)' : 'none',
            }}
          >
            {v.passed === true ? (
              <CheckIcon color="#F07820" />
            ) : v.passed === false ? (
              <CheckIcon color="var(--red-acc)" />
            ) : (
              <PendingDotIcon />
            )}
            <span
              className="sans"
              style={{
                fontSize: 12,
                color: v.passed === true ? 'var(--ink)' : v.passed === false ? 'var(--red-acc)' : 'var(--ink-30)',
              }}
            >
              {v.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Payment Ledger ----------

function PaymentLedger({ entries }: { entries: LedgerEntry[] }) {
  const [filter, setFilter] = useState<'all' | 'premium' | 'payout'>('all');
  const [expanded, setExpanded] = useState(false);

  const filtered = entries.filter((e) => filter === 'all' || e.type === filter);
  const visible = expanded ? filtered : filtered.slice(0, 5);
  const premiumCount = entries.filter((e) => e.type === 'premium').length;
  const payoutCount = entries.filter((e) => e.type === 'payout').length;

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '18px 16px 14px', marginTop: 16, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p className="mono" style={{ fontSize: 10, color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
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
              onClick={() => { setFilter(tab.key); setExpanded(false); }}
              className="mono"
              style={{
                fontSize: 9, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                border: 'none', cursor: 'pointer', letterSpacing: '0.04em',
                background: filter === tab.key ? '#F07820' : 'transparent',
                color: filter === tab.key ? '#fff' : 'var(--ink-60)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="sans" style={{ fontSize: 13, color: 'var(--ink-60)', textAlign: 'center', padding: '24px 0' }}>No transactions</p>
      ) : (
        <>
          {visible.map((entry) => {
            const isPremium = entry.type === 'premium';
            const amtColor = isPremium ? 'var(--red-acc)' : '#F07820';
            const sign = isPremium ? '-' : '+';
            return (
              <div key={`${entry.type}-${entry.id}`} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--ink-10)',
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="mono" style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                      background: isPremium ? 'rgba(239,68,68,0.1)' : 'rgba(240,120,32,0.1)',
                      color: amtColor, textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {isPremium ? 'PREMIUM' : 'PAYOUT'}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-30)' }}>{entry.ref}</span>
                  </div>
                  <p className="mono" style={{ fontSize: 10, color: 'var(--ink-30)', marginTop: 3 }}>
                    {formatDate(entry.date)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="serif" style={{ fontSize: 15, fontWeight: 900, color: amtColor }}>
                    {sign}₹{Number(entry.amount).toLocaleString('en-IN')}
                  </p>
                  <p className="mono" style={{
                    fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: ['completed', 'paid', 'demo'].includes(entry.status) ? '#F07820' : entry.status === 'failed' ? 'var(--red-acc)' : 'var(--ink-60)',
                  }}>
                    {entry.status}
                  </p>
                </div>
              </div>
            );
          })}
          {filtered.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mono"
              style={{
                width: '100%', padding: '10px 0', marginTop: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, color: '#F07820', letterSpacing: '0.04em',
              }}
            >
              {expanded ? 'Show less ▲' : `Show all ${filtered.length} transactions ▼`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

