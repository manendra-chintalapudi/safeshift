import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface SystemLogRow {
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

const SEVERITY_STYLES: Record<string, { border: string; color: string }> = {
  info: { border: '1px solid #22C55E', color: '#22C55E' },
  warning: { border: '1px solid #6B7280', color: '#6B7280' },
  error: { border: '1px solid #dc2626', color: '#dc2626' },
};

const OUTCOME_STYLES: Record<string, { border: string; color: string }> = {
  triggered: { border: '1px solid #22C55E', color: '#22C55E' },
  no_pay: { border: '1px solid #6B7280', color: '#6B7280' },
  deferred: { border: '1px solid #6B7280', color: '#6B7280' },
  error: { border: '1px solid #dc2626', color: '#dc2626' },
};

export default async function AdminHealthPage() {
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

  const { data: logsData } = await admin
    .from('system_logs')
    .select('id, event_type, severity, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  const logs = (logsData as unknown as SystemLogRow[]) || [];

  const { data: ledgerData } = await admin
    .from('parametric_trigger_ledger')
    .select('id, event_type, city, trigger_value, outcome, claims_created, payouts_initiated, error_message, latency_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  const ledger = (ledgerData as unknown as TriggerLedgerRow[]) || [];

  // Simple health indicators
  const recentErrors = logs.filter((l) => l.severity === 'error').length;
  const recentTriggerErrors = ledger.filter((l) => l.outcome === 'error').length;

  return (
    <div className="space-y-6">
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: "var(--font-inter),'Inter',sans-serif" }}>System Health</h1>

      {/* Health KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* API Status - Green Gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #22C55E, #16A34A)',
          borderRadius: 16,
          padding: 16,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div className="mono text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.8)' }}>API Status</div>
          <div className="flex items-center gap-2 mt-2" style={{ position: 'relative', zIndex: 1 }}>
            <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 0 8px rgba(255,255,255,0.5)' }} />
            <span className="font-medium" style={{ color: '#fff' }}>Operational</span>
          </div>
        </div>
        {/* Recent Errors - Indigo Gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
          borderRadius: 16,
          padding: 16,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div className="mono text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.8)' }}>Recent Errors</div>
          <div className="serif text-2xl font-bold mt-1" style={{ color: '#fff', position: 'relative', zIndex: 1 }}>
            {recentErrors}
          </div>
        </div>
        {/* Trigger Errors - Purple Gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
          borderRadius: 16,
          padding: 16,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div className="mono text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.8)' }}>Trigger Errors</div>
          <div className="serif text-2xl font-bold mt-1" style={{ color: '#fff', position: 'relative', zIndex: 1 }}>
            {recentTriggerErrors}
          </div>
        </div>
      </div>

      {/* System Logs Table */}
      <div className="overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(34,197,94,0.08))', borderBottom: '1px solid rgba(20,184,166,0.1)' }}>
          <h2 className="font-medium" style={{ color: '#1A1A1A' }}>System Logs (Last 20)</h2>
        </div>
        <div className="overflow-x-auto" style={{ background: '#fff' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.06), rgba(34,197,94,0.06))', color: '#14B8A6', borderBottom: '1px solid rgba(20,184,166,0.1)' }}>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Metadata</th>
                <th className="px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const sevStyle = SEVERITY_STYLES[log.severity] || { border: '1px solid #6B7280', color: '#6B7280' };
                const time = new Date(log.created_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
                });
                return (
                  <tr key={log.id} className="admin-row" style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : 'rgba(20,184,166,0.02)' }}>
                    <td className="px-4 py-3">
                      <span className="mono text-xs font-medium px-2 py-1 rounded-full" style={sevStyle}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>{log.event_type}</td>
                    <td className="mono px-4 py-3 text-xs max-w-[300px] truncate" style={{ color: '#6B7280' }}>
                      {JSON.stringify(log.metadata)}
                    </td>
                    <td className="mono px-4 py-3 text-xs" style={{ color: '#6B7280' }}>{time}</td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>No system logs</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trigger Ledger Table */}
      <div className="overflow-hidden" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(34,197,94,0.08))', borderBottom: '1px solid rgba(20,184,166,0.1)' }}>
          <h2 className="font-medium" style={{ color: '#1A1A1A' }}>Trigger Ledger (Last 20)</h2>
        </div>
        <div className="overflow-x-auto" style={{ background: '#fff' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.06), rgba(34,197,94,0.06))', color: '#14B8A6', borderBottom: '1px solid rgba(20,184,166,0.1)' }}>
                <th className="px-4 py-3 font-medium">Event Type</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Outcome</th>
                <th className="px-4 py-3 font-medium">Claims</th>
                <th className="px-4 py-3 font-medium">Latency</th>
                <th className="px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry, i) => {
                const outcomeStyle = OUTCOME_STYLES[entry.outcome || ''] || { border: '1px solid #6B7280', color: '#6B7280' };
                const time = new Date(entry.created_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                });
                return (
                  <tr key={entry.id} className="admin-row" style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : 'rgba(20,184,166,0.02)' }}>
                    <td className="px-4 py-3" style={{ color: '#1A1A1A' }}>{entry.event_type || '-'}</td>
                    <td className="px-4 py-3" style={{ color: '#6B7280' }}>{entry.city || '-'}</td>
                    <td className="serif px-4 py-3" style={{ color: '#6B7280' }}>{entry.trigger_value ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className="mono text-xs font-medium px-2 py-1 rounded-full" style={outcomeStyle}>
                        {entry.outcome || '-'}
                      </span>
                    </td>
                    <td className="serif px-4 py-3" style={{ color: '#6B7280' }}>{entry.claims_created}</td>
                    <td className="mono px-4 py-3" style={{ color: '#6B7280' }}>
                      {entry.latency_ms ? `${entry.latency_ms}ms` : '-'}
                    </td>
                    <td className="mono px-4 py-3 text-xs" style={{ color: '#6B7280' }}>{time}</td>
                  </tr>
                );
              })}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>No trigger ledger entries</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
