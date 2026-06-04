// ============================================================================
// POST /api/auth/login-otp — Send mock OTP for phone-based login
// ============================================================================

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Look up user by phone number
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, phone_number, role, onboarding_status')
      .eq('phone_number', phone)
      .single();

    if (!profile) {
      // Also try with +91 prefix
      const { data: profile2 } = await supabase
        .from('profiles')
        .select('id, phone_number, role, onboarding_status')
        .eq('phone_number', `+91${phone}`)
        .single();

      if (!profile2) {
        return NextResponse.json(
          { error: 'No account found with this number. Please register first.' },
          { status: 404 },
        );
      }

      // Generate mock 6-digit OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const maskedPhone = `XXXXXX${phone.slice(-4)}`;

      return NextResponse.json({
        message: `${otp} is your SafeShift login OTP for ${maskedPhone}. Valid for 10 minutes. Do not share this code. - SafeShift`,
        role: (profile2 as { role: string }).role,
      });
    }

    // Generate mock 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const maskedPhone = `XXXXXX${phone.slice(-4)}`;

    return NextResponse.json({
      message: `${otp} is your SafeShift login OTP for ${maskedPhone}. Valid for 10 minutes. Do not share this code. - SafeShift`,
      role: (profile as { role: string }).role,
    });
  } catch (error) {
    console.error('[LoginOTP] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 },
    );
  }
}
