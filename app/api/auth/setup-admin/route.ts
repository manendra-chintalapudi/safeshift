import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/auth/setup-admin
 * One-time setup: creates the admin user if it doesn't exist.
 */
export async function POST() {
  try {
    const admin = createAdminClient();
    const email = 'admin@safeshift.app';
    const password = 'admin123';

    // Check if admin already exists
    const { data: users } = await admin.auth.admin.listUsers();
    const existing = users?.users?.find((u) => u.email === email);

    if (existing) {
      // Ensure profile has admin role
      await admin
        .from('profiles')
        .update({ role: 'admin', full_name: 'SafeShift Admin', onboarding_status: 'complete' } as never)
        .eq('id', existing.id);

      return NextResponse.json({ status: 'ok', message: 'Admin already exists', user_id: existing.id });
    }

    // Create admin user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'SafeShift Admin' },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Set admin role in profile
    if (authData.user) {
      await admin
        .from('profiles')
        .update({ role: 'admin', full_name: 'SafeShift Admin', onboarding_status: 'complete' } as never)
        .eq('id', authData.user.id);
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Admin created',
      user_id: authData.user?.id,
      email,
    });
  } catch (error) {
    console.error('[SetupAdmin] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
