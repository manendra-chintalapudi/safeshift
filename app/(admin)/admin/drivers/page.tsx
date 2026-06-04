import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface DriverRow {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  city: string | null;
  trust_score: number;
  onboarding_status: string;
  created_at: string;
}

export default async function AdminDriversPage() {
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

  const { data: driversData } = await admin
    .from('profiles')
    .select('id, full_name, phone_number, city, trust_score, onboarding_status, created_at')
    .eq('role', 'driver')
    .order('created_at', { ascending: false });

  const drivers = (driversData as unknown as DriverRow[]) || [];

  // Fetch claim counts per driver
  const driverIds = drivers.map((d) => d.id);
  const { data: claimsData } = driverIds.length > 0
    ? await admin
        .from('parametric_claims')
        .select('profile_id, payout_amount_inr')
        .in('profile_id', driverIds)
    : { data: [] };

  const claims = (claimsData || []) as unknown as { profile_id: string; payout_amount_inr: number }[];
  const claimsByDriver: Record<string, { count: number; total: number }> = {};
  for (const c of claims) {
    if (!claimsByDriver[c.profile_id]) claimsByDriver[c.profile_id] = { count: 0, total: 0 };
    claimsByDriver[c.profile_id].count++;
    claimsByDriver[c.profile_id].total += Number(c.payout_amount_inr);
  }

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: "var(--font-inter),'Inter',sans-serif" }}>Drivers</h1>
        <span className="mono text-sm" style={{ color: '#6B7280' }}>{drivers.length} total</span>
      </div>

      <div className="overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="overflow-x-auto" style={{ background: '#fff' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.08))', color: '#8B5CF6', borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Trust</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Claims</th>
                <th className="px-4 py-3 font-medium">Payouts</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver, i) => {
                const stats = claimsByDriver[driver.id] || { count: 0, total: 0 };
                const trustStyle = driver.trust_score >= 0.7
                  ? { color: '#22C55E' }
                  : driver.trust_score >= 0.4
                    ? { color: '#6B7280' }
                    : { color: '#dc2626' };
                const statusComplete = driver.onboarding_status === 'complete';

                return (
                  <tr key={driver.id} className="admin-row" style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : 'rgba(139,92,246,0.02)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#1A1A1A' }}>{driver.full_name || 'Unnamed'}</td>
                    <td className="px-4 py-3" style={{ color: '#6B7280' }}>{driver.phone_number || '-'}</td>
                    <td className="px-4 py-3" style={{ color: '#6B7280' }}>{driver.city || '-'}</td>
                    <td className="serif px-4 py-3 font-medium" style={trustStyle}>
                      {(driver.trust_score * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="mono text-xs font-medium px-2 py-1 rounded-full"
                        style={
                          statusComplete
                            ? { border: '1px solid #22C55E', color: '#22C55E' }
                            : { border: '1px solid #6B7280', color: '#6B7280' }
                        }
                      >
                        {statusComplete ? 'Complete' : driver.onboarding_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="serif px-4 py-3" style={{ color: '#6B7280' }}>{stats.count}</td>
                    <td className="serif px-4 py-3" style={{ color: '#6B7280' }}>{'\u20B9'}{stats.total.toLocaleString()}</td>
                  </tr>
                );
              })}
              {drivers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>
                    No drivers registered yet
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
