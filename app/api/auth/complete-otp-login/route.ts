// ============================================================================
// POST /api/auth/complete-otp-login — Complete phone OTP login
// Looks up the user by phone, generates a magic link token via Supabase admin,
// and returns it so the client can establish a session.
// ============================================================================

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Look up user by phone — try both formats
    let profileRow: { id: string; role: string; onboarding_status: string } | null = null;

    const { data: p1 } = await supabase
      .from('profiles')
      .select('id, role, onboarding_status')
      .eq('phone_number', phone)
      .single();

    if (p1) {
      profileRow = p1 as unknown as { id: string; role: string; onboarding_status: string };
    } else {
      const { data: p2 } = await supabase
        .from('profiles')
        .select('id, role, onboarding_status')
        .eq('phone_number', `+91${phone}`)
        .single();
      if (p2) {
        profileRow = p2 as unknown as { id: string; role: string; onboarding_status: string };
      }
    }

    if (!profileRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the auth user's email
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profileRow.id);
    if (authError || !authUser?.user?.email) {
      return NextResponse.json({ error: 'Failed to retrieve user account' }, { status: 500 });
    }

    const email = authUser.user.email;

    // Generate a magic link via admin — gives us a hashed token for session creation
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[CompleteOTPLogin] generateLink error:', linkError);
      return NextResponse.json({ error: 'Failed to generate login session' }, { status: 500 });
    }

    return NextResponse.json({
      token_hash: linkData.properties.hashed_token,
      email,
      role: profileRow.role,
      onboarding_status: profileRow.onboarding_status,
    });
  } catch (error) {
    console.error('[CompleteOTPLogin] Error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 },
    );
  }
}
