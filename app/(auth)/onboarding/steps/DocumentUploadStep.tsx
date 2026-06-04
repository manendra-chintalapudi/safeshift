'use client';

import { useState } from 'react';

interface DocumentUploadStepProps {
  initialDl: string;
  initialRc: string;
  onNext: (data: { dl_number: string; rc_number: string }) => void;
  onBack: () => void;
}

// Indian DL regex: XX-0019850034761 or XX00 19850034761
const DL_REGEX = /^(([A-Z]{2}[0-9]{2})( )|([A-Z]{2}-[0-9]{2}))((19|20)[0-9][0-9])[0-9]{7}$/;

// Indian RC regex: XX 00 XX 0000 (with optional spaces or hyphens)
const RC_REGEX = /^[A-Z]{2}[ -]?[0-9]{2}[ -]?[A-Z]{1,2}[ -]?[0-9]{4}$/;

type VerifyStep = 'idle' | 'verifying' | 'verified' | 'failed';

export default function DocumentUploadStep({ initialDl, initialRc, onNext, onBack }: DocumentUploadStepProps) {
  const [dlNumber, setDlNumber] = useState(initialDl || '');
  const [rcNumber, setRcNumber] = useState(initialRc || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dlValid, setDlValid] = useState(false);
  const [rcValid, setRcValid] = useState(false);
  const [lcvStep, setLcvStep] = useState<VerifyStep>('idle');
  const [vehicleInfo, setVehicleInfo] = useState<{ model: string; vehicle_class: string; source: string } | null>(null);

  const validateDl = (val: string) => {
    const upper = val.toUpperCase();
    setDlNumber(upper);
    setDlValid(DL_REGEX.test(upper));
    setErrors(prev => ({ ...prev, dl_number: '' }));
  };

  const validateRc = (val: string) => {
    const upper = val.toUpperCase().replace(/\s/g, '');
    setRcNumber(upper);
    const valid = RC_REGEX.test(upper);
    setRcValid(valid);
    setErrors(prev => ({ ...prev, rc_number: '' }));
    // Reset LCV verification when RC changes
    if (lcvStep !== 'idle') { setLcvStep('idle'); setVehicleInfo(null); }
  };

  const handleVerifyDl = () => {
    if (!DL_REGEX.test(dlNumber)) {
      setErrors(prev => ({ ...prev, dl_number: 'Invalid DL format. Use: XX-0019850034761 or XX00 19850034761' }));
      setDlValid(false);
      return;
    }
    setDlValid(true);
    setErrors(prev => ({ ...prev, dl_number: '' }));
  };

  const handleVerifyRc = async () => {
    const rc = rcNumber.toUpperCase().replace(/\s/g, '');
    if (!RC_REGEX.test(rc)) {
      setErrors(prev => ({ ...prev, rc_number: 'Invalid RC number. Please check and try again.' }));
      setRcValid(false);
      return;
    }

    setRcValid(true);
    setErrors(prev => ({ ...prev, rc_number: '' }));
    setLcvStep('verifying');

    // Verify LCV via mock Vahan API
    try {
      const res = await fetch('/api/auth/verify-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rc_number: rc }),
      });
      const data = await res.json();
      if (res.ok && data.found && data.vehicle_type === 'LCV') {
        setVehicleInfo({ model: data.model, vehicle_class: data.vehicle_class, source: data.source });
        setLcvStep('verified');
      } else {
        setErrors(prev => ({ ...prev, rc_number: 'Vehicle is not registered as an LCV. SafeShift is only for LCV partners.' }));
        setLcvStep('failed');
      }
    } catch {
      setErrors(prev => ({ ...prev, rc_number: 'Could not verify vehicle. Please try again.' }));
      setLcvStep('failed');
    }
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!dlValid) errs.dl_number = 'Please verify your Driving Licence number';
    if (lcvStep !== 'verified') errs.rc_number = 'Please verify your RC number';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onNext({ dl_number: dlNumber, rc_number: rcNumber });
  };

  return (
    <div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <h3 className="serif text-lg font-semibold mb-1" style={{ color: 'var(--ink)' }}>Verify Documents</h3>
      <p className="sans text-sm mb-6" style={{ color: 'var(--ink-60)' }}>
        Enter your driving licence and vehicle RC for verification.
      </p>

      <div className="space-y-5">

        {/* ── Driving Licence ── */}
        <div>
          <label htmlFor="dl_number" className="mono block text-sm font-medium mb-1" style={{ color: 'var(--ink-60)' }}>
            Driving Licence Number
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="dl_number"
              type="text"
              placeholder="HR-0619850034761"
              value={dlNumber}
              onChange={(e) => validateDl(e.target.value)}
              disabled={dlValid}
              maxLength={16}
              className="flex-1 px-4 py-3 rounded-lg outline-none disabled:opacity-60"
              style={{
                border: `1px solid ${dlValid ? '#22C55E' : errors.dl_number ? 'var(--red-acc)' : 'var(--rule)'}`,
                background: 'transparent', color: 'var(--ink)', textTransform: 'uppercase',
              }}
            />
            {!dlValid && (
              <button
                type="button"
                onClick={handleVerifyDl}
                disabled={dlNumber.length < 15}
                className="px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--ink)', color: 'var(--cream)', border: 'none', whiteSpace: 'nowrap' }}
              >
                Verify
              </button>
            )}
          </div>
          {errors.dl_number && <p className="text-sm mt-1" style={{ color: 'var(--red-acc)' }}>{errors.dl_number}</p>}
          {dlValid && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ color: '#22C55E', fontSize: 16 }}>&#10003;</span>
              <span className="sans text-sm" style={{ color: '#22C55E', fontWeight: 600 }}>Driving Licence verified</span>
              <button onClick={() => { setDlValid(false); setDlNumber(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-30)' }}>Edit</button>
            </div>
          )}
        </div>

        {/* ── Vehicle RC ── */}
        <div>
          <label htmlFor="rc_number" className="mono block text-sm font-medium mb-1" style={{ color: 'var(--ink-60)' }}>
            Vehicle RC Number
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="rc_number"
              type="text"
              placeholder="MH02AB1234"
              value={rcNumber}
              onChange={(e) => validateRc(e.target.value)}
              disabled={lcvStep === 'verified'}
              maxLength={10}
              className="flex-1 px-4 py-3 rounded-lg outline-none disabled:opacity-60"
              style={{
                border: `1px solid ${lcvStep === 'verified' ? '#22C55E' : errors.rc_number ? 'var(--red-acc)' : 'var(--rule)'}`,
                background: 'transparent', color: 'var(--ink)', textTransform: 'uppercase',
              }}
            />
            {lcvStep !== 'verified' && lcvStep !== 'verifying' && (
              <button
                type="button"
                onClick={handleVerifyRc}
                disabled={rcNumber.length < 8}
                className="px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--ink)', color: 'var(--cream)', border: 'none', whiteSpace: 'nowrap' }}
              >
                Verify
              </button>
            )}
          </div>
          {errors.rc_number && <p className="text-sm mt-1" style={{ color: 'var(--red-acc)' }}>{errors.rc_number}</p>}

          {/* LCV Verifying */}
          {lcvStep === 'verifying' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '10px 12px', borderRadius: 8, background: '#F9FAFB' }}>
              <div style={{ width: 16, height: 16, border: '2px solid #E5E7EB', borderTop: '2px solid #1E3A8A', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              <span className="sans text-sm" style={{ color: 'var(--ink-60)' }}>Verifying vehicle type with Vahan...</span>
            </div>
          )}

          {/* LCV Verified */}
          {lcvStep === 'verified' && vehicleInfo && (
            <div style={{ marginTop: 8, padding: '12px 14px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ color: '#22C55E', fontSize: 16 }}>&#10003;</span>
                <span className="sans text-sm" style={{ color: '#166534', fontWeight: 700 }}>LCV Verified</span>
                <button onClick={() => { setLcvStep('idle'); setRcValid(false); setRcNumber(''); setVehicleInfo(null); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6B7280' }}>Edit</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mono" style={{ fontSize: 11, color: '#6B7280' }}>Vehicle Class</span>
                  <span className="sans" style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>{vehicleInfo.vehicle_class}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mono" style={{ fontSize: 11, color: '#6B7280' }}>Model</span>
                  <span className="sans" style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>{vehicleInfo.model}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mono" style={{ fontSize: 11, color: '#6B7280' }}>Source</span>
                  <span className="sans" style={{ fontSize: 11, color: '#6B7280' }}>{vehicleInfo.source}</span>
                </div>
              </div>
            </div>
          )}
        </div>
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
          onClick={handleSubmit}
          disabled={!dlValid || lcvStep !== 'verified'}
          className="flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#F07820', color: '#fff' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
