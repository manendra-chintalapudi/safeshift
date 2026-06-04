import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FinancialChart } from './chart';

interface CityBreakdown {
  city: string;
  premium_total: number;
  payout_total: number;
  claim_count: number;
}

export default async function AdminFinancialPage() {
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

  // Total premium revenue
  const { data: policiesData } = await admin
    .from('weekly_policies')
    .select('final_premium_inr, week_start_date, profile_id');
  const policies = (policiesData || []) as unknown as { final_premium_inr: number; week_start_date: string; profile_id: string }[];
  const totalPremium = policies.reduce((sum, p) => sum + Number(p.final_premium_inr), 0);

  // Total payouts
  const { data: payoutsData } = await admin
    .from('payout_ledger')
    .select('amount_inr, created_at');
  const payouts = (payoutsData || []) as unknown as { amount_inr: number; created_at: string }[];
  const totalPayouts = payouts.reduce((sum, p) => sum + Number(p.amount_inr), 0);

  const lossRatio = totalPremium > 0 ? (totalPayouts / totalPremium * 100).toFixed(1) : '0.0';

  // Per-city breakdown
  const { data: profilesData } = await admin
    .from('profiles')
    .select('id, city')
    .eq('role', 'driver');
  const profiles = (profilesData || []) as unknown as { id: string; city: string | null }[];
  const cityByProfile: Record<string, string> = {};
  for (const p of profiles) {
    if (p.city) cityByProfile[p.id] = p.city;
  }

  const { data: claimsData } = await admin
    .from('parametric_claims')
    .select('profile_id, payout_amount_inr');
  const claims = (claimsData || []) as unknown as { profile_id: string; payout_amount_inr: number }[];

  const cityMap: Record<string, CityBreakdown> = {};
  for (const p of policies) {
    const city = cityByProfile[p.profile_id] || 'Unknown';
    if (!cityMap[city]) cityMap[city] = { city, premium_total: 0, payout_total: 0, claim_count: 0 };
    cityMap[city].premium_total += Number(p.final_premium_inr);
  }
  for (const c of claims) {
    const city = cityByProfile[c.profile_id] || 'Unknown';
    if (!cityMap[city]) cityMap[city] = { city, premium_total: 0, payout_total: 0, claim_count: 0 };
    cityMap[city].payout_total += Number(c.payout_amount_inr);
    cityMap[city].claim_count++;
  }
  const cityBreakdown = Object.values(cityMap).sort((a, b) => b.premium_total - a.premium_total);

  // Weekly chart data
  const weeklyMap: Record<string, { week: string; premium: number; payouts: number }> = {};
  for (const p of policies) {
    const week = p.week_start_date;
    if (!weeklyMap[week]) weeklyMap[week] = { week, premium: 0, payouts: 0 };
    weeklyMap[week].premium += Number(p.final_premium_inr);
  }
  for (const p of payouts) {
    const week = p.created_at.slice(0, 10);
    // Find closest week
    const weeks = Object.keys(weeklyMap);
    const closest = weeks.reduce((best, w) => {
      return Math.abs(new Date(w).getTime() - new Date(week).getTime()) <
        Math.abs(new Date(best).getTime() - new Date(week).getTime()) ? w : best;
    }, weeks[0] || week);
    if (!weeklyMap[closest]) weeklyMap[closest] = { week: closest, premium: 0, payouts: 0 };
    weeklyMap[closest].payouts += Number(p.amount_inr);
  }
  const chartData = Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week));

  return (
    <div className="space-y-6">
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: "var(--font-inter),'Inter',sans-serif" }}>Financial Overview</h1>

      {/* KPI Cards with Gradient Backgrounds */}
      <div className="grid grid-cols-3 gap-4">
        {/* Premium Revenue - Purple Gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
          borderRadius: 16,
          padding: 16,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div className="mono text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Premium Revenue</div>
          <div className="serif text-2xl font-bold mt-1" style={{ color: '#fff', position: 'relative', zIndex: 1 }}>{'\u20B9'}{totalPremium.toLocaleString()}</div>
        </div>
        {/* Total Payouts - Blue Gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
          borderRadius: 16,
          padding: 16,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div className="mono text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Payouts</div>
          <div className="serif text-2xl font-bold mt-1" style={{ color: '#fff', position: 'relative', zIndex: 1 }}>{'\u20B9'}{totalPayouts.toLocaleString()}</div>
        </div>
        {/* Loss Ratio - Green or Red Gradient */}
        <div style={{
          background: Number(lossRatio) > 80
            ? 'linear-gradient(135deg, #dc2626, #B91C1C)'
            : 'linear-gradient(135deg, #22C55E, #16A34A)',
          borderRadius: 16,
          padding: 16,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div className="mono text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.8)' }}>Loss Ratio</div>
          <div className="serif text-2xl font-bold mt-1" style={{ color: '#fff', position: 'relative', zIndex: 1 }}>
            {lossRatio}%
          </div>
        </div>
      </div>

      {/* Chart Section */}
      {chartData.length > 0 && (
        <div className="p-4" style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 className="font-medium mb-4" style={{ color: '#1A1A1A' }}>Premium vs Payouts by Week</h2>
          <FinancialChart data={chartData} />
        </div>
      )}

      {/* Per-City Breakdown Table */}
      <div className="overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
          <h2 className="font-medium" style={{ color: '#1A1A1A' }}>Per-City Breakdown</h2>
        </div>
        <div className="overflow-x-auto" style={{ background: '#fff' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))', color: '#6366F1', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Premiums</th>
                <th className="px-4 py-3 font-medium">Payouts</th>
                <th className="px-4 py-3 font-medium">Claims</th>
                <th className="px-4 py-3 font-medium">Loss Ratio</th>
              </tr>
            </thead>
            <tbody>
              {cityBreakdown.map((row, i) => {
                const cityLoss = row.premium_total > 0
                  ? (row.payout_total / row.premium_total * 100).toFixed(1)
                  : '0.0';
                return (
                  <tr key={row.city} className="admin-row" style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : 'rgba(99,102,241,0.02)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#1A1A1A' }}>{row.city}</td>
                    <td className="serif px-4 py-3" style={{ color: '#8B5CF6' }}>{'\u20B9'}{row.premium_total.toLocaleString()}</td>
                    <td className="serif px-4 py-3" style={{ color: '#3B82F6' }}>{'\u20B9'}{row.payout_total.toLocaleString()}</td>
                    <td className="serif px-4 py-3" style={{ color: '#6B7280' }}>{row.claim_count}</td>
                    <td className="serif px-4 py-3 font-medium" style={{ color: Number(cityLoss) > 80 ? '#dc2626' : '#22C55E' }}>
                      {cityLoss}%
                    </td>
                  </tr>
                );
              })}
              {cityBreakdown.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>
                    No financial data yet
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
