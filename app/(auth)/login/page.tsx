'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import gsap from 'gsap';

const ORANGE  = '#F07820';

const INK     = '#7C3A0A';   // dark brown-orange for strokes

// ─── SVG position helper ──────────────────────────────────────────────────────
function getElPosition(el: Element): { x: number; y: number } {
  let x = 0, y = 0;
  let cur: HTMLElement | null = el as HTMLElement;
  while (cur) {
    if (cur.tagName === 'BODY') {
      x += cur.offsetLeft - (cur.scrollLeft || document.documentElement.scrollLeft) + cur.clientLeft;
      y += cur.offsetTop  - (cur.scrollTop  || document.documentElement.scrollTop)  + cur.clientTop;
    } else {
      x += cur.offsetLeft - cur.scrollLeft + cur.clientLeft;
      y += cur.offsetTop  - cur.scrollTop  + cur.clientTop;
    }
    cur = cur.offsetParent as HTMLElement | null;
  }
  return { x, y };
}
function getAngle(x1: number, y1: number, x2: number, y2: number) {
  return Math.atan2(y1 - y2, x1 - x2);
}

// ─────────────────────────────────────────────────────────────────────────────
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'admin' ? 'admin' : null;
  const [role, setRole] = useState<'driver' | 'admin' | null>(initialRole);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const isAdminLogin = role === 'admin';

  // OTP login state
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'sending' | 'otp' | 'autofilling' | 'verifying' | 'signing-in'>('phone');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpSmsText, setOtpSmsText] = useState('');
  const [showOtpSms, setShowOtpSms] = useState(false);
  const expectedLoginOtp = useRef('');
  const otpCodeRef = useRef('');
  const doOtpVerifyRef = useRef<() => void>(() => {});

  // ── SVG refs ──────────────────────────────────────────────────────────────
  const svgWrapRef    = useRef<HTMLDivElement>(null);
  const emailRef      = useRef<HTMLInputElement>(null);
  const eyeLRef       = useRef<SVGGElement>(null);
  const eyeRRef       = useRef<SVGGElement>(null);
  const noseRef       = useRef<SVGPathElement>(null);
  const mouthRef      = useRef<SVGGElement>(null);
  const chinRef       = useRef<SVGPathElement>(null);
  const faceRef       = useRef<SVGPathElement>(null);
  const eyebrowRef    = useRef<SVGGElement>(null);
  const outerEarLRef  = useRef<SVGGElement>(null);
  const outerEarRRef  = useRef<SVGGElement>(null);
  const earHairLRef   = useRef<SVGGElement>(null);
  const earHairRRef   = useRef<SVGGElement>(null);
  const hairRef       = useRef<SVGPathElement>(null);
  const armLRef       = useRef<SVGGElement>(null);
  const armRRef       = useRef<SVGGElement>(null);
  const twoFingersRef = useRef<SVGGElement>(null);
  const bodyBGRef     = useRef<SVGPathElement>(null);
  const bodyBGChRef   = useRef<SVGPathElement>(null);
  const mouthBGRef    = useRef<SVGPathElement>(null);
  const mouthMedBGRef = useRef<SVGPathElement>(null);
  const mouthLgBGRef  = useRef<SVGPathElement>(null);
  const mouthOutRef   = useRef<SVGPathElement>(null);

  // ── anim state ────────────────────────────────────────────────────────────
  const activeEl        = useRef<string | null>(null);
  const eyesCovered     = useRef(false);
  const showPassClicked = useRef(false);
  const mouthStatus     = useRef<'small'|'medium'|'large'>('small');
  const eyeScaleRef     = useRef(1);
  const blinkTween      = useRef<gsap.core.Tween | null>(null);

  // ── helpers ───────────────────────────────────────────────────────────────
  const setMouthState = useCallback((state: 'small'|'medium'|'large') => {
    gsap.to(mouthBGRef.current,    { duration: .3, autoAlpha: state === 'small'  ? 1 : 0 });
    gsap.to(mouthMedBGRef.current, { duration: .3, autoAlpha: state === 'medium' ? 1 : 0 });
    gsap.to(mouthLgBGRef.current,  { duration: .3, autoAlpha: state === 'large'  ? 1 : 0 });
    gsap.to(mouthOutRef.current,   { duration: .3, autoAlpha: state === 'small'  ? 1 : 0 });
  }, []);

  const calculateFaceMove = useCallback(() => {
    const emailEl = emailRef.current;
    const svgEl   = svgWrapRef.current;
    if (!emailEl || !svgEl) return;
    // Also guard against the SVG being mounted while one or more inner
    // face parts aren't yet attached (rare, but GSAP throws on any null).
    if (!eyeLRef.current || !eyeRRef.current || !mouthRef.current) return;

    const svgC  = getElPosition(svgEl);
    const emC   = getElPosition(emailEl);
    const cx    = svgC.x + svgEl.offsetWidth / 2;
    const eyeL  = { x: svgC.x + 84,  y: svgC.y + 76 };
    const eyeR  = { x: svgC.x + 113, y: svgC.y + 76 };
    const noseC = { x: svgC.x + 97,  y: svgC.y + 81 };
    const mouC  = { x: svgC.x + 100, y: svgC.y + 100 };
    const sMax  = emailEl.scrollWidth;

    const carPos = emailEl.selectionEnd ?? emailEl.value.length;
    const div  = document.createElement('div');
    const span = document.createElement('span');
    const cs   = getComputedStyle(emailEl);
    Array.from(cs).forEach(p => { (div.style as unknown as Record<string,string>)[p] = (cs as unknown as Record<string,string>)[p]; });
    div.style.position = 'absolute'; div.style.visibility = 'hidden'; div.style.whiteSpace = 'pre';
    document.body.appendChild(div);
    div.textContent  = emailEl.value.slice(0, carPos);
    span.textContent = emailEl.value.slice(carPos) || '.';
    div.appendChild(span);
    const caret  = getElPosition(span);
    const dFromC = cx - (caret.x + emC.x);
    document.body.removeChild(div);

    const scrolled = emailEl.scrollWidth > sMax;
    const tX = scrolled ? emC.x + sMax : emC.x + caret.x;
    const tY = emC.y + 25;

    const elA = getAngle(eyeL.x, eyeL.y, tX, tY);
    const erA = getAngle(eyeR.x, eyeR.y, tX, tY);
    const nA  = getAngle(noseC.x, noseC.y, tX, tY);
    const mA  = getAngle(mouC.x,  mouC.y,  tX, tY);

    const elX = Math.cos(elA)*20, elY = Math.sin(elA)*10;
    const erX = Math.cos(erA)*20, erY = Math.sin(erA)*10;
    const nX  = Math.cos(nA)*23,  nY  = Math.sin(nA)*10;
    const mX  = Math.cos(mA)*23,  mY  = Math.sin(mA)*10, mR = Math.cos(mA)*6;
    const cX  = mX*.8, cY = mY*.5;
    let   cS  = 1 - (dFromC*.15)/100;
    if (cS > 1) { cS = 1-(cS-1); if(cS<.5) cS=.5; }
    const fX  = mX*.3, fY = mY*.4;
    const fSk = Math.cos(mA)*5, eSk = Math.cos(mA)*25;
    const eaX = Math.cos(mA)*4, eaY = Math.cos(mA)*5;
    const hX  = Math.cos(mA)*6;

    gsap.to(eyeLRef.current,      { duration:1, x:-elX, y:-elY, ease:'expo.out' });
    gsap.to(eyeRRef.current,      { duration:1, x:-erX, y:-erY, ease:'expo.out' });
    gsap.to(noseRef.current,      { duration:1, x:-nX, y:-nY, rotation:mR, transformOrigin:'center center', ease:'expo.out' });
    gsap.to(mouthRef.current,     { duration:1, x:-mX, y:-mY, rotation:mR, transformOrigin:'center center', ease:'expo.out' });
    gsap.to(chinRef.current,      { duration:1, x:-cX, y:-cY, scaleY:cS, ease:'expo.out' });
    gsap.to(faceRef.current,      { duration:1, x:-fX, y:-fY, skewX:-fSk, transformOrigin:'center top', ease:'expo.out' });
    gsap.to(eyebrowRef.current,   { duration:1, x:-fX, y:-fY, skewX:-eSk, transformOrigin:'center top', ease:'expo.out' });
    gsap.to(outerEarLRef.current, { duration:1, x:eaX, y:-eaY, ease:'expo.out' });
    gsap.to(outerEarRRef.current, { duration:1, x:eaX, y: eaY, ease:'expo.out' });
    gsap.to(earHairLRef.current,  { duration:1, x:-eaX, y:-eaY, ease:'expo.out' });
    gsap.to(earHairRRef.current,  { duration:1, x:-eaX, y: eaY, ease:'expo.out' });
    gsap.to(hairRef.current,      { duration:1, x:hX, scaleY:1.2, transformOrigin:'center bottom', ease:'expo.out' });
  }, []);

  const resetFace = useCallback(() => {
    // Guard: SVG may be unmounted (role picker shown, navigation) when a
    // delayed blur handler fires. GSAP throws "Cannot read _gsap of null"
    // if any target in an array is null, so bail early if the face is gone.
    if (!eyeLRef.current || !eyeRRef.current) return;
    gsap.to([eyeLRef.current, eyeRRef.current], { duration:1, x:0, y:0, ease:'expo.out' });
    gsap.to(noseRef.current,  { duration:1, x:0, y:0, scaleX:1, scaleY:1, ease:'expo.out' });
    gsap.to(mouthRef.current, { duration:1, x:0, y:0, rotation:0, ease:'expo.out' });
    gsap.to(chinRef.current,  { duration:1, x:0, y:0, scaleY:1, ease:'expo.out' });
    gsap.to([faceRef.current, eyebrowRef.current], { duration:1, x:0, y:0, skewX:0, ease:'expo.out' });
    gsap.to([outerEarLRef.current, outerEarRRef.current, earHairLRef.current, earHairRRef.current, hairRef.current],
      { duration:1, x:0, y:0, scaleY:1, ease:'expo.out' });
  }, []);

  const coverEyes = useCallback(() => {
    if (!armLRef.current || !armRRef.current) return;
    gsap.killTweensOf([armLRef.current, armRRef.current]);
    gsap.set([armLRef.current, armRRef.current], { visibility:'visible' });
    gsap.to(armLRef.current, { duration:.45, x:-93, y:10, rotation:0, ease:'quad.out' });
    gsap.to(armRRef.current, { duration:.45, x:-93, y:10, rotation:0, ease:'quad.out', delay:.1 });
    gsap.to(bodyBGRef.current,   { duration:.45, autoAlpha:0 });
    gsap.to(bodyBGChRef.current, { duration:.45, autoAlpha:1 });
    eyesCovered.current = true;
  }, []);

  const uncoverEyes = useCallback(() => {
    if (!armLRef.current || !armRRef.current) return;
    gsap.killTweensOf([armLRef.current, armRRef.current]);
    gsap.to(armLRef.current, { duration:1.35, y:220, ease:'quad.out' });
    gsap.to(armLRef.current, { duration:1.35, rotation:105, ease:'quad.out', delay:.1 });
    gsap.to(armRRef.current, { duration:1.35, y:220, ease:'quad.out' });
    gsap.to(armRRef.current, { duration:1.35, rotation:-105, ease:'quad.out', delay:.1, onComplete:() => {
      if (armLRef.current && armRRef.current) {
        gsap.set([armLRef.current, armRRef.current], { visibility:'hidden' });
      }
    }});
    gsap.to(bodyBGRef.current,   { duration:.45, autoAlpha:1 });
    gsap.to(bodyBGChRef.current, { duration:.45, autoAlpha:0 });
    eyesCovered.current = false;
  }, []);

  const startBlinking = useCallback((delay?: number) => {
    if (!eyeLRef.current || !eyeRRef.current) return;
    const d = delay ? Math.floor(Math.random() * delay) : 1;
    blinkTween.current = gsap.to([eyeLRef.current, eyeRRef.current], {
      duration:.1, delay:d, scaleY:0, yoyo:true, repeat:1,
      transformOrigin:'center center',
      onComplete: () => startBlinking(12),
    });
  }, []);

  useEffect(() => {
    // Skip GSAP setup when role picker is shown (SVG not rendered)
    if (role === null) return;
    if (!armLRef.current) return;
    gsap.set(armLRef.current,    { x:-93, y:220, rotation:105,  transformOrigin:'top left',  visibility:'hidden' });
    gsap.set(armRRef.current,    { x:-93, y:220, rotation:-105, transformOrigin:'top right', visibility:'hidden' });
    gsap.set(mouthRef.current,   { transformOrigin:'center center' });
    gsap.set(mouthMedBGRef.current, { autoAlpha:0 });
    gsap.set(mouthLgBGRef.current,  { autoAlpha:0 });
    gsap.set(bodyBGChRef.current,   { autoAlpha:0 });
    startBlinking(5);
    return () => {
      blinkTween.current?.kill();
      gsap.killTweensOf([armLRef.current, armRRef.current, eyeLRef.current, eyeRRef.current,
        noseRef.current, mouthRef.current, chinRef.current, faceRef.current,
        eyebrowRef.current, hairRef.current, bodyBGRef.current, bodyBGChRef.current]);
    };
  }, [startBlinking, role]);

  // ── email handlers ────────────────────────────────────────────────────────
  function handleEmailFocus() {
    activeEl.current = 'email';
    calculateFaceMove();
  }
  function handleEmailBlur() {
    activeEl.current = null;
    setTimeout(() => { if (activeEl.current === 'email') return; resetFace(); }, 100);
  }
  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setEmail(val);
    requestAnimationFrame(() => calculateFaceMove());
    if (val.length > 0) {
      if (val.includes('@')) {
        if (mouthStatus.current !== 'large') {
          mouthStatus.current = 'large';
          setMouthState('large');
          gsap.to([eyeLRef.current, eyeRRef.current], { duration:1, scaleX:.65, scaleY:.65, transformOrigin:'center center', ease:'expo.out' });
          eyeScaleRef.current = .65;
        }
      } else {
        if (mouthStatus.current !== 'medium') {
          mouthStatus.current = 'medium';
          setMouthState('medium');
          gsap.to([eyeLRef.current, eyeRRef.current], { duration:1, scaleX:.85, scaleY:.85, ease:'expo.out' });
          eyeScaleRef.current = .85;
        }
      }
    } else {
      if (mouthStatus.current !== 'small') {
        mouthStatus.current = 'small';
        setMouthState('small');
        gsap.to([eyeLRef.current, eyeRRef.current], { duration:1, scaleX:1, scaleY:1, ease:'expo.out' });
        eyeScaleRef.current = 1;
      }
    }
  }

  // ── password handlers ─────────────────────────────────────────────────────
  function handlePasswordFocus() { activeEl.current = 'password'; if (!eyesCovered.current) coverEyes(); }
  function handlePasswordBlur()  {
    activeEl.current = null;
    setTimeout(() => { if (activeEl.current === 'toggle' || activeEl.current === 'password') return; uncoverEyes(); }, 100);
  }
  function handleToggleFocus() { activeEl.current = 'toggle'; if (!eyesCovered.current) coverEyes(); }
  function handleToggleBlur()  {
    activeEl.current = null;
    if (!showPassClicked.current) {
      setTimeout(() => { if (activeEl.current === 'password' || activeEl.current === 'toggle') return; uncoverEyes(); }, 100);
    }
  }
  function handleToggleChange(checked: boolean) {
    setShowPass(checked);
    setTimeout(() => {
      if (checked) gsap.to(twoFingersRef.current, { duration:.35, transformOrigin:'bottom left', rotation:30,  x:-9, y:-2, ease:'power2.inOut' });
      else         gsap.to(twoFingersRef.current, { duration:.35, transformOrigin:'bottom left', rotation:0,   x:0,  y:0,  ease:'power2.inOut' });
    }, 100);
  }

  // ── auth submit ───────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const supabase = createClient();
    const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    const user = signInData.user;
    if (!user) { setError('Login failed — no user returned'); setLoading(false); return; }
    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('onboarding_status, role').eq('id', user.id).single();
    console.log('[Login] Profile fetch:', { profile, error: profileError?.message });
    const p = profile as { onboarding_status: string; role: string } | null;
    if (!p) { router.push('/dashboard'); return; }

    // Enforce role — reject cross-role login silently
    if ((role === 'admin' && p.role !== 'admin') || (role === 'driver' && p.role === 'admin')) {
      await supabase.auth.signOut();
      setError('Invalid credentials');
      setLoading(false);
      return;
    }

    if (p.role === 'admin') router.push('/admin');
    else if (p.onboarding_status === 'complete') router.push('/dashboard');
    else router.push('/onboarding');
  }

  // ── OTP login handlers ───────────────────────────────────────────────────
  const startOtpAutofill = useCallback((code: string) => {
    otpCodeRef.current = code;
    const digits = code.split('');
    setOtpStep('autofilling');
    setOtpDigits(['', '', '', '', '', '']);
    digits.forEach((digit, i) => {
      setTimeout(() => {
        setOtpDigits(prev => { const next = [...prev]; next[i] = digit; return next; });
        if (i === 5) setTimeout(() => doOtpVerifyRef.current(), 600);
      }, 300 + i * 200);
    });
  }, []);

  const doOtpVerify = useCallback(async () => {
    setOtpStep('verifying');
    if (otpCodeRef.current !== expectedLoginOtp.current) {
      setError('Invalid OTP. Please try again.');
      setOtpStep('otp');
      return;
    }
    // OTP matched — complete login via server
    setOtpStep('signing-in');
    try {
      const res = await fetch('/api/auth/complete-otp-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); setOtpStep('phone'); return; }

      // Reject admin trying to use driver OTP login
      if (data.role === 'admin') {
        setError('Admin accounts must use password login.');
        setOtpStep('phone');
        return;
      }

      // Establish session via magic link token
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      });

      if (verifyError) {
        setError(verifyError.message || 'Session creation failed');
        setOtpStep('phone');
        return;
      }

      // Redirect based on onboarding status
      if (data.onboarding_status === 'complete') router.push('/dashboard');
      else router.push('/onboarding');
    } catch {
      setError('Login failed. Please try again.');
      setOtpStep('phone');
    }
  }, [otpPhone, router]);

  doOtpVerifyRef.current = doOtpVerify;

  async function handleSendOtp() {
    setError('');
    if (!/^[6-9]\d{9}$/.test(otpPhone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setOtpStep('sending');
    try {
      const res = await fetch('/api/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send OTP'); setOtpStep('phone'); return; }

      // Reject admin accounts
      if (data.role === 'admin') {
        setError('Admin accounts must use password login.');
        setOtpStep('phone');
        return;
      }

      const code = data.message.match(/^\d{6}/)?.[0] || '';
      expectedLoginOtp.current = code;
      setOtpSmsText(data.message);
      setShowOtpSms(true);
      setOtpStep('otp');

      // Auto-fill after brief pause
      setTimeout(() => startOtpAutofill(code), 1500);
    } catch {
      setError('Failed to send OTP. Please try again.');
      setOtpStep('phone');
    }
  }

  function resetOtpState() {
    setOtpStep('phone');
    setOtpDigits(['', '', '', '', '', '']);
    setOtpSmsText('');
    setShowOtpSms(false);
    setError('');
    expectedLoginOtp.current = '';
    otpCodeRef.current = '';
  }

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', boxSizing: 'border-box',
    padding: '0 1em', height: 58,
    background: '#f9f9f9', border: 'solid 2px #1a1a1a', borderRadius: 6,
    fontSize: '1.1em', fontWeight: 600, color: '#353538',
    transition: 'box-shadow .2s linear, border-color .25s ease-out', outline: 'none',
    lineHeight: '58px',
    fontFamily: "'Inter', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 8,
    fontSize: '0.95em', fontWeight: 700, color: '#1a1a1a',
    fontFamily: "'Inter', sans-serif",
  };

  // ── Role picker ──
  if (role === null) {
    return (
      <div style={{ background: '#ffffff', borderRadius: 16, padding: '2em' }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: '0.8rem', fontWeight: 600, color: '#888',
          textDecoration: 'none', marginBottom: '1.5em',
          fontFamily: "'Inter', sans-serif",
        }}
          onMouseEnter={e => (e.currentTarget.style.color = ORANGE)}
          onMouseLeave={e => (e.currentTarget.style.color = '#888')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </Link>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '0.5em', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
          Welcome Back
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#6B7280', textAlign: 'center', marginBottom: '1.5em', fontFamily: "'Inter', sans-serif" }}>
          How would you like to sign in?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Driver option */}
          <button
            onClick={() => setRole('driver')}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 20px', borderRadius: 14,
              border: '1.5px solid #E8E8EA', background: '#fff',
              cursor: 'pointer', textAlign: 'left',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.background = '#FEF3E8'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E8EA'; e.currentTarget.style.background = '#fff'; }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: '#FEF3E8',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                I&apos;m a Driver
              </p>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0', fontFamily: "'Inter', sans-serif" }}>
                Bike delivery partner
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <path d="M6 4l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Admin option */}
          <button
            onClick={() => setRole('admin')}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 20px', borderRadius: 14,
              border: '1.5px solid #E8E8EA', background: '#fff',
              cursor: 'pointer', textAlign: 'left',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A1A1A'; e.currentTarget.style.background = '#F9FAFB'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E8EA'; e.currentTarget.style.background = '#fff'; }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: '#F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                I&apos;m an Admin
              </p>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0', fontFamily: "'Inter', sans-serif" }}>
                SafeShift administrator
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <path d="M6 4l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '1.5em', color: '#666', fontFamily: "'Inter', sans-serif" }}>
          New driver?{' '}
          <Link href="/register" style={{ color: ORANGE, fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: 16, padding: '2em' }}>
      <button onClick={() => { setRole(null); setError(''); setEmail(''); setPassword(''); setLoginMethod('password'); resetOtpState(); }} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: '0.8rem', fontWeight: 600, color: '#888',
        background: 'none', border: 'none', cursor: 'pointer',
        marginBottom: '1em', padding: 0,
        fontFamily: "'Inter', sans-serif",
        transition: 'color 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = '#F07820')}
        onMouseLeave={e => (e.currentTarget.style.color = '#888')}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
          <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>
      <style>{`
        .ss-signin-btn {
          position: relative; overflow: hidden;
          background: #1a1a1a; color: #fff;
        }
        .ss-signin-btn::before {
          content: ''; position: absolute;
          bottom: 0; left: 0; width: 100%; height: 0;
          background: #F07820;
          transition: height 0.35s cubic-bezier(0.22,1,0.36,1);
          z-index: 0;
        }
        .ss-signin-btn:hover:not(:disabled)::before { height: 100%; }
        .ss-signin-btn > span { position: relative; z-index: 1; }
      `}</style>

      {/* ── Avatar ── */}
      <div ref={svgWrapRef} style={{ position:'relative', width:200, height:200, margin:'0 auto 1.25em', borderRadius:'50%', pointerEvents:'none' }}>
        <div style={{ position:'relative', width:'100%', height:0, overflow:'hidden', borderRadius:'50%', paddingBottom:'100%' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"
            style={{ position:'absolute', left:0, top:0, width:'100%', height:'100%' }}>
            <defs><clipPath id="armMask"><circle cx="100" cy="100" r="100"/></clipPath></defs>
            <circle cx="100" cy="100" r="100" fill="#FFE4C0"/>
            <g>
              <path ref={bodyBGChRef} fill="#FFFFFF" style={{ opacity: 0 }} d="M200,122h-35h-14.9V72c0-27.6-22.4-50-50-50s-50,22.4-50,50v50H35.8H0l0,91h200L200,122z"/>
              <path ref={bodyBGRef} stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="#FFFFFF"
                d="M200,158.5c0-20.2-14.8-36.5-35-36.5h-14.9V72.8c0-27.4-21.7-50.4-49.1-50.8c-28-0.5-50.9,22.1-50.9,50v50H35.8C16,122,0,138,0,157.8L0,213h200L200,158.5z"/>
              <path fill="#FFECD6" d="M100,156.4c-22.9,0-43,11.1-54.1,27.7c15.6,10,34.2,15.9,54.1,15.9s38.5-5.8,54.1-15.9C143,167.5,122.9,156.4,100,156.4z"/>
            </g>
            <g>
              <g ref={outerEarLRef} fill="#FFECD6" stroke={INK} strokeWidth="2.5">
                <circle cx="47" cy="83" r="11.5"/>
                <path d="M46.3 78.9c-2.3 0-4.1 1.9-4.1 4.1 0 2.3 1.9 4.1 4.1 4.1" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
              <g ref={earHairLRef}>
                <rect x="51" y="64" fill="#FFFFFF" width="15" height="35"/>
                <path d="M53.4 62.8C48.5 67.4 45 72.2 42.8 77c3.4-.1 6.8-.1 10.1.1-4 3.7-6.8 7.6-8.2 11.6 2.1 0 4.2 0 6.3.2-2.6 4.1-3.8 8.3-3.7 12.5 1.2-.7 3.4-1.4 5.2-1.9"
                  fill="#fff" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </g>
            <g>
              <g ref={outerEarRRef}>
                <circle fill="#FFECD6" stroke={INK} strokeWidth="2.5" cx="153" cy="83" r="11.5"/>
                <path fill="#FFECD6" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  d="M153.7,78.9c2.3,0,4.1,1.9,4.1,4.1c0,2.3-1.9,4.1-4.1,4.1"/>
              </g>
              <g ref={earHairRRef}>
                <rect x="134" y="64" fill="#FFFFFF" width="15" height="35"/>
                <path fill="#FFFFFF" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  d="M146.6,62.8c4.9,4.6,8.4,9.4,10.6,14.2c-3.4-0.1-6.8-0.1-10.1,0.1c4,3.7,6.8,7.6,8.2,11.6c-2.1,0-4.2,0-6.3,0.2c2.6,4.1,3.8,8.3,3.7,12.5c-1.2-0.7-3.4-1.4-5.2-1.9"/>
              </g>
            </g>
            <path ref={chinRef} d="M84.1 121.6c2.7 2.9 6.1 5.4 9.8 7.5l.9-4.5c2.9 2.5 6.3 4.8 10.2 6.5 0-1.9-.1-3.9-.2-5.8 3 1.2 6.2 2 9.7 2.5-.3-2.1-.7-4.1-1.2-6.1"
              fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path ref={faceRef} fill="#FFECD6" d="M134.5,46v35.5c0,21.815-15.446,39.5-34.5,39.5s-34.5-17.685-34.5-39.5V46"/>
            <path ref={hairRef} fill="#FFFFFF" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              d="M81.457,27.929c1.755-4.084,5.51-8.262,11.253-11.77c0.979,2.565,1.883,5.14,2.712,7.723c3.162-4.265,8.626-8.27,16.272-11.235c-0.737,3.293-1.588,6.573-2.554,9.837c4.857-2.116,11.049-3.64,18.428-4.156c-2.403,3.23-5.021,6.391-7.852,9.474"/>
            <g ref={eyebrowRef}>
              <path fill="#FFFFFF" d="M138.142,55.064c-4.93,1.259-9.874,2.118-14.787,2.599c-0.336,3.341-0.776,6.689-1.322,10.037c-4.569-1.465-8.909-3.222-12.996-5.226c-0.98,3.075-2.07,6.137-3.267,9.179c-5.514-3.067-10.559-6.545-15.097-10.329c-1.806,2.889-3.745,5.73-5.816,8.515c-7.916-4.124-15.053-9.114-21.296-14.738l1.107-11.768h73.475V55.064z"/>
              <path fill="#FFFFFF" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                d="M63.56,55.102c6.243,5.624,13.38,10.614,21.296,14.738c2.071-2.785,4.01-5.626,5.816-8.515c4.537,3.785,9.583,7.263,15.097,10.329c1.197-3.043,2.287-6.104,3.267-9.179c4.087,2.004,8.427,3.761,12.996,5.226c0.545-3.348,0.986-6.696,1.322-10.037c4.913-0.481,9.857-1.34,14.787-2.599"/>
            </g>
            <g ref={eyeLRef}>
              <circle cx="85.5" cy="78.5" r="3.5" fill="#7C3A0A"/>
              <circle cx="84"   cy="76"   r="1"   fill="#fff"/>
            </g>
            <g ref={eyeRRef}>
              <circle cx="114.5" cy="78.5" r="3.5" fill="#7C3A0A"/>
              <circle cx="113"   cy="76"   r="1"   fill="#fff"/>
            </g>
            <g ref={mouthRef}>
              <path ref={mouthBGRef} fill="#C4622A"
                d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z"/>
              <path ref={mouthMedBGRef} fill="#C4622A" style={{ opacity: 0 }}
                d="M95,104.2c-4.5,0-8.2-3.7-8.2-8.2v-2c0-1.2,1-2.2,2.2-2.2h22c1.2,0,2.2,1,2.2,2.2v2c0,4.5-3.7,8.2-8.2,8.2H95z"/>
              <path ref={mouthLgBGRef} fill="#C4622A" stroke={INK} strokeLinejoin="round" strokeWidth="2.5" style={{ opacity: 0 }}
                d="M100 110.2c-9 0-16.2-7.3-16.2-16.2 0-2.3 1.9-4.2 4.2-4.2h24c2.3 0 4.2 1.9 4.2 4.2 0 9-7.2 16.2-16.2 16.2z"/>

              <path fill="#FFFFFF" d="M106,97h-4c-1.1,0-2-0.9-2-2v-2h8v2C108,96.1,107.1,97,106,97z"/>
              <path ref={mouthOutRef} fill="none" stroke={INK} strokeWidth="2.5" strokeLinejoin="round"
                d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z"/>
            </g>
            <path ref={noseRef} d="M97.7 79.9h4.7c1.9 0 3 2.2 1.9 3.7l-2.3 3.3c-.9 1.3-2.9 1.3-3.8 0l-2.3-3.3c-1.3-1.6-.2-3.7 1.8-3.7z" fill="#7C3A0A"/>
            <g clipPath="url(#armMask)">
              <g ref={armLRef} style={{ visibility: 'hidden' }}>
                <polygon fill="#FFECD6" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  points="121.3,98.4 111,59.7 149.8,49.3 169.8,85.4"/>
                <path fill="#FFECD6" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  d="M134.4,53.5l19.3-5.2c2.7-0.7,5.4,0.9,6.1,3.5v0c0.7,2.7-0.9,5.4-3.5,6.1l-10.3,2.8"/>
                <path fill="#FFECD6" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  d="M150.9,59.4l26-7c2.7-0.7,5.4,0.9,6.1,3.5v0c0.7,2.7-0.9,5.4-3.5,6.1l-21.3,5.7"/>
                <g ref={twoFingersRef}>
                  <path fill="#FFECD6" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    d="M158.3,67.8l23.1-6.2c2.7-0.7,5.4,0.9,6.1,3.5v0c0.7,2.7-0.9,5.4-3.5,6.1l-23.1,6.2"/>
                  <path fill="#FFD4A0" d="M180.1,65l2.2-0.6c1.1-0.3,2.2,0.3,2.4,1.4v0c0.3,1.1-0.3,2.2-1.4,2.4l-2.2,0.6L180.1,65z"/>
                  <path fill="#FFECD6" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    d="M160.8,77.5l19.4-5.2c2.7-0.7,5.4,0.9,6.1,3.5v0c0.7,2.7-0.9,5.4-3.5,6.1l-18.3,4.9"/>
                  <path fill="#FFD4A0" d="M178.8,75.7l2.2-0.6c1.1-0.3,2.2,0.3,2.4,1.4v0c0.3,1.1-0.3,2.2-1.4,2.4l-2.2,0.6L178.8,75.7z"/>
                </g>
                <path fill="#FFD4A0" d="M175.5,55.9l2.2-0.6c1.1-0.3,2.2,0.3,2.4,1.4v0c0.3,1.1-0.3,2.2-1.4,2.4l-2.2,0.6L175.5,55.9z"/>
                <path fill="#FFD4A0" d="M152.1,50.4l2.2-0.6c1.1-0.3,2.2,0.3,2.4,1.4v0c0.3,1.1-0.3,2.2-1.4,2.4l-2.2,0.6L152.1,50.4z"/>
                <path fill="#FFFFFF" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  d="M123.5,97.8c-41.4,14.9-84.1,30.7-108.2,35.5L1.2,81c33.5-9.9,71.9-16.5,111.9-21.8"/>
                <path fill="#FFFFFF" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  d="M108.5,60.4c7.7-5.3,14.3-8.4,22.8-13.2c-2.4,5.3-4.7,10.3-6.7,15.1c4.3,0.3,8.4,0.7,12.3,1.3c-4.2,5-8.1,9.6-11.5,13.9c3.1,1.1,6,2.4,8.7,3.8c-1.4,2.9-2.7,5.8-3.9,8.5c2.5,3.5,4.6,7.2,6.3,11c-4.9-0.8-9-0.7-16.2-2.7"/>
                <path fill="#FFFFFF" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  d="M94.5,103.8c-0.6,4-3.8,8.9-9.4,14.7c-2.6-1.8-5-3.7-7.2-5.7c-2.5,4.1-6.6,8.8-12.2,14c-1.9-2.2-3.4-4.5-4.5-6.9c-4.4,3.3-9.5,6.9-15.4,10.8c-0.2-3.4,0.1-7.1,1.1-10.9"/>
                <path fill="#FFFFFF" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  d="M97.5,63.9c-1.7-2.4-5.9-4.1-12.4-5.2c-0.9,2.2-1.8,4.3-2.5,6.5c-3.8-1.8-9.4-3.1-17-3.8c0.5,2.3,1.2,4.5,1.9,6.8c-5-0.6-11.2-0.9-18.4-1c2,2.9,0.9,3.5,3.9,6.2"/>
              </g>
              <g ref={armRRef} style={{ visibility: 'hidden' }}>
                <path fill="#FFECD6" stroke={INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                  d="M265.4 97.3l10.4-38.6-38.9-10.5-20 36.1z"/>
                <path fill="#FFECD6" stroke={INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                  d="M252.4 52.4L233 47.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l10.3 2.8M226 76.4l-19.4-5.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l18.3 4.9M228.4 66.7l-23.1-6.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l23.1 6.2M235.8 58.3l-26-7c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l21.3 5.7"/>
                <path fill="#FFD4A0"
                  d="M207.9 74.7l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM206.7 64l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM211.2 54.8l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM234.6 49.4l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8z"/>
                <path fill="#fff" stroke={INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                  d="M263.3 96.7c41.4 14.9 84.1 30.7 108.2 35.5l14-52.3C352 70 313.6 63.5 273.6 58.1"/>
                <path fill="#fff" stroke={INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                  d="M278.2 59.3l-18.6-10 2.5 11.9-10.7 6.5 9.9 8.7-13.9 6.4 9.1 5.9-13.2 9.2 23.1-.9M284.5 100.1c-.4 4 1.8 8.9 6.7 14.8 3.5-1.8 6.7-3.6 9.7-5.5 1.8 4.2 5.1 8.9 10.1 14.1 2.7-2.1 5.1-4.4 7.1-6.8 4.1 3.4 9 7 14.7 11 1.2-3.4 1.8-7 1.7-10.9M314 66.7s5.4-5.7 12.6-7.4c1.7 2.9 3.3 5.7 4.9 8.6 3.8-2.5 9.8-4.4 18.2-5.7.1 3.1.1 6.1 0 9.2 5.5-1 12.5-1.6 20.8-1.9-1.4 3.9-2.5 8.4-2.5 8.4"/>
              </g>
            </g>
          </svg>
        </div>
        {/* border ring */}
        <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', boxSizing:'border-box', border:`solid 2.5px ${ORANGE}`, borderRadius:'50%', zIndex:10 }}/>
      </div>

      {/* ── Form ── */}
      <h2 style={{ fontSize:'1.25rem', fontWeight:700, color:'#1a1a1a', marginBottom:'0.75em', textAlign:'center', fontFamily:"'Inter',sans-serif" }}>
        {isAdminLogin ? 'Admin Login' : 'Sign In'}
      </h2>

      {/* Login method toggle — Driver only */}
      {!isAdminLogin && (
        <div style={{ display:'flex', gap:0, marginBottom:'1.25em', borderRadius:8, overflow:'hidden', border:'2px solid #1a1a1a' }}>
          <button type="button" onClick={() => { setLoginMethod('password'); resetOtpState(); setError(''); }}
            style={{
              flex:1, padding:'10px 0', fontSize:'0.85em', fontWeight:700, border:'none', cursor:'pointer',
              background: loginMethod === 'password' ? '#1a1a1a' : '#f9f9f9',
              color: loginMethod === 'password' ? '#fff' : '#1a1a1a',
              fontFamily:"'Inter',sans-serif", transition:'all 0.2s',
            }}>
            Password
          </button>
          <button type="button" onClick={() => { setLoginMethod('otp'); setError(''); }}
            style={{
              flex:1, padding:'10px 0', fontSize:'0.85em', fontWeight:700, border:'none', cursor:'pointer',
              borderLeft:'2px solid #1a1a1a',
              background: loginMethod === 'otp' ? '#1a1a1a' : '#f9f9f9',
              color: loginMethod === 'otp' ? '#fff' : '#1a1a1a',
              fontFamily:"'Inter',sans-serif", transition:'all 0.2s',
            }}>
            Login via OTP
          </button>
        </div>
      )}

      {/* ── PASSWORD LOGIN FORM ── */}
      {(loginMethod === 'password' || isAdminLogin) && (
        <>
          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'1.25em' }}>
            <div>
              <label style={labelStyle}>Username</label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                maxLength={254}
                onChange={handleEmailChange}
                onFocus={handleEmailFocus}
                onBlur={handleEmailBlur}
                placeholder={isAdminLogin ? 'username@safeshift.app' : 'mobile@safeshift.app'}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <label style={{ ...labelStyle, marginBottom:0 }}>Password</label>
                <label
                  style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:'0.85em', fontWeight:600, color:'#1a1a1a', fontFamily:"'Inter',sans-serif", userSelect:'none' }}
                  onFocus={handleToggleFocus}
                  onBlur={handleToggleBlur}
                  onMouseDown={() => { showPassClicked.current = true; }}
                  onMouseUp={() => { showPassClicked.current = false; }}
                >
                  <input
                    type="checkbox"
                    checked={showPass}
                    onChange={e => handleToggleChange(e.target.checked)}
                    onFocus={handleToggleFocus}
                    onBlur={handleToggleBlur}
                    style={{ width: 15, height: 15, accentColor: ORANGE, cursor: 'pointer' }}
                  />
                  Show password
                </label>
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </div>
            {error && <p style={{ fontSize:'0.875rem', color:'#e53e3e' }}>{error}</p>}
            <button type="submit" disabled={loading} className="ss-signin-btn"
              style={{
                height:58, width:'100%', borderRadius:6, border:'none', color:'#fff',
                fontSize:'1.1em', fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily:"'Inter',sans-serif", opacity: loading ? 0.6 : 1,
              }}>
              <span>{loading ? 'Signing in…' : isAdminLogin ? 'Admin Login' : 'Sign In'}</span>
            </button>
          </form>
        </>
      )}

      {/* ── OTP LOGIN FORM ── */}
      {loginMethod === 'otp' && !isAdminLogin && (
        <div style={{ position:'relative' }}>
          <style>{`
            @keyframes login-otp-pop { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
            .login-otp-fill { animation: login-otp-pop 0.25s ease both; }
            @keyframes login-sms-drop { 0%{transform:translateY(-100%);opacity:0} 100%{transform:translateY(0);opacity:1} }
            @keyframes login-spin { to { transform: rotate(360deg); } }
          `}</style>

          {/* SMS notification banner — fixed to top of viewport */}
          {showOtpSms && (
            <div style={{
              position:'fixed', top:16, left:16, right:16, zIndex:999,
              maxWidth:416, margin:'0 auto',
              background:'#1a1a1a', borderRadius:16,
              boxShadow:'0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
              padding:'14px 16px',
              animation:'login-sms-drop 0.35s ease both',
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                <div style={{
                  width:32, height:32, borderRadius:8, background:'#F07820',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#F07820', margin:'0 0 2px', fontFamily:"'Inter',sans-serif" }}>SafeShift</p>
                  <p style={{ fontSize:12, color:'#d1d5db', margin:0, lineHeight:1.4, fontFamily:"'Inter',sans-serif" }}>{otpSmsText}</p>
                </div>
                <span style={{ fontSize:10, color:'#6b7280', flexShrink:0, marginTop:2, fontFamily:"'Inter',sans-serif" }}>now</span>
              </div>
            </div>
          )}

          {/* Phone input step */}
          {otpStep === 'phone' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1.25em' }}>
              <div>
                <label style={labelStyle}>Mobile Number</label>
                <div style={{ position:'relative' }}>
                  <span style={{
                    position:'absolute', left:'1em', top:'50%', transform:'translateY(-50%)',
                    fontSize:'1.1em', fontWeight:600, color:'#888', fontFamily:"'Inter',sans-serif",
                  }}>+91</span>
                  <input
                    type="tel"
                    value={otpPhone}
                    onChange={e => { setOtpPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                    placeholder="9876543210"
                    maxLength={10}
                    style={{ ...inputStyle, paddingLeft:'3.5em' }}
                  />
                </div>
              </div>
              {error && <p style={{ fontSize:'0.875rem', color:'#e53e3e' }}>{error}</p>}
              <button type="button" onClick={handleSendOtp} className="ss-signin-btn"
                style={{
                  height:58, width:'100%', borderRadius:6, border:'none', color:'#fff',
                  fontSize:'1.1em', fontWeight:700, cursor:'pointer', fontFamily:"'Inter',sans-serif",
                }}>
                <span>Send OTP</span>
              </button>
            </div>
          )}

          {/* Sending state */}
          {otpStep === 'sending' && (
            <div style={{ textAlign:'center', padding:'2em 0' }}>
              <div style={{ width:32, height:32, border:'3px solid #e5e7eb', borderTopColor:ORANGE, borderRadius:'50%', animation:'login-spin 0.8s linear infinite', margin:'0 auto 12px' }} />
              <p style={{ fontSize:'0.95em', fontWeight:600, color:'#1a1a1a', fontFamily:"'Inter',sans-serif" }}>Sending OTP...</p>
            </div>
          )}

          {/* OTP boxes */}
          {(otpStep === 'otp' || otpStep === 'autofilling' || otpStep === 'verifying') && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1.25em', marginTop: 0 }}>
              <p style={{ fontSize:'0.9em', color:'#6B7280', textAlign:'center', fontFamily:"'Inter',sans-serif" }}>
                OTP sent to +91 {otpPhone.slice(0, 2)}XXXXXX{otpPhone.slice(-2)}
              </p>
              <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
                {otpDigits.map((d, i) => (
                  <div key={i} style={{
                    width:44, height:52, borderRadius:8,
                    border: d ? `2px solid ${ORANGE}` : '2px solid #d1d5db',
                    background: d ? '#FEF3E8' : '#f9f9f9',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'1.4em', fontWeight:700, color:'#1a1a1a',
                    fontFamily:"'Inter',sans-serif",
                    transition:'border-color 0.2s, background 0.2s',
                  }}>
                    {d && <span className="login-otp-fill">{d}</span>}
                  </div>
                ))}
              </div>
              {otpStep === 'verifying' && (
                <div style={{ textAlign:'center' }}>
                  <div style={{ width:24, height:24, border:'3px solid #e5e7eb', borderTopColor:ORANGE, borderRadius:'50%', animation:'login-spin 0.8s linear infinite', margin:'0 auto 8px' }} />
                  <p style={{ fontSize:'0.85em', color:'#6B7280', fontFamily:"'Inter',sans-serif" }}>Verifying...</p>
                </div>
              )}
              {error && <p style={{ fontSize:'0.875rem', color:'#e53e3e', textAlign:'center' }}>{error}</p>}
            </div>
          )}

          {/* Signing in state */}
          {otpStep === 'signing-in' && (
            <div style={{ textAlign:'center', padding:'2em 0', marginTop: 0 }}>
              <div style={{ width:32, height:32, border:'3px solid #e5e7eb', borderTopColor:ORANGE, borderRadius:'50%', animation:'login-spin 0.8s linear infinite', margin:'0 auto 12px' }} />
              <p style={{ fontSize:'0.95em', fontWeight:600, color:'#1a1a1a', fontFamily:"'Inter',sans-serif" }}>Signing you in...</p>
            </div>
          )}

          {/* Retry link */}
          {(otpStep === 'otp' || otpStep === 'autofilling') && (
            <p style={{ textAlign:'center', fontSize:'0.8em', marginTop:'0.75em', color:'#9CA3AF', fontFamily:"'Inter',sans-serif" }}>
              Didn&apos;t receive?{' '}
              <button type="button" onClick={() => { resetOtpState(); }} style={{
                background:'none', border:'none', color:ORANGE, fontWeight:600, cursor:'pointer', padding:0, fontSize:'inherit', fontFamily:'inherit',
              }}>Resend OTP</button>
            </p>
          )}
        </div>
      )}

      <p style={{ textAlign:'center', fontSize:'0.875rem', marginTop:'1em', color:'#666', fontFamily:"'Inter',sans-serif" }}>
        Don&apos;t have an account?{' '}
        <Link href="/register" style={{ color: ORANGE, fontWeight:600 }}>Register</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
