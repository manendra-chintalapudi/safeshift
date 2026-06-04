// Shared in-memory OTP store (demo mode)
// In production, replace with Redis or Supabase table

const otpStore = new Map<string, { code: string; expires: number }>();

export function storeOtp(phone: string, code: string) {
  otpStore.set(phone, { code, expires: Date.now() + 10 * 60 * 1000 });
}

export function verifyOtp(phone: string, code: string): { valid: boolean; error?: string } {
  const stored = otpStore.get(phone);
  if (!stored) return { valid: false, error: 'No OTP found. Please request a new one.' };
  if (Date.now() > stored.expires) return { valid: false, error: 'OTP expired. Please request a new one.' };
  if (stored.code !== code) return { valid: false, error: 'Invalid OTP. Please try again.' };
  otpStore.delete(phone); // one-time use
  return { valid: true };
}
