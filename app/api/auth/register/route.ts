import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/auth/register
 * Creates user via admin API — bypasses email verification and rate limits
 */
export async function POST(request: Request) {
  try {
    const { full_name, phone_number, email, password } = await request.json();

    if (!full_name || !phone_number || !password) {
      return NextResponse.json({ error: 'Name, phone, and password are required' }, { status: 400 });
    }

    // Auto-generate email from phone if not provided
    const userEmail = email || `${phone_number}@safeshift.app`;

    const admin = createAdminClient();

    // Create user via admin API (bypasses rate limits and email verification)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: userEmail,
      password,
      email_confirm: true, // Auto-confirm, no verification needed
      user_metadata: { full_name, phone_number },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Update profile with phone and name
    if (authData.user) {
      await admin
        .from('profiles')
        .update({ full_name, phone_number } as never)
        .eq('id', authData.user.id);
    }

    return NextResponse.json({
      status: 'ok',
      user_id: authData.user?.id,
      email: userEmail,
    });
  } catch (error) {
    console.error('[Register] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 500 }
    );
  }
}
