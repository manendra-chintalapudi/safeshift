'use client';

import { useState } from 'react';
import { upiVerifySchema } from '@/lib/validations/schemas';

interface UpiVerifyStepProps {
  initialUpi: string;
  onNext: (upiId: string) => void;
  onBack: () => void;
}

export default function UpiVerifyStep({ initialUpi, onNext, onBack }: UpiVerifyStepProps) {
  const [upiId, setUpiId] = useState(initialUpi || '');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    setError('');
    const result = upiVerifySchema.safeParse({ upi_id: upiId });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid UPI ID');
      return;
    }

    setVerifying(true);
    // Mock UPI verification
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);
    }, 1200);
  };

  return (
    <div>
      <h3 className="serif text-lg font-semibold mb-1" style={{ color: 'var(--ink)' }}>UPI Verification</h3>
      <p className="sans text-sm mb-6" style={{ color: 'var(--ink-60)' }}>
        Enter your UPI ID for receiving payouts.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="upi_id" className="mono block text-sm font-medium mb-1" style={{ color: 'var(--ink-60)' }}>
            UPI ID
          </label>
          <input
            id="upi_id"
            type="text"
            placeholder="yourname@upi"
            value={upiId}
            onChange={(e) => {
              setUpiId(e.target.value);
              setVerified(false);
              setError('');
            }}
            disabled={verifying || verified}
            className="w-full px-4 py-3 rounded-lg outline-none disabled:opacity-60"
            style={{ border: '1px solid var(--rule)', background: 'transparent', color: 'var(--ink)' }}
          />
          {error && <p className="text-sm mt-1" style={{ color: 'var(--red-acc)' }}>{error}</p>}
        </div>

        {verified ? (
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(240,120,32,0.10)', border: '1px solid #F07820' }}>
            <span className="text-lg" style={{ color: '#F07820' }}>&#10003;</span>
            <span className="sans text-sm font-medium" style={{ color: '#D4611A' }}>UPI ID verified successfully</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleVerify}
            disabled={!upiId || verifying}
            className="w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--ink)', color: 'var(--cream)' }}
          >
            {verifying ? 'Verifying...' : 'Verify UPI'}
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
          onClick={() => onNext(upiId)}
          disabled={!verified}
          className="flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#F07820', color: '#fff' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
