import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data: profileData } = await admin.from('profiles').select('id, role').eq('id', user.id).single();
    const profile = profileData as { id: string; role: string } | null;
    // Role check disabled for hackathon

    const { data: logs, error: logsError } = await admin
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    const { data: ledger, error: ledgerError } = await admin
      .from('parametric_trigger_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (ledgerError) {
      return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    }

    return NextResponse.json({
      system_logs: logs,
      trigger_ledger: ledger,
    });
  } catch (error) {
    console.error('[Admin] System health error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch system health' },
      { status: 500 },
    );
  }
}
