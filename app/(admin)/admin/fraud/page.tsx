import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TRIGGERS } from '@/lib/config/constants';
import type { DisruptionType } from '@/lib/config/constants';

interface FlaggedClaim {
  id: string;
  profile_id: string;
  payout_amount_inr: number;
  status: string;
  fraud_score: number;
  flag_reason: string | null;
  fraud_signals: Record<string, unknown>;
  created_at: string;
  live_disruption_events: {
    event_type: string;
    city: string;
  } | null;
}

interface ClusterSignal {
  disruption_event_id: string;
  event_type: string;
  city: string;
  claim_count: number;
  first_claim_at: string;
  last_claim_at: string;
  window_seconds: number;
  unique_devices: number;
  flag_rate: number;
}

export default async function AdminFraudPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();

  const { data: profileData } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if ((profileData as { role: string } | null)?.role !== 'admin') redirect('/dashboard');

  const { data: flaggedData } = await admin
    .from('parametric_claims')
    .select('id, profile_id, payout_amount_inr, status, fraud_score, flag_reason, fraud_signals, created_at, live_disruption_events(event_type, city)')
    .eq('is_flagged', true)
    .order('created_at', { ascending: false })
    .limit(50);

  const flaggedClaims = (flaggedData as unknown as FlaggedClaim[]) || [];

  const { data: clusterData } = await admin
    .from('fraud_cluster_signals')
    .select('*')
    .order('claim_count', { ascending: false })
    .limit(20);

  const clusters = (clusterData as unknown as ClusterSignal[]) || [];

  // Get driver names
  const driverIds = [...new Set(flaggedClaims.map((c) => c.profile_id))];
  const { data: namesData } = driverIds.length > 0
    ? await admin.from('profiles').select('id, full_name').in('id', driverIds)
    : { data: [] };
  const nameMap: Record<string, string> = {};
  for (const p of (namesData || []) as unknown as { id: string; full_name: string | null }[]) {
    nameMap[p.id] = p.full_name || 'Unknown';
  }

  return (
    <div className="space-y-6">
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: "var(--font-inter),'Inter',sans-serif" }}>Fraud Detection</h1>

      {/* Dramatic Red Gradient Alert Card */}
      <div style={{
        background: 'linear-gradient(135deg, #dc2626, #B91C1C)',
        borderRadius: 16,
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -15, right: -15, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: '30%', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div className="serif text-lg font-bold" style={{ color: '#fff', position: 'relative', zIndex: 1 }}>{flaggedClaims.length} Flagged Claims</div>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,0.85)', position: 'relative', zIndex: 1 }}>Claims requiring fraud review</div>
      </div>

      {/* Flagged Claims Table */}
      <div className="overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(236,72,153,0.08))', borderBottom: '1px solid rgba(220,38,38,0.1)' }}>
          <h2 className="font-medium" style={{ color: '#1A1A1A' }}>Flagged Claims</h2>
        </div>
        <div className="overflow-x-auto" style={{ background: '#fff' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.06), rgba(236,72,153,0.06))', color: '#dc2626', borderBottom: '1px solid rgba(220,38,38,0.1)' }}>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Payout</th>
                <th className="px-4 py-3 font-medium">Fraud Score</th>
                <th className="px-4 py-3 font-medium">Flag Reason</th>
                <th className="px-4 py-3 font-medium">Signals</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {flaggedClaims.map((claim, i) => {
                const eventType = claim.live_disruption_events?.event_type as DisruptionType | undefined;
                const triggerLabel = eventType ? TRIGGERS[eventType]?.label : 'Unknown';
                const date = new Date(claim.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short',
                });
                const signals = Object.entries(claim.fraud_signals || {})
                  .filter(([, v]) => v)
                  .map(([k]) => k.replace(/_/g, ' '));

                return (
                  <tr key={claim.id} className="admin-row" style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : 'rgba(220,38,38,0.02)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#1A1A1A' }}>{nameMap[claim.profile_id] || 'Unknown'}</td>
                    <td className="px-4 py-3" style={{ color: '#6B7280' }}>
                      {triggerLabel}
                      <div className="text-xs" style={{ color: '#9CA3AF' }}>{claim.live_disruption_events?.city}</div>
                    </td>
                    <td className="serif px-4 py-3 font-medium">{'\u20B9'}{Number(claim.payout_amount_inr).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="serif font-bold" style={{ color: '#dc2626' }}>{(claim.fraud_score * 100).toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: '#6B7280' }}>
                      {claim.flag_reason || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {signals.map((s) => (
                          <span key={s} className="mono text-xs px-1.5 py-0.5 rounded" style={{ border: '1px solid #dc2626', color: '#dc2626' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="mono px-4 py-3 text-xs" style={{ color: '#6B7280' }}>{date}</td>
                  </tr>
                );
              })}
              {flaggedClaims.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>
                    No flagged claims
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cluster Signals Table */}
      <div className="overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(236,72,153,0.08))', borderBottom: '1px solid rgba(220,38,38,0.1)' }}>
          <h2 className="font-medium" style={{ color: '#1A1A1A' }}>Cluster Signals</h2>
        </div>
        <div className="overflow-x-auto" style={{ background: '#fff' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.06), rgba(236,72,153,0.06))', color: '#dc2626', borderBottom: '1px solid rgba(220,38,38,0.1)' }}>
                <th className="px-4 py-3 font-medium">Event Type</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Claims</th>
                <th className="px-4 py-3 font-medium">Window</th>
                <th className="px-4 py-3 font-medium">Devices</th>
                <th className="px-4 py-3 font-medium">Flag Rate</th>
              </tr>
            </thead>
            <tbody>
              {clusters.map((cluster, i) => {
                const eventType = cluster.event_type as DisruptionType;
                const triggerLabel = TRIGGERS[eventType]?.label || cluster.event_type;
                const windowMin = Math.round(Number(cluster.window_seconds) / 60);
                const flagPercent = (Number(cluster.flag_rate) * 100).toFixed(0);

                return (
                  <tr key={cluster.disruption_event_id} className="admin-row" style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : 'rgba(220,38,38,0.02)' }}>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>{triggerLabel}</td>
                    <td className="px-4 py-3" style={{ color: '#6B7280' }}>{cluster.city}</td>
                    <td className="serif px-4 py-3 font-medium">{cluster.claim_count}</td>
                    <td className="mono px-4 py-3" style={{ color: '#6B7280' }}>{windowMin} min</td>
                    <td className="serif px-4 py-3" style={{ color: '#6B7280' }}>{cluster.unique_devices}</td>
                    <td className="px-4 py-3">
                      <span className="serif font-medium" style={{ color: Number(cluster.flag_rate) > 0.5 ? '#dc2626' : '#6B7280' }}>
                        {flagPercent}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {clusters.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>
                    No cluster signals detected
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
