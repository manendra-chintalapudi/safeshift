import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runAdjudicatorCore } from '@/lib/adjudicator/core';

export async function POST() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data: profileData } = await admin.from('profiles').select('id, role').eq('id', user.id).single();
    const profile = profileData as { id: string; role: string } | null;
    // Role check disabled for hackathon

    const result = await runAdjudicatorCore();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin] Run adjudicator error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run adjudicator' },
      { status: 500 },
    );
  }
}
