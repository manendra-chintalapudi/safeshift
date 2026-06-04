import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TRIGGERS } from '@/lib/config/constants';
import type { DisruptionType } from '@/lib/config/constants';

interface PremiumRec {
  id: string;
  profile_id: string;
  week_start_date: string;
  base_premium: number;
  weather_risk: number;
  ubi_adjustment: number;
  final_premium: number;
  reasoning: string | null;
}

interface ClaimTrend {
  event_type: string;
  city: string;
  count: number;
}

export default async function AdminAnalyticsPage() {
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

  // Premium recommendations
  const { data: recsData } = await admin
    .from('premium_recommendations')
    .select('id, profile_id, week_start_date, base_premium, weather_risk, ubi_adjustment, final_premium, reasoning')
    .order('created_at', { ascending: false })
    .limit(20);

  const recommendations = (recsData as unknown as PremiumRec[]) || [];

  // Per-city risk from live events
  const { data: eventsData } = await admin
    .from('live_disruption_events')
    .select('event_type, city, severity_score')
    .is('resolved_at', null);

  const events = (eventsData || []) as unknown as { event_type: string; city: string; severity_score: number }[];
  const cityRisk: Record<string, { city: string; events: number; avgSeverity: number; totalSev: number }> = {};
  for (const e of events) {
    if (!cityRisk[e.city]) cityRisk[e.city] = { city: e.city, events: 0, avgSeverity: 0, totalSev: 0 };
    cityRisk[e.city].events++;
    cityRisk[e.city].totalSev += Number(e.severity_score);
  }
  for (const cr of Object.values(cityRisk)) {
    cr.avgSeverity = cr.events > 0 ? cr.totalSev / cr.events : 0;
  }
  const cityRiskList = Object.values(cityRisk).sort((a, b) => b.avgSeverity - a.avgSeverity);

  // Claims trend by event type + city
  const { data: claimsData } = await admin
    .from('parametric_claims')
    .select('disruption_event_id, live_disruption_events(event_type, city)')
    .order('created_at', { ascending: false })
    .limit(500);

  const claimRows = (claimsData || []) as unknown as {
    disruption_event_id: string;
    live_disruption_events: { event_type: string; city: string } | null;
  }[];

  const trendMap: Record<string, ClaimTrend> = {};
  for (const c of claimRows) {
    if (!c.live_disruption_events) continue;
    const key = `${c.live_disruption_events.event_type}-${c.live_disruption_events.city}`;
    if (!trendMap[key]) {
      trendMap[key] = {
        event_type: c.live_disruption_events.event_type,
        city: c.live_disruption_events.city,
        count: 0,
      };
    }
    trendMap[key].count++;
  }
  const trends = Object.values(trendMap).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: "var(--font-inter),'Inter',sans-serif" }}>Analytics</h1>

      {/* Per-City Risk Table */}
      <div className="overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.08))', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
          <h2 className="font-medium" style={{ color: '#1A1A1A' }}>Per-City Risk (Active Events)</h2>
        </div>
        <div className="overflow-x-auto" style={{ background: '#fff' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(6,182,212,0.06))', color: '#3B82F6', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Active Events</th>
                <th className="px-4 py-3 font-medium">Avg Severity</th>
              </tr>
            </thead>
            <tbody>
              {cityRiskList.map((cr, i) => (
                <tr key={cr.city} className="admin-row" style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : 'rgba(59,130,246,0.02)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: '#1A1A1A' }}>{cr.city}</td>
                  <td className="serif px-4 py-3" style={{ color: '#6B7280' }}>{cr.events}</td>
                  <td className="serif px-4 py-3 font-medium" style={{ color: cr.avgSeverity >= 7 ? '#dc2626' : cr.avgSeverity >= 5 ? '#6B7280' : '#22C55E' }}>
                    {cr.avgSeverity.toFixed(1)}
                  </td>
                </tr>
              ))}
              {cityRiskList.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>No active events</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claims Trend Table */}
      <div className="overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.08))', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
          <h2 className="font-medium" style={{ color: '#1A1A1A' }}>Claims Trend (by Event + City)</h2>
        </div>
        <div className="overflow-x-auto" style={{ background: '#fff' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(6,182,212,0.06))', color: '#3B82F6', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                <th className="px-4 py-3 font-medium">Event Type</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Claims</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((t, i) => {
                const triggerLabel = TRIGGERS[t.event_type as DisruptionType]?.label || t.event_type;
                return (
                  <tr key={`${t.event_type}-${t.city}`} className="admin-row" style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : 'rgba(59,130,246,0.02)' }}>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>{triggerLabel}</td>
                    <td className="px-4 py-3" style={{ color: '#6B7280' }}>{t.city}</td>
                    <td className="serif px-4 py-3 font-medium">{t.count}</td>
                  </tr>
                );
              })}
              {trends.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>No claims data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Recommendations Table */}
      <div className="overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.08))', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
          <h2 className="font-medium" style={{ color: '#1A1A1A' }}>Recent Premium Recommendations</h2>
        </div>
        <div className="overflow-x-auto" style={{ background: '#fff' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(6,182,212,0.06))', color: '#3B82F6', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                <th className="px-4 py-3 font-medium">Week</th>
                <th className="px-4 py-3 font-medium">Base</th>
                <th className="px-4 py-3 font-medium">Weather</th>
                <th className="px-4 py-3 font-medium">UBI</th>
                <th className="px-4 py-3 font-medium">Final</th>
                <th className="px-4 py-3 font-medium">Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((rec, i) => (
                <tr key={rec.id} className="admin-row" style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : 'rgba(59,130,246,0.02)' }}>
                  <td className="mono px-4 py-3" style={{ color: '#1A1A1A' }}>{rec.week_start_date}</td>
                  <td className="serif px-4 py-3" style={{ color: '#6B7280' }}>&#x20B9;{Number(rec.base_premium)}</td>
                  <td className="serif px-4 py-3" style={{ color: '#6B7280' }}>&#x20B9;{Number(rec.weather_risk)}</td>
                  <td className="serif px-4 py-3" style={{ color: '#6B7280' }}>&#x20B9;{Number(rec.ubi_adjustment)}</td>
                  <td className="serif px-4 py-3 font-medium" style={{ color: '#1A1A1A' }}>&#x20B9;{Number(rec.final_premium)}</td>
                  <td className="px-4 py-3 text-xs max-w-[300px] truncate" style={{ color: '#6B7280' }}>
                    {rec.reasoning || '-'}
                  </td>
                </tr>
              ))}
              {recommendations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>No recommendations yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
