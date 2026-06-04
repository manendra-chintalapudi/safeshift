import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/auth/check-phone
 * Check if a phone number is already registered.
 */
export async function POST(request: Request) {
  try {
    const { phone_number } = await request.json();

    if (!phone_number) {
      return NextResponse.json({ exists: false });
    }

    const admin = createAdminClient();

    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('phone_number', phone_number)
      .maybeSingle();

    return NextResponse.json({ exists: !!data });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
