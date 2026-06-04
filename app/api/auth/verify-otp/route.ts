import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/utils/otp-store';

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 400 });
    }

    const result = verifyOtp(phone, otp);

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
