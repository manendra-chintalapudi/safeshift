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

    const { data, error } = await admin
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Admin] Drivers error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch drivers' },
      { status: 500 },
    );
  }
}
