import { NextResponse } from 'next/server';
import { storeOtp } from '@/lib/utils/otp-store';

export async function POST(request: Request) {
  try {
    const { phone, aadhaar_last4 } = await request.json();

    if (!phone || !aadhaar_last4) {
      return NextResponse.json({ error: 'Could not send OTP. Please try again.' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    storeOtp(phone, code);

    // Build the UIDAI-style message
    const message = `${code} is OTP for Aadhaar (XXXX XXXX ${aadhaar_last4}) (valid for 10 mins). Generate 16 Digit VID for Aadhaar Auth. visit uidai.gov.in -UIDAI`;

    return NextResponse.json({ success: true, message });
  } catch {
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
