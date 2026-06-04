'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const ORANGE = '#F07820';
const F = "'Inter', sans-serif";

type Stage = 'form' | 'verifying' | 'verified' | 'registering';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const [porterId, setPorterId] = useState('');
  const [progress, setProgress] = useState(0);

  const [statusText, setStatusText] = useState('');
  const apiResult = useRef<{ found: boolean; porter_id: string } | null>(null);

  // Animate progress bar — slower, more realistic
  useEffect(() => {
    if (stage !== 'verifying') return;
    setProgress(0);
    apiResult.current = null;

    const steps = [
      { pct: 8,  ms: 600,  text: 'Connecting to Porter...' },
      { pct: 18, ms: 1400, text: 'Connecting to Porter...' },
      { pct: 32, ms: 2200, text: 'Searching driver records...' },
      { pct: 48, ms: 3200, text: 'Searching driver records...' },
      { pct: 61, ms: 4200, text: 'Fetching driver details...' },
      { pct: 74, ms: 5000, text: 'Fetching driver details...' },
      { pct: 85, ms: 5800, text: 'Validating identity...' },
      { pct: 92, ms: 6400, text: 'Validating identity...' },
      { pct: 96, ms: 7000, text: 'Almost done...' },
    ];

    const timers = steps.map(({ pct, ms, text }) =>
      setTimeout(() => { setProgress(pct); setStatusText(text); }, ms)
    );

    // After animation finishes, check if API already resolved
    const finishTimer = setTimeout(() => {
      if (apiResult.current) {
        if (apiResult.current.found) {
          setPorterId(apiResult.current.porter_id);
          setProgress(100);
          setStatusText('Verified!');
          setTimeout(() => setStage('verified'), 800);
        } else {
          setError('No Porter driver found with these details. Please check your name and phone number.');
          setStage('form');
        }
      }
      // If API hasn't resolved yet, the fetch handler will trigger it
    }, 7500);

    return () => { timers.forEach(clearTimeout); clearTimeout(finishTimer); };
  }, [stage]);

  // Auto-proceed after verified — give user time to see the success
  useEffect(() => {
    if (stage !== 'verified') return;
    const timer = setTimeout(() => doRegister(), 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    // Step 0: Check if phone already registered (before anything else)
    try {
      const checkRes = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone }),
      });
      const checkData = await checkRes.json();
      if (checkData.exists) {
        setError('A user with this phone number has already been registered.');
        return;
      }
    } catch {
      // If check fails, proceed anyway — registration will catch duplicates
    }

    // Start verification animation
    setStage('verifying');

    // Fire Porter API call in parallel with animation
    try {
      const res = await fetch('/api/auth/verify-porter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, phone }),
      });

      const data = await res.json();
      apiResult.current = { found: !!(res.ok && data.found), porter_id: data.porter_id || '' };

      // If animation already finished (progress >= 96), trigger result now
      if (progress >= 96) {
        if (apiResult.current.found) {
          setPorterId(apiResult.current.porter_id);
          setProgress(100);
          setStatusText('Verified!');
          setTimeout(() => setStage('verified'), 800);
        } else {
          setError('No Porter driver found with these details. Please check your name and phone number.');
          setStage('form');
        }
      }
      // Otherwise, the animation timer at 7500ms will pick it up
    } catch {
      setError('Could not connect to Porter. Please try again.');
      setStage('form');
    }
  }

  async function doRegister() {
    setStage('registering');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, phone_number: phone, email: email || undefined, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setStage('form');
        return;
      }

      const supabase = createClient();
      const loginEmail = data.email || email || `${phone}@safeshift.app`;
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

      if (signInError) {
        setError(`Account created! Please sign in with: ${loginEmail}`);
        setStage('form');
        return;
      }

      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setStage('form');
    }
  }

  // ── Porter verification screen ──
  if (stage === 'verifying' || stage === 'verified' || stage === 'registering') {
    return (
      <div style={{ background: '#ffffff', borderRadius: 16, padding: '2em', textAlign: 'center' }}>
        <style>{`
          @keyframes spin-ring { to { transform: rotate(360deg); } }
          @keyframes fade-up { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
          .fade-up { animation: fade-up 0.4s ease both; }
        `}</style>

        {/* Porter Logo — large */}
        <img src="/porter-logo.png" alt="Porter" width={120} height={120} style={{ margin: '0 auto 24px', display: 'block', objectFit: 'contain' }} />

        {stage === 'verifying' && (
          <div className="fade-up">
            {/* Spinner — Porter blue */}
            <div style={{
              width: 56, height: 56, margin: '0 auto 20px',
              border: '3px solid #E5E7EB', borderTop: '3px solid #1E3A8A',
              borderRadius: '50%', animation: 'spin-ring 0.8s linear infinite',
            }} />

            <p style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', margin: '0 0 6px', fontFamily: F }}>
              Verifying Porter ID...
            </p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', fontFamily: F }}>
              Checking {fullName} with Porter systems
            </p>

            {/* Progress bar — Porter blue */}
            <div style={{ height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden', maxWidth: 280, margin: '0 auto' }}>
              <div style={{
                height: '100%', borderRadius: 3, background: '#1E3A8A',
                width: `${progress}%`, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            </div>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8, fontFamily: F }}>
              {statusText || 'Connecting to Porter...'}
            </p>
          </div>
        )}

        {stage === 'verified' && (
          <div className="fade-up">
            {/* Success checkmark — Porter blue */}
            <div style={{
              width: 56, height: 56, margin: '0 auto 20px',
              borderRadius: '50%', background: '#EEF2FF', border: '2px solid #1E3A8A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>

            <p style={{ fontSize: 17, fontWeight: 700, color: '#1E3A8A', margin: '0 0 6px', fontFamily: F }}>
              Porter Driver Verified!
            </p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 12px', fontFamily: F }}>
              Welcome, {fullName}
            </p>

            {/* Porter ID badge — blue theme */}
            <div style={{
              display: 'inline-block', padding: '8px 20px', borderRadius: 8,
              background: '#EEF2FF', border: '1px solid #C7D2FE',
            }}>
              <span style={{ fontSize: 12, color: '#6B7280', fontFamily: F }}>Porter ID: </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A', letterSpacing: '0.05em', fontFamily: F }}>{porterId}</span>
            </div>

            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 16, fontFamily: F }}>
              Setting up your account...
            </p>
          </div>
        )}

        {stage === 'registering' && (
          <div className="fade-up">
            <div style={{
              width: 56, height: 56, margin: '0 auto 20px',
              border: '3px solid #E5E7EB', borderTop: '3px solid #1E3A8A',
              borderRadius: '50%', animation: 'spin-ring 0.8s linear infinite',
            }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', fontFamily: F }}>
              Creating your SafeShift account...
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Registration form ──
  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', boxSizing: 'border-box',
    padding: '0 1em', height: 48,
    background: '#f9f9f9', border: '1.5px solid #1a1a1a', borderRadius: 6,
    fontSize: '0.95em', fontWeight: 500, color: '#1a1a1a',
    outline: 'none', fontFamily: F, transition: 'border-color .2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 6,
    fontSize: '0.875em', fontWeight: 700, color: '#1a1a1a', fontFamily: F,
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: 16, padding: '2em' }}>
      <Link href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: '0.8rem', fontWeight: 600, color: '#888',
        textDecoration: 'none', marginBottom: '1em', fontFamily: F,
        transition: 'color 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = ORANGE)}
        onMouseLeave={e => (e.currentTarget.style.color = '#888')}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
          <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </Link>

      <style>{`
        .ss-reg-input:focus { border-color: ${ORANGE} !important; box-shadow: 0 0 0 3px rgba(240,120,32,0.15); }
        .ss-register-btn { position:relative; overflow:hidden; background:#1a1a1a; color:#fff; }
        .ss-register-btn::before { content:''; position:absolute; bottom:0; left:0; width:100%; height:0; background:${ORANGE}; transition:height 0.35s cubic-bezier(0.22,1,0.36,1); z-index:0; }
        .ss-register-btn:hover:not(:disabled)::before { height:100%; }
        .ss-register-btn > span { position:relative; z-index:1; }
      `}</style>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '1.25em', textAlign: 'center', fontFamily: F }}>
        Create Account
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
        <div>
          <label style={labelStyle}>Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="ss-reg-input" style={inputStyle} placeholder="Rajesh Kumar" required />
        </div>

        <div>
          <label style={labelStyle}>Mobile Number</label>
          <div style={{ display: 'flex' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 12px', background: '#f0f0f0', border: '1.5px solid #1a1a1a', borderRight: 'none', borderRadius: '6px 0 0 6px', fontSize: '0.95em', color: '#555', fontFamily: F }}>+91</span>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="ss-reg-input" style={{ ...inputStyle, borderRadius: '0 6px 6px 0' }}
              placeholder="9876543210" required />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Email <span style={{ fontWeight: 400, color: '#999' }}>(optional)</span></label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="ss-reg-input" style={inputStyle} placeholder="driver@example.com" />
        </div>

        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="ss-reg-input" style={inputStyle} placeholder="Min 6 characters" minLength={6} required />
        </div>

        {error && <p style={{ fontSize: '0.875rem', color: '#e53e3e' }}>{error}</p>}

        <button type="submit" disabled={stage !== 'form'} className="ss-register-btn"
          style={{ height: 48, width: '100%', borderRadius: 6, border: 'none', color: '#fff', fontSize: '1em', fontWeight: 700, cursor: 'pointer', fontFamily: F, opacity: stage !== 'form' ? 0.6 : 1 }}>
          <span>Register</span>
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '1em', color: '#666', fontFamily: F }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: ORANGE, fontWeight: 600 }}>Sign in</Link>
      </p>
    </div>
  );
}
