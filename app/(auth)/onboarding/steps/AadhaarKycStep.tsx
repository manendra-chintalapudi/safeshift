'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { aadhaarSchema } from '@/lib/validations/schemas';

interface AadhaarKycStepProps {
  onNext: (aadhaarHash: string) => void;
  onBack: () => void;
}

function hashLast4(aadhaar: string): string {
  const last4 = aadhaar.slice(-4);
  const masked = aadhaar.slice(0, 8).replace(/\d/g, 'X') + last4;
  return btoa(masked);
}

function formatAadhaar(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

type Step = 'input' | 'otp-sending' | 'otp' | 'autofilling' | 'verifying' | 'verified';

export default function AadhaarKycStep({ onNext, onBack }: AadhaarKycStepProps) {
  const [rawAadhaar, setRawAadhaar] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [phone, setPhone] = useState('');
  const [smsText, setSmsText] = useState('');
  const [showSms, setShowSms] = useState(false);
  const otpCode = useRef('');
  const doVerifyRef = useRef<() => void>(() => {});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('phone_number').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) setPhone((data as { phone_number: string }).phone_number || '');
        });
    });
  }, []);

  const last4 = rawAadhaar.slice(-4);
  const displayValue = formatAadhaar(rawAadhaar);

  // Auto-fill digits one by one, then auto-verify
  const startAutofill = useCallback((code: string) => {
    otpCode.current = code;
    const digits = code.split('');
    setStep('autofilling');
    setOtpDigits(['', '', '', '', '', '']);

    digits.forEach((digit, i) => {
      setTimeout(() => {
        setOtpDigits(prev => {
          const next = [...prev];
          next[i] = digit;
          return next;
        });
        // After last digit — auto-verify
        if (i === 5) {
          setTimeout(() => doVerifyRef.current(), 600);
        }
      }, 300 + i * 200);
    });
  }, []);

  const expectedOtp = useRef('');

  const doVerify = useCallback(() => {
    setError('');
    setStep('verifying');
    // Simulate verification delay
    setTimeout(() => {
      if (otpCode.current === expectedOtp.current) {
        setStep('verified');
      } else {
        setError('Invalid OTP. Please try again.');
        setStep('otp');
      }
    }, 1200);
  }, []);

  // Keep ref in sync
  doVerifyRef.current = doVerify;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
    setRawAadhaar(digits);
    setStep('input');
    setError('');
    setSmsText('');
    setShowSms(false);
    setOtpDigits(['', '', '', '', '', '']);
  };

  const handleVerifyAadhaar = async () => {
    setError('');
    const result = aadhaarSchema.safeParse({ aadhaar_number: rawAadhaar });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid Aadhaar number');
      return;
    }

    setStep('otp-sending');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, aadhaar_last4: last4 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send OTP'); setStep('input'); return; }

      const code = data.message.match(/^\d{6}/)?.[0] || '';
      expectedOtp.current = code;
      setSmsText(data.message);
      setShowSms(true);
      setStep('otp');

      // Start auto-fill after brief pause
      setTimeout(() => startAutofill(code), 1500);
    } catch {
      setError('Failed to send OTP. Please try again.');
      setStep('input');
    }
  };

  const showOtpBoxes = step === 'otp' || step === 'autofilling' || step === 'verifying';

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes otp-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .otp-digit-fill { animation: otp-pop 0.25s ease both; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sms-drop {
          from { opacity: 0; transform: translateY(-100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sms-dismiss {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-100%); }
        }
      `}</style>

      {/* ── SMS Notification Banner — fixed to top like a real phone notification ── */}
      {smsText && showSms && (
        <div style={{
          position: 'fixed', top: 16, left: 16, right: 16, zIndex: 999,
          maxWidth: 416, margin: '0 auto',
          background: '#ffffff', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
          padding: '14px 16px',
          animation: 'sms-drop 0.35s ease both',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {/* UIDAI icon */}
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: '#1A40C0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 16, color: '#fff', fontWeight: 800 }}>U</span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', fontFamily: "'Inter', sans-serif" }}>UIDAI</span>
                <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: "'Inter', sans-serif" }}>now</span>
              </div>
              <p style={{
                fontSize: 12, color: '#4B5563', lineHeight: 1.45, margin: 0,
                fontFamily: "'Inter', sans-serif",
              }}>
                {smsText}
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={() => setShowSms(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                flexShrink: 0, marginTop: -2,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <h3 className="serif text-lg font-semibold mb-1" style={{ color: 'var(--ink)' }}>Aadhaar KYC</h3>
      <p className="sans text-sm mb-6" style={{ color: 'var(--ink-60)' }}>
        Enter your 12-digit Aadhaar number for identity verification.
      </p>

      <div className="space-y-4">
        {/* Aadhaar input */}
        <div>
          <label htmlFor="aadhaar" className="mono block text-sm font-medium mb-1" style={{ color: 'var(--ink-60)' }}>
            Aadhaar Number
          </label>
          <input
            id="aadhaar"
            type="text"
            inputMode="numeric"
            placeholder="XXXX XXXX XXXX"
            value={displayValue}
            onChange={handleInputChange}
            disabled={step !== 'input'}
            className="w-full px-4 py-3 rounded-lg outline-none text-lg disabled:opacity-60"
            style={{ border: '1px solid var(--rule)', background: 'transparent', color: 'var(--ink)', letterSpacing: '0.15em' }}
          />
          {error && <p className="text-sm mt-1" style={{ color: 'var(--red-acc)' }}>{error}</p>}
        </div>

        {/* Sending OTP spinner */}
        {step === 'otp-sending' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
            <div style={{ width: 20, height: 20, border: '2px solid #E5E7EB', borderTop: '2px solid #F07820', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            <span className="sans text-sm" style={{ color: 'var(--ink-60)' }}>Sending OTP to your registered number...</span>
          </div>
        )}

        {/* OTP boxes */}
        {showOtpBoxes && (
          <div>
            <label className="mono block text-sm font-medium mb-2" style={{ color: 'var(--ink-60)' }}>
              {step === 'autofilling' ? 'Auto-reading OTP...' : step === 'verifying' ? 'Verifying...' : 'OTP'}
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {otpDigits.map((digit, i) => (
                <div
                  key={i}
                  className={digit ? 'otp-digit-fill' : ''}
                  style={{
                    width: 44, height: 52, borderRadius: 10,
                    border: digit ? '2px solid #1A1A1A' : '1.5px solid var(--rule)',
                    background: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 800, color: '#1A1A1A',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'border-color 0.2s',
                  }}
                >
                  {digit}
                </div>
              ))}
            </div>

            {step === 'autofilling' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                <div style={{ width: 14, height: 14, border: '2px solid #E5E7EB', borderTop: '2px solid #F07820', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                <span className="sans" style={{ fontSize: 12, color: '#F07820', fontWeight: 600 }}>Auto-reading SMS...</span>
              </div>
            )}

            {step === 'verifying' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                <div style={{ width: 14, height: 14, border: '2px solid #E5E7EB', borderTop: '2px solid #F07820', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                <span className="sans" style={{ fontSize: 12, color: 'var(--ink-60)' }}>Verifying with UIDAI...</span>
              </div>
            )}

          </div>
        )}

        {/* Verified */}
        {step === 'verified' && (
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(240,120,32,0.10)', border: '1px solid #F07820' }}>
            <span className="text-lg" style={{ color: '#F07820' }}>&#10003;</span>
            <span className="sans text-sm font-medium" style={{ color: '#D4611A' }}>
              Aadhaar (XXXX XXXX {last4}) verified successfully
            </span>
          </div>
        )}

        {/* Verify Aadhaar button — only at input step */}
        {step === 'input' && (
          <button
            type="button"
            onClick={handleVerifyAadhaar}
            disabled={rawAadhaar.length !== 12}
            className="w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--ink)', color: 'var(--cream)' }}
          >
            Verify Aadhaar
          </button>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-lg font-medium transition-colors"
          style={{ border: '1px solid var(--rule)', color: 'var(--ink-60)', background: 'transparent' }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => { setShowSms(false); onNext(hashLast4(rawAadhaar)); }}
          disabled={step !== 'verified'}
          className="flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#F07820', color: '#fff' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
