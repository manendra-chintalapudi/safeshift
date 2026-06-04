'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  motion, useInView, useScroll, useTransform, AnimatePresence,
  type MotionValue,
} from 'framer-motion';
import {
  CloudRain, Wind, Factory, Ban, Wifi,
  CheckCircle2, Shield, Zap, Clock,
  Truck, Info, TrendingUp, ArrowRight,
  Menu, X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  blue:       '#1A40C0',
  blueDark:   '#1535A8',
  blueLight:  '#EEF2FF',
  orange:     '#F07820',
  orangeLight:'#FEF3E8',
  peach:      '#FBE8CC',
  peachLight: '#FEF7EC',
  dark:       '#0f172a',
  ink:        '#111827',
  gray:       '#6b7280',
  grayLight:  '#9ca3af',
  border:     '#E5E7EB',
  white:      '#FFFFFF',
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────


const HOW_STEPS = [
  {
    n: '01', Icon: Clock,
    title: 'Quick Setup',
    body: 'Aadhaar + DL + RC. Link your UPI. Done in under 5 minutes.',
    badge: '5 min',
  },
  {
    n: '02', Icon: Shield,
    title: 'We Watch for You',
    body: 'Weather, AQI, city news — your delivery zone monitored 24/7.',
    badge: 'Always on',
  },
  {
    n: '03', Icon: CheckCircle2,
    title: 'Auto Verified',
    body: 'We confirm the disruption happened and that you were actively working.',
    badge: 'Automatic',
  },
  {
    n: '04', Icon: Zap,
    title: 'Instant Pay',
    body: 'Both checks pass → money hits your SafeShift wallet.',
    badge: '< 10 min',
  },
];

const COVERAGE = [
  { key: 'rainfall', Icon: CloudRain, color: '#1A40C0', bg: C.blueLight,  title: 'Heavy Rainfall',      scenario: 'Roads flood. Deliveries stop.',            payout: 'Up to ₹2,000' },
  { key: 'aqi',      Icon: Factory,   color: '#b45309', bg: '#fffbeb',     title: 'Air Pollution Ban',   scenario: 'Delhi orders LCV ban from the roads.',    payout: 'Up to ₹2,000' },
  { key: 'cyclone',  Icon: Wind,      color: '#7c3aed', bg: '#f5f3ff',     title: 'Cyclone / High Winds',scenario: 'Dangerous wind conditions. Unsafe to drive.',payout: 'Up to ₹2,400' },
  { key: 'outage',   Icon: Wifi,      color: C.blue,    bg: C.blueLight,   title: 'App Outage',          scenario: 'Porter platform down for hours.',           payout: 'Up to ₹1,000' },
  { key: 'curfew',   Icon: Ban,       color: '#dc2626', bg: '#fef2f2',     title: 'Curfew / Bandh',      scenario: 'City shutdown. You cannot move.',           payout: 'Up to ₹1,800' },
];

const TIMELINE = [
  { time: '2:47 PM', event: 'Heavy rain detected in your zone',           Icon: CloudRain,    detail: '68mm recorded — roads unsafe for LCVs', color: C.blue,    done: true  },
  { time: '2:48 PM', event: 'Conditions verified across multiple sources', Icon: Shield,       detail: 'IMD + OpenWeatherMap both confirm',      color: C.blue,    done: true  },
  { time: '2:49 PM', event: 'Your Porter activity confirmed',              Icon: Truck,        detail: 'App active 47 min · GPS in zone',        color: C.blue,    done: true  },
  { time: '2:57 PM', event: '₹1,500 sent to your UPI',                    Icon: Zap,          detail: 'Transfer complete · ref #SS-0041',       color: '#059669', done: true, highlight: true },
];

const PLANS = [
  {
    name: 'Normal', tagline: 'Part-time drivers', slug: 'normal',
    price: 80, maxPayout: '₹2,000', popular: false,
    features: ['All 5 disruption types', 'GigPoints rewards', 'Basic forecast alerts'],
  },
  {
    name: 'Medium', tagline: 'Regular drivers', slug: 'medium',
    price: 120, maxPayout: '₹3,000', popular: true,
    features: ['All 5 disruption types', 'GigPoints 1.5× rewards', 'Premium forecast alerts', 'Smart reminders'],
  },
  {
    name: 'High', tagline: 'Full-time drivers', slug: 'high',
    price: 160, maxPayout: '₹4,000', popular: false,
    features: ['All 5 disruption types', 'GigPoints 2× rewards', 'Premium forecast alerts', 'Smart reminders', 'Dedicated support'],
  },
];

const FAQS = [
  { q: 'How does SafeShift know when to pay me?', a: "SafeShift monitors weather, air quality, news, and the Porter app status for your city 24/7. When a disruption is detected and we confirm you were actively working, your payout fires automatically." },
  { q: 'Do I need to file a claim?', a: 'No. Everything is automatic. When both our checks pass — disruption confirmed and your activity confirmed — the money goes directly to your linked UPI ID.' },
  { q: 'How fast is the payout?', a: 'Under 10 minutes from detection to your UPI. Most payouts complete in under 5 minutes.' },
  { q: 'Which cities are covered?', a: 'Delhi-NCR, Mumbai, Bangalore, Chennai, Pune, Hyderabad, Kolkata, Ahmedabad, Jaipur, and Lucknow.' },
  { q: 'Can I cancel anytime?', a: "Yes. SafeShift is weekly. Simply don't renew and your coverage ends that week. No lock-in. No cancellation fees." },
  { q: 'Is there a waiting period?', a: 'One week. Coverage begins from Week 2 after your first payment.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className = '', style = {} }: {
  children: React.ReactNode; delay?: number;
  className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-56px' });
  return (
    <motion.div ref={ref} className={className} style={style}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
    >{children}</motion.div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

type WeatherItem = {
  city: string; temp: number; condition: string;
  emoji: string; wind: number; rain: number;
};

function WordFill({ word, progress, start, end }: {
  word: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const color = useTransform(progress, [start, end], ['rgba(30,58,95,0.18)', '#1E3A5F']);
  return <motion.span style={{ color, display:'inline' }}>{word}</motion.span>;
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const deferredPrompt = useRef<Event | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('normal');
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [tickerWeather, setTickerWeather] = useState<WeatherItem[]>([
    { city:'Delhi',     temp:35, condition:'Clear',        emoji:'☀️',  wind:12, rain:0   },
    { city:'Mumbai',    temp:29, condition:'Partly Cloudy',emoji:'⛅',  wind:15, rain:0   },
    { city:'Bengaluru', temp:26, condition:'Partly Cloudy',emoji:'⛅',  wind:8,  rain:0   },
    { city:'Chennai',   temp:33, condition:'Humid',        emoji:'🌤️', wind:11, rain:0   },
    { city:'Pune',      temp:31, condition:'Clear',        emoji:'☀️',  wind:14, rain:0   },
    { city:'Hyderabad', temp:34, condition:'Clear',        emoji:'☀️',  wind:10, rain:0   },
    { city:'Kolkata',   temp:32, condition:'Cloudy',       emoji:'☁️',  wind:9,  rain:0   },
    { city:'Ahmedabad', temp:38, condition:'Clear',        emoji:'☀️',  wind:17, rain:0   },
    { city:'Jaipur',    temp:37, condition:'Clear',        emoji:'☀️',  wind:13, rain:0   },
    { city:'Lucknow',   temp:36, condition:'Clear',        emoji:'☀️',  wind:10, rain:0   },
  ]);

  const timelineRef  = useRef<HTMLDivElement>(null);
  const timelineInView = useInView(timelineRef, { once: true, margin: '-80px' });
  const [timelineCount, setTimelineCount] = useState(0);

  const coverageSectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress: coverageProgress } = useScroll({
    target: coverageSectionRef,
    offset: ['start end', 'end start'],
  });
  const coverageRotation = useTransform(coverageProgress, [0.15, 0.7], [0, 72]);
  const coverageCounterRotation = useTransform(coverageProgress, [0.15, 0.7], [0, -72]);

  const testimonialRef = useRef<HTMLElement>(null);
  const { scrollYProgress: testimonialProgress } = useScroll({
    target: testimonialRef,
    offset: ['start 80%', 'center center'],
  });

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    fetch('/api/weather-ticker')
      .then(r => r.json())
      .then(d => { if (d.weather?.length) setTickerWeather(d.weather); })
      .catch(err => console.warn('[WeatherTicker] fetch failed:', err));

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // PWA install prompt
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);
    if (isStandalone) return;

    setCanInstall(true); // Show button for manual install instructions
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Timeline sequential reveal
  useEffect(() => {
    if (!timelineInView) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    [0, 650, 1300, 1950].forEach((delay, i) => {
      timers.push(setTimeout(() => setTimelineCount(i + 1), delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [timelineInView]);

  // GSAP stat counters
  useEffect(() => {
    if (!mounted) return;
    let kills: (() => void)[] = [];
    (async () => {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      document.querySelectorAll<HTMLElement>('.ss-counter').forEach(el => {
        const target = parseFloat(el.dataset.target ?? '0');
        const pre = el.dataset.pre ?? '';
        const suf = el.dataset.suf ?? '';
        const st = ScrollTrigger.create({
          trigger: el, start: 'top 88%', once: true,
          onEnter: () => {
            const obj = { val: 0 };
            gsap.to(obj, {
              val: target, duration: 1.8, ease: 'power2.out',
              onUpdate() { el.textContent = pre + Math.round(obj.val) + suf; },
            });
          },
        });
        kills.push(() => st.kill());
      });
    })();
    return () => kills.forEach(f => f());
  }, [mounted]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html { scroll-behavior: auto; }

        @keyframes ss-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(26,64,192,0.3); }
          50%      { box-shadow: 0 0 0 8px rgba(26,64,192,0); }
        }
        @keyframes ss-bounce {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(7px); }
        }
        @keyframes ss-rec-core {
          0%,100% { opacity:1; }
          50%      { opacity:0.25; }
        }
        @keyframes ss-rec-ring {
          0%   { transform:scale(1);   opacity:0.7; }
          100% { transform:scale(2.8); opacity:0;   }
        }
        .ss-rec-core { animation: ss-rec-core 1s ease-in-out infinite; }
        .ss-rec-ring { animation: ss-rec-ring 1.2s ease-out infinite; }

        .ss-plan-popular { animation: ss-glow 2.6s ease-in-out infinite; }

        .ss-nav-link {
          font-size:14px; font-weight:500; color:#6b7280;
          text-decoration:none; transition:color 0.18s;
          font-family: var(--font-inter),Inter,sans-serif;
        }
        .ss-nav-link:hover { color:#F07820; }

        .ss-cta-primary {
          display:inline-flex; align-items:center; gap:8px;
          padding:13px 26px; background:#F07820; color:#fff;
          font-size:15px; font-weight:700; border-radius:8px;
          text-decoration:none; cursor:pointer; border:none;
          font-family:var(--font-inter),Inter,sans-serif;
          position:relative; overflow:hidden; z-index:0;
          transition:transform 0.2s, box-shadow 0.2s;
        }
        .ss-cta-primary::before {
          content:''; position:absolute;
          bottom:0; left:0; width:100%; height:0%;
          background:#111827;
          transition:height 0.32s ease;
          z-index:-1;
        }
        .ss-cta-primary:hover::before { height:100%; }
        .ss-cta-primary:hover {
          transform:translateY(-2px);
          box-shadow:0 8px 24px rgba(0,0,0,0.22);
        }

        .ss-cta-outline {
          display:inline-flex; align-items:center; gap:8px;
          padding:13px 22px; background:transparent;
          color:#111827; border:1.5px solid rgba(0,0,0,0.22);
          font-size:15px; font-weight:500; border-radius:8px;
          text-decoration:none; cursor:pointer;
          transition:border-color 0.2s, color 0.2s, background 0.2s;
          font-family:var(--font-inter),Inter,sans-serif;
        }
        .ss-cta-outline:hover {
          border-color:#F07820; color:#F07820; background:rgba(240,120,32,0.07);
        }

        .ss-coverage-card { transition:border-color 0.22s, box-shadow 0.22s; }
        .ss-coverage-card:hover { border-color:#1A40C0 !important; box-shadow:0 8px 28px rgba(26,64,192,0.1); }
        .ss-coverage-icon { transition:transform 0.24s; }
        .ss-coverage-card:hover .ss-coverage-icon { transform:scale(1.12) rotate(-3deg); }

        .ss-btn-call {
          display:inline-flex; align-items:center; gap:6px;
          padding:9px 14px; background:transparent; color:#111827;
          font-size:14px; font-weight:500; border-radius:8px;
          text-decoration:none; cursor:pointer; border:none;
          font-family:var(--font-inter),Inter,sans-serif;
          transition:color 0.2s, background 0.2s;
        }
        .ss-btn-call:hover { color:#F07820; background:rgba(240,120,32,0.07); }
        .ss-btn-call svg { transition:stroke 0.2s; }
        .ss-btn-call:hover svg { stroke:#F07820; }
        .ss-btn-call-text { display:inline; }
        @media (max-width:768px) {
          .ss-btn-call-text { display:none !important; }
          .ss-btn-call { padding:9px 10px; }
        }

        .ss-btn-signin {
          display:inline-flex; align-items:center;
          padding:9px 18px; background:#F3F4F6; color:#111827;
          font-size:14px; font-weight:500; border-radius:8px;
          text-decoration:none; cursor:pointer;
          font-family:var(--font-inter),Inter,sans-serif;
          position:relative; overflow:hidden; z-index:0;
          transition:color 0.3s;
        }
        .ss-btn-signin::before {
          content:''; position:absolute;
          bottom:0; left:0; width:100%; height:0%;
          background:#111827;
          transition:height 0.3s ease;
          z-index:-1;
        }
        .ss-btn-signin:hover::before { height:100%; }
        .ss-btn-signin:hover { color:#ffffff; }

        .ss-btn-install {
          display:inline-flex; align-items:center;
          padding:9px 18px; background:#111827; color:#ffffff;
          font-size:14px; font-weight:600; border-radius:8px;
          border:none; cursor:pointer;
          font-family:var(--font-inter),Inter,sans-serif;
          position:relative; overflow:hidden; z-index:0;
          transition:color 0.3s;
        }
        .ss-btn-install::before {
          content:''; position:absolute;
          bottom:0; left:0; width:100%; height:0%;
          background:#F07820;
          transition:height 0.35s cubic-bezier(0.22,1,0.36,1);
          z-index:-1;
        }
        .ss-btn-install:hover::before { height:100%; }

        .ss-btn-admin {
          display:inline-flex; align-items:center;
          padding:9px 20px; background:#111827; color:#fff;
          font-size:14px; font-weight:700; border-radius:8px;
          text-decoration:none; cursor:pointer;
          font-family:var(--font-inter),Inter,sans-serif;
          position:relative; overflow:hidden; z-index:0;
          transition:transform 0.2s, box-shadow 0.2s;
        }
        .ss-btn-admin::before {
          content:''; position:absolute;
          bottom:0; left:0; width:100%; height:0%;
          background:#F07820;
          transition:height 0.3s ease;
          z-index:-1;
        }
        .ss-btn-admin:hover::before { height:100%; }
        .ss-btn-admin:hover { box-shadow:0 6px 20px rgba(240,120,32,0.35); }

        .ss-plan-card { transition:transform 0.26s, box-shadow 0.26s; }
        .ss-plan-card:hover { transform:translateY(-6px); box-shadow:0 20px 48px rgba(0,0,0,0.1); }

        .ss-choose-plan {
          position:relative; overflow:hidden; z-index:0;
          color:#1a3264; transition:color 0.32s;
        }
        .ss-choose-plan::before {
          content:''; position:absolute;
          bottom:0; left:0; width:100%; height:0%;
          background:#F07820;
          transition:height 0.36s cubic-bezier(0.22,1,0.36,1);
          z-index:-1;
        }
        .ss-choose-plan:hover::before { height:100%; }
        .ss-choose-plan:hover { color:#FFFFFF; }

        .ss-watch-link { position:relative; padding-bottom:2px; }
        .ss-watch-link::after {
          content:''; position:absolute;
          bottom:0; left:0;
          width:0%; height:2px;
          background:#F07820;
          transition:width 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .ss-watch-link:hover::after { width:100%; }

        .ss-view-articles {
          position:relative; overflow:hidden; z-index:0;
          transition:color 0.32s;
        }
        .ss-view-articles::before {
          content:''; position:absolute;
          bottom:0; left:0; width:100%; height:0%;
          background:#F07820;
          transition:height 0.36s cubic-bezier(0.22,1,0.36,1);
          z-index:-1;
        }
        .ss-view-articles:hover::before { height:100%; }

        /* ── Global touch optimisations ── */
        * { -webkit-tap-highlight-color: transparent; }
        input, button, a, select, textarea { touch-action: manipulation; }

        /* ── TABLET  ≤ 1024px ── */
        @media (max-width:1024px) {
          .ss-testimonial { min-height:auto !important; }
          .ss-testimonial-img { flex:0 0 50% !important; }
          .ss-testimonial-text { margin-left:0 !important; padding:32px 24px !important; }
        }

        /* ── TABLET / MOBILE  ≤ 768px ── */
        @media (max-width:768px) {
          /* Navbar */
          .ss-desktop-links { display:none !important; }
          .ss-mobile-menu-btn { display:flex !important; }

          /* Hero */
          .ss-hero-section { grid-template-columns:1fr !important; }
          .ss-hero-left { padding:28px 20px 36px !important; }
          .ss-hero-right { order:-1; min-height:240px !important; }
          .ss-hero-img { transform:none !important; }

          /* About-us sub-grid inside hero */
          .ss-about-grid { grid-template-columns:1fr !important; gap:24px !important; }
          .ss-about-vline { display:none !important; }
          .ss-about-stats-col { flex-direction:row !important; flex-wrap:wrap !important; padding-top:8px !important; border-top:1px solid #D0D0D0; }
          .ss-about-stat-item { flex:1 1 50% !important; border-bottom:none !important; border-right:1px solid #D0D0D0 !important; padding:12px 8px !important; min-width:0; }

          /* How It Works */
          .ss-how-section { padding:56px 20px !important; }
          .ss-how-grid { grid-template-columns:1fr !important; gap:36px !important; }
          .ss-steps-grid { grid-template-columns:repeat(2,1fr) !important; width:100% !important; }

          /* Coverage */
          .ss-coverage-section { min-height:auto !important; padding:56px 20px 48px !important; display:flex !important; flex-direction:column !important; align-items:center !important; }
          .ss-coverage-heading { position:static !important; transform:none !important; width:100% !important; max-width:100% !important; margin-bottom:32px !important; }
          .ss-coverage-orbit { display:none !important; }
          .ss-coverage-mobile { display:grid !important; }

          /* Testimonial */
          .ss-testimonial { flex-direction:column !important; min-height:auto !important; margin-top:40px !important; }
          .ss-testimonial-img { display:none !important; }
          .ss-testimonial-text { margin-left:0 !important; padding:8px 24px 0px !important; background:transparent !important; }
          .ss-testimonial-mobile-text { display:block !important; }

          /* Learn */
          .ss-learn-section { padding:56px 20px !important; }
          .ss-learn-grid { grid-template-columns:1fr !important; gap:40px !important; }
          .ss-article-img { height:220px !important; }

          /* Plans */
          .ss-plans-section { padding:48px 20px !important; }
          .ss-plans-layout { flex-direction:column !important; }

          /* FAQ */
          .ss-faq-section { padding:56px 20px !important; }

          /* Footer inner */
          .ss-footer-inner { padding:14px 16px !important; }
          .ss-footer-row { gap:8px 16px !important; }
          .ss-footer-row .ss-footer-sep { display:none !important; }
        }

        /* ── Hero headline / about divider overflow fixes ── */
        @media (max-width:768px) {
          .ss-hero-headline-nowrap { white-space:normal !important; }
          .ss-about-divider { width:100% !important; }
          .ss-step-card { aspect-ratio:auto !important; min-height:0 !important; }
        }

        /* ── SMALL MOBILE  ≤ 480px ── */
        @media (max-width:480px) {
          .ss-steps-grid { grid-template-columns:1fr !important; }
          .ss-coverage-mobile { grid-template-columns:1fr !important; }
          .ss-about-stat-item { flex:1 1 100% !important; border-right:none !important; border-bottom:1px solid #D0D0D0 !important; }
        }

        /* ── Weather ticker ── */
        @keyframes ss-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ss-ticker-track {
          display: flex;
          animation: ss-ticker 40s linear infinite;
          width: max-content;
        }
        .ss-ticker-track:hover { animation-play-state: paused; }

        /* ── About Us Get Started button ── */
        .ss-about-cta {
          display: inline-block;
          background: #111827;
          color: #FFFFFF;
          font-size: 17px; font-weight: 600;
          padding: 15px 34px; border-radius: 5px;
          text-decoration: none; width: fit-content;
          font-family: var(--font-inter), Inter, sans-serif;
          position: relative; overflow: hidden; z-index: 0;
          transition: color 0.32s;
        }
        .ss-about-cta::before {
          content: ''; position: absolute;
          bottom: 0; left: 0; width: 100%; height: 0%;
          background: #F07820;
          transition: height 0.36s cubic-bezier(0.22,1,0.36,1);
          z-index: -1;
        }
        .ss-about-cta:hover::before { height: 100%; }
        .ss-about-cta:hover { color: #FFFFFF; }

        /* ── About Us dot animation ── */
        .ss-dot-anim {
          position: absolute;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #F07820;
          pointer-events: none;
          z-index: 10;
        }

        @keyframes ss-dot-main {
          0%      { left: 0px;               opacity: 1; }
          36%     { left: calc(100% - 8px);  opacity: 1; }
          40%     { left: calc(100% - 8px);  opacity: 0; }
          40.01%  { left: 0px;               opacity: 0; }
          100%    { left: 0px;               opacity: 0; }
        }
        @keyframes ss-dot-branch {
          0%, 40%  { left: 0px;              opacity: 0; }
          43%      { left: 0px;              opacity: 1; }
          76%      { left: calc(100% - 8px); opacity: 1; }
          80%      { left: calc(100% - 8px); opacity: 0; }
          80.01%   { left: 0px;              opacity: 0; }
          100%     { left: 0px;              opacity: 0; }
        }
      `}} />

      <div style={{ background: '#ffffff', fontFamily: "var(--font-inter),'Inter',sans-serif", overflowX:'hidden' }}>

        {/* ════════════════════════════════════════
            NAV — Floating pill that expands full-width on scroll
        ════════════════════════════════════════ */}
        <nav
          style={{
            position:'fixed', top:0, left:0, right:0, zIndex:50,
            background:'rgba(255,255,255,0.96)',
            backdropFilter:'blur(18px)',
            WebkitBackdropFilter:'blur(18px)',
            borderBottom:'1px solid rgba(0,0,0,0.07)',
            boxShadow:'0 1px 12px rgba(0,0,0,0.08)',
          }}
        >
          <div
            className="ss-nav-inner"
            style={{
              maxWidth:1120, margin:'0 auto',
              height:62,
              display:'flex', alignItems:'center', padding:'0 24px',
              justifyContent:'space-between',
            }}
          >
            {/* Logo */}
            <Link href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:0 }}>
              <img src="/logo.png" alt="SafeShift" fetchPriority="high" loading="eager" style={{ width:64, height:64, objectFit:'contain', mixBlendMode:'multiply' }} />
              <span style={{
                fontSize:20, fontWeight:800, color:C.ink,
                letterSpacing:'-0.04em',
                fontFamily:"var(--font-inter),'Inter',sans-serif",
                marginLeft:'-10px',
              }}>
                Safe<span style={{ color:C.orange }}>Shift</span>
              </span>
            </Link>

            {/* Centre nav links */}
            <div className="ss-desktop-links" style={{ display:'flex', gap:32 }}>
              {([['How It Works','#how-it-works'],['Coverage','#coverage'],['Learn','#learn'],['Plans','#plans'],['FAQ','#faq']] as [string,string][]).map(([l,h]) => (
                <a key={l} href={h} className="ss-nav-link">{l}</a>
              ))}
            </div>

            {/* Right actions */}
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <Link href="/call" className="ss-btn-call" title="1800-1234-5678">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span className="ss-btn-call-text">1800-1234-5678</span>
              </Link>
              <Link href="/login" className="ss-btn-signin">
                Login
              </Link>
              {canInstall && (
                <button
                  className="ss-btn-install ss-desktop-links"
                  onClick={async () => {
                    if (deferredPrompt.current) {
                      const p = deferredPrompt.current as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };
                      p.prompt();
                      const c = await p.userChoice;
                      if (c.outcome === 'accepted') setCanInstall(false);
                      deferredPrompt.current = null;
                    } else {
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                      alert(isIOS ? 'Tap the Share button (\u2191) in Safari, then "Add to Home Screen"' : 'Open browser menu (\u22EE) and tap "Install app" or "Add to Home Screen"');
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  Install App
                </button>
              )}

              {/* Mobile menu toggle */}
              <button
                className="ss-mobile-menu-btn"
                onClick={() => setMobileMenuOpen(o => !o)}
                style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:4, marginLeft:4 }}
              >
                {mobileMenuOpen ? <X size={22} color={C.ink} /> : <Menu size={22} color={C.ink} />}
              </button>
            </div>
          </div>

          {/* Mobile drawer — floats below the bar */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity:0, y:-8 }}
                animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-8 }}
                transition={{ duration:0.22 }}
                style={{
                  maxWidth:1120, margin:'8px auto 0',
                  background:'rgba(255,255,255,0.97)',
                  backdropFilter:'blur(18px)',
                  borderRadius:14,
                  border:'1px solid rgba(0,0,0,0.07)',
                  boxShadow:'0 8px 32px rgba(0,0,0,0.1)',
                  overflow:'hidden',
                  pointerEvents:'auto',
                }}
              >
                <div style={{ padding:'16px 24px 24px', display:'flex', flexDirection:'column', gap:4 }}>
                  {[['How It Works','#how-it-works'],['Coverage','#coverage'],['Learn','#learn'],['Plans','#plans'],['FAQ','#faq']].map(([l,h]) => (
                    <a key={l} href={h} onClick={() => setMobileMenuOpen(false)}
                      style={{ fontSize:16, fontWeight:500, color:C.ink, textDecoration:'none', padding:'11px 0', borderBottom:`1px solid ${C.border}` }}>
                      {l}
                    </a>
                  ))}
                  <Link href="/call" onClick={() => setMobileMenuOpen(false)}
                    style={{ display:'flex', alignItems:'center', gap:8, fontSize:16, fontWeight:500, color:C.orange, textDecoration:'none', padding:'11px 0' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    Call 1800-1234-5678
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Spacer so hero content starts below the fixed nav */}
        <div style={{ height: 62 }} aria-hidden="true" />

        {/* ════════════════════════════════════════
            HERO — White, full-width, big text left, truck bleeds right
        ════════════════════════════════════════ */}
        <section className="ss-hero-section" style={{
          background:'#ffffff',
          minHeight:'calc(100vh - 78px)',
          display:'grid',
          gridTemplateColumns:'1fr 1fr',
          alignItems:'stretch',
          overflow:'hidden',
        }}>

          {/* ─── LEFT: text ─── */}
          <div className="ss-hero-left" style={{
            display:'flex', flexDirection:'column', justifyContent:'flex-start',
            padding:'40px 48px 80px max(32px, calc(50vw - 580px))',
          }}>
            {/* Badge */}
            <div
              style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background:'transparent',
                border:`1.5px solid ${C.orange}`,
                borderRadius:24, padding:'6px 16px', marginBottom:32,
                width:'fit-content',
              }}
            >
              {/* Recording-style blinking dot */}
              <div style={{ position:'relative', width:7, height:7, flexShrink:0 }}>
                <div className="ss-rec-ring" style={{
                  position:'absolute', inset:0,
                  borderRadius:'50%', background:C.orange,
                }} />
                <div className="ss-rec-core" style={{
                  position:'absolute', inset:0,
                  borderRadius:'50%', background:C.orange,
                }} />
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:C.ink, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                Exclusively for Porter LCV Partners
              </span>
            </div>

            {/* Headline */}
            <div style={{ marginBottom:28 }}>
              {['When work stops,', 'your income', "doesn't."].map((line, i) => (
                <div key={i}>
                  <span
                    className={i === 0 ? 'ss-hero-headline-nowrap' : undefined}
                    style={{
                      display:'block',
                      fontSize:'clamp(3.2rem, 5vw, 5.2rem)',
                      fontWeight:800, letterSpacing:'-0.04em', lineHeight:1.06,
                      color: i === 2 ? C.orange : C.ink,
                      fontFamily:"var(--font-inter),'Inter',sans-serif",
                      whiteSpace: i === 0 ? 'nowrap' : 'normal',
                    }}>
                    {line}
                  </span>
                </div>
              ))}
            </div>

            {/* ── About Us block ── */}
            <div className="ss-about-grid" style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:38, marginTop:16 }}>

              {/* Left: text content */}
              <div style={{ display:'flex', flexDirection:'column' }}>
                <div style={{ width:'max-content', marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center' }}>
                    <div style={{ flex:1, height:1.5, background:'#D2622A', minWidth:0 }} />
                    <div style={{ width:8, height:8, background:'#D2622A', transform:'rotate(45deg)', margin:'0 6px', flexShrink:0 }} />
                    <div style={{ flex:1, height:1.5, background:'#D2622A', minWidth:0 }} />
                  </div>
                  <p style={{ fontSize:16, color:'#6B6B6B', marginTop:8, marginBottom:0, fontFamily:"var(--font-inter),'Inter',sans-serif", textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>About Us</p>
                </div>
                <p style={{ fontSize:18, color:'#5A5A5A', lineHeight:1.65, marginBottom:24, fontFamily:"var(--font-inter),'Inter',sans-serif" }}>
                  Forget complicated insurance claims. SafeShift detects disruptions automatically so you can focus on driving, not filing.
                </p>
                {/* Horizontal divider extended by gap (38px) so it touches the vertical line */}
                <div className="ss-about-divider" style={{ position:'relative', height:1, background:'#D0D0D0', marginBottom:24, width:'calc(100% + 38px)' }}>
                  <div className="ss-dot-anim" style={{ top:-3.5, animation:'ss-dot-main 4s linear infinite' }} />
                </div>
                <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:30 }}>
                  <div style={{ flexShrink:0, width:52, height:52, borderRadius:10, background:'#FEF3E8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Info size={28} color="#D2622A" />
                  </div>
                  <p style={{ fontSize:17, fontWeight:500, color:'#2A2A2A', lineHeight:1.55, fontFamily:"var(--font-inter),'Inter',sans-serif" }}>
                    We cover income loss due to disruptions, not vehicle repairs or medical costs.
                  </p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                  <Link href="/register" className="ss-about-cta">
                    Get Started
                  </Link>
                  <a
                    href="#coverage"
                    className="ss-watch-link"
                    style={{
                      fontSize:17, fontWeight:500, color:'#2A2A2A',
                      textDecoration:'none', paddingBottom:2,
                      fontFamily:"var(--font-inter),'Inter',sans-serif",
                    }}
                  >
                    Learn more
                  </a>
                </div>
              </div>

              {/* Right: stat cards */}
              <div className="ss-about-stats-col" style={{ display:'flex', flexDirection:'column', position:'relative' }}>
                {/* Vertical connector line */}
                <div className="ss-about-vline" style={{ position:'absolute', left:0, top:0, bottom:0, width:1, background:'#D0D0D0' }} />
                {([
                  { num:'<10 min',  label:'Payout time',     Icon: Zap        },
                  { num:'500K+',    label:'Target drivers',  Icon: Truck      },
                  { num:'₹192 Cr',  label:'Annual market',   Icon: TrendingUp },
                ] as Array<{ num:string; label:string; Icon: React.ElementType }>).map((s, i) => (
                  <div key={s.label} className="ss-about-stat-item" style={{
                    flex:1, display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'20px 24px 20px 16px',
                    position:'relative',
                    borderBottom: i < 2 ? '1px solid #D0D0D0' : undefined,
                  }}>
                    {i < 2 && <div className="ss-dot-anim" style={{ bottom:-4, animation:'ss-dot-branch 4s linear infinite' }} />}
                    <div>
                      <p style={{ fontSize:32, fontWeight:800, color:'#1A1A1A', lineHeight:1, marginBottom:6, fontFamily:"var(--font-inter),'Inter',sans-serif", letterSpacing:'-0.03em' }}>{s.num}</p>
                      <p style={{ fontSize:15, color:'#6B6B6B', fontFamily:"var(--font-inter),'Inter',sans-serif" }}>{s.label}</p>
                    </div>
                    <div style={{ width:56, height:56, borderRadius:10, background:'#FEF3E8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <s.Icon size={28} color="#D2622A" strokeWidth={1.5} />
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>

          {/* ─── RIGHT: illustration fills the entire right half ─── */}
          <div
            className="ss-hero-right"
            style={{
              position:'relative', overflow:'hidden',
              display:'flex', alignItems:'flex-start', justifyContent:'center',
              paddingTop:40, minHeight:480,
            }}
          >
            <img
              src="/hero-illustration.jpg"
              alt="SafeShift — delivery partner income protection"
              fetchPriority="high"
              loading="eager"
              className="ss-hero-img"
              style={{
                width:'100%', height:'100%',
                objectFit:'contain',
                objectPosition:'center',
                filter:'brightness(1.04) contrast(0.98)',
                transform:'translateX(-80px)',
              }}
            />
          </div>

        </section>

        {/* ════════════════════════════════════════
            STATS STRIP
        ════════════════════════════════════════ */}
        {/* ════════════════════════════════════════
            WEATHER TICKER
        ════════════════════════════════════════ */}
        <section style={{ background: C.dark, height:140, overflow:'hidden', display:'flex', alignItems:'center' }}>
          {tickerWeather.length > 0 ? (
            <div style={{
              overflow:'hidden', width:'100%',
              WebkitMaskImage:'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)',
              maskImage:'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)',
            }}>
              {/* Duplicate items so the scroll loops seamlessly */}
              <div className="ss-ticker-track">
                {[...tickerWeather, ...tickerWeather].map((w, i) => (
                  <div key={i} style={{
                    display:'inline-flex', alignItems:'center', gap:10,
                    padding:'0 40px',
                    borderRight:'1px solid rgba(255,255,255,0.08)',
                    flexShrink:0,
                  }}>
                    <span style={{ fontSize:22 }}>{w.emoji}</span>
                    <div>
                      <p style={{
                        fontSize:16, fontWeight:700, color:'#FFFFFF',
                        letterSpacing:'0.04em', textTransform:'uppercase',
                        fontFamily:"var(--font-inter),'Inter',sans-serif",
                        lineHeight:1.2,
                      }}>{w.city}</p>
                      <p style={{
                        fontSize:13, color:'rgba(255,255,255,0.45)',
                        fontFamily:"var(--font-inter),'Inter',sans-serif",
                        marginTop:2,
                      }}>{w.condition}</p>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                      <span style={{
                        fontSize:24, fontWeight:800, color:'#F07820',
                        fontFamily:"var(--font-inter),'Inter',sans-serif",
                        letterSpacing:'-0.03em', lineHeight:1,
                      }}>{w.temp}°C</span>
                      <span style={{
                        fontSize:13, color:'rgba(255,255,255,0.4)',
                        fontFamily:"var(--font-inter),'Inter',sans-serif",
                      }}>💨 {w.wind} km/h{w.rain > 0 ? `  🌧 ${w.rain}mm` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Loading skeleton — subtle pulsing dots */
            <div style={{ width:'100%', display:'flex', justifyContent:'center', gap:8 }}>
              {[...Array(5)].map((_,i) => (
                <div key={i} style={{
                  width:6, height:6, borderRadius:'50%',
                  background:'rgba(255,255,255,0.2)',
                  animation:`ss-rec-core 1s ease-in-out infinite`,
                  animationDelay:`${i*0.15}s`,
                }} />
              ))}
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════
            HOW A PAYOUT WORKS (9-min timeline)
        ════════════════════════════════════════ */}
        <section id="how-it-works" className="ss-how-section" style={{ background:C.white, padding:'96px 24px' }}>
          <div style={{ maxWidth:1120, margin:'0 auto' }}>

            {/* Two equal columns */}
            <div className="ss-how-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'stretch' }}>

              {/* ── LEFT: Payout Demo ── */}
              <div style={{ display:'flex', flexDirection:'column' }}>
                {/* Heading — mirrors right column structure */}
                <div style={{ marginBottom:28 }}>
                  <div style={{ width:'max-content', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center' }}>
                      <div style={{ flex:1, height:1.5, background:'#D2622A', minWidth:0 }} />
                      <div style={{ width:7, height:7, background:'#D2622A', transform:'rotate(45deg)', margin:'0 5px', flexShrink:0 }} />
                      <div style={{ flex:1, height:1.5, background:'#D2622A', minWidth:0 }} />
                    </div>
                    <p style={{ fontSize:12, color:C.gray, marginTop:7, textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:"var(--font-inter),'Inter',sans-serif" }}>Payout demo</p>
                  </div>
                  <h3 style={{ fontSize:'clamp(1.3rem,1.8vw,1.7rem)', fontWeight:700, color:C.ink, letterSpacing:'-0.02em', fontFamily:"var(--font-inter),'Inter',sans-serif" }}>
                    Here&apos;s exactly what happens.
                  </h3>
                </div>

                {/* Timeline — flex:1 so it fills the height set by the right column */}
                <div ref={timelineRef} style={{ position:'relative', paddingLeft:44, flex:1, display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{
                    position:'absolute', left:16, top:12,
                    width:2, bottom:0, background: C.border, borderRadius:2,
                  }} />
                  {TIMELINE.map((step, i) => (
                    <TimelineRow
                      key={i} step={step}
                      isVisible={i < timelineCount}
                      allVisible={timelineCount >= TIMELINE.length}
                    />
                  ))}
                </div>
              </div>

              {/* ── RIGHT: How It Works ── */}
              <div>
                {/* Heading — mirrors left column structure */}
                <div style={{ marginBottom:28 }}>
                  <div style={{ width:'max-content', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center' }}>
                      <div style={{ flex:1, height:1.5, background:'#D2622A', minWidth:0 }} />
                      <div style={{ width:7, height:7, background:'#D2622A', transform:'rotate(45deg)', margin:'0 5px', flexShrink:0 }} />
                      <div style={{ flex:1, height:1.5, background:'#D2622A', minWidth:0 }} />
                    </div>
                    <p style={{ fontSize:12, color:C.gray, marginTop:7, textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:"var(--font-inter),'Inter',sans-serif" }}>How it works</p>
                  </div>
                  <h3 style={{ fontSize:'clamp(1.3rem,1.8vw,1.7rem)', fontWeight:700, color:C.ink, letterSpacing:'-0.02em', fontFamily:"var(--font-inter),'Inter',sans-serif" }}>
                    Four steps to your payout
                  </h3>
                </div>

                {/*
                  Always a 2×2 grid — cards never unmount.
                  In collapsed state, cards 1-3 are translated (via animate x/y) to sit
                  directly on top of card 0. Their grid cells still exist so both rows
                  keep their height, meaning the grid footprint never changes.
                  On hover they animate back to their natural grid positions.
                */}
                {/* onMouseLeave on container collapses from anywhere inside the grid */}
                <div
                  className="ss-steps-grid"
                  onMouseLeave={() => setStepsExpanded(false)}
                  style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 }}
                >
                  {HOW_STEPS.map((step, i) => {
                    const CardIcon = step.Icon;
                    const isFront  = i === 0;
                    const effectiveMobile = mounted && isMobile;
                    // On mobile all cards always visible; on desktop collapse behind card 0
                    const colX = (!stepsExpanded && !effectiveMobile && (i===1||i===3)) ? 'calc(-100% - 12px)' : 0;
                    const colY = (!stepsExpanded && !effectiveMobile && (i===2||i===3)) ? 'calc(-100% - 12px)' : 0;
                    const rot  = (!stepsExpanded && !effectiveMobile && !isFront) ? ([0,-1.5,2,-1] as const)[i] : 0;
                    return (
                      <motion.div
                        key={i}
                        className="ss-step-card"
                        // Expansion triggers only when hovering card 0 (Quick Setup) on desktop
                        onMouseEnter={isFront && !effectiveMobile ? () => setStepsExpanded(true) : undefined}
                        initial={{ x:colX, y:colY, rotate:rot }}
                        animate={{ x:colX, y:colY, rotate:rot }}
                        transition={{
                          duration: 0.65,
                          ease: [0.22,1,0.36,1],
                          delay: 0,  // all cards start together → all arrive at the same time
                        }}
                        style={{
                          position: 'relative',
                          // Card 0 always on top; back cards rank below it when collapsed
                          zIndex: isFront ? 4 : (!stepsExpanded ? 4 - i : undefined),
                          background: C.white,
                          borderRadius: 14,
                          padding: '20px',
                          border: isFront ? `1.5px solid ${C.orange}` : `1px solid ${C.border}`,
                          boxShadow: isFront
                            ? `0 8px 28px rgba(240,120,32,0.14)`
                            : '0 4px 18px rgba(0,0,0,0.06)',
                          aspectRatio: '1',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >

                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexShrink:0 }}>
                          <div style={{ width:40, height:40, borderRadius:10, background:'#FEF3E8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <CardIcon size={18} color={C.orange} />
                          </div>
                          <span style={{ fontSize:11, fontWeight:700, color:C.grayLight, letterSpacing:'0.06em' }}>{step.n}</span>
                        </div>
                        <h3 style={{ fontSize:15, fontWeight:700, color:C.ink, letterSpacing:'-0.01em', marginBottom:6 }}>{step.title}</h3>
                        <p style={{ fontSize:13, color:C.gray, lineHeight:1.6 }}>{step.body}</p>
                        {isFront && !stepsExpanded && !(mounted && isMobile) && (
                          <div style={{ marginTop:'auto', paddingTop:10, display:'flex', alignItems:'center', gap:5 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:C.orange, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:"var(--font-inter),'Inter',sans-serif", lineHeight:1 }}>
                              Hover to see all steps
                            </span>
                            <ArrowRight size={13} color={C.orange} strokeWidth={2.5} style={{ flexShrink:0 }} />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            COVERAGE
        ════════════════════════════════════════ */}
        <section ref={coverageSectionRef} id="coverage" className="ss-coverage-section" style={{ background:'#ECEDF1', position:'relative', minHeight:1080, overflow:'hidden' }}>

          {/* Center heading + subtitle */}
          <div className="ss-coverage-heading" style={{
            position:'absolute', top:'48%', left:'51%',
            transform:'translate(-50%, -50%)',
            textAlign:'center', width:420, zIndex:2,
          }}>
            <p style={{ fontSize:16, fontWeight:700, color:C.orange, textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14, fontFamily:"var(--font-inter),'Inter',sans-serif" }}>Coverage</p>
            <h2 style={{
              fontSize:'clamp(1.8rem,2.8vw,2.5rem)', fontWeight:600,
              color:'#1A1A1A', lineHeight:1.25, margin:'8px 0 12px',
              fontFamily:"var(--font-inter),'Inter',sans-serif",
            }}>
              What stops your work — we cover it.
            </h2>
            <p style={{
              fontSize:15, color:'#6B6B6B', lineHeight:1.6,
              fontFamily:"var(--font-inter),'Inter',sans-serif",
            }}>
              Detected automatically. Paid instantly.
            </p>
          </div>

          {/* Feature items — rotating orbit container (desktop) */}
          {(() => {
            const imgs = [
              '/heavy-rainfall.jpg',   // Heavy Rainfall
              '/airpo.jpg',            // Air Pollution Ban
              '/cyclone.jpg',          // Cyclone / High Winds
              '/app-outage.jpg',       // App Outage
              '/bandh.jpg',            // Curfew / Bandh
            ];
            const R = 340;
            return (
              <motion.div className="ss-coverage-orbit" style={{
                position:'absolute', top:'48%', left:'51%',
                width:0, height:0, zIndex:2,
                rotate: coverageRotation,
              }}>
                {COVERAGE.map((item, ci) => {
                  const angleDeg = -90 + ci * 72;
                  const rad = angleDeg * Math.PI / 180;
                  const x = Math.cos(rad) * R;
                  const y = Math.sin(rad) * R;
                  return (
                    <motion.div
                      key={item.key}
                      style={{
                        position:'absolute',
                        left: x, top: y,
                        x:'-50%', y:'-50%',
                        rotate: coverageCounterRotation,
                      }}
                    >
                      <div
                        style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, width:220 }}
                      >
                        {/* Image tile */}
                        <div style={{
                          position:'relative', width:180, height:180,
                          borderRadius:22, overflow:'hidden',
                          border:'1px solid rgba(0,0,0,0.08)',
                          boxShadow:'0 4px 20px rgba(0,0,0,0.08)',
                          flexShrink:0,
                        }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgs[ci]}
                            alt=""
                            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                          />
                          <div style={{
                            position:'absolute', top:'50%', left:'50%',
                            transform:'translate(-50%, -50%)',
                            width:68, height:68, borderRadius:'50%',
                            background:'rgba(255,255,255,0.88)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            boxShadow:'0 2px 8px rgba(0,0,0,0.12)',
                          }}>
                            <item.Icon size={32} color="#1A1A1A" />
                          </div>
                        </div>

                        {/* Label + payout */}
                        <div style={{ textAlign:'center' }}>
                          <p style={{
                            fontSize:15, fontWeight:600, color:'#2A2A2A',
                            marginBottom:4, lineHeight:1.3,
                            fontFamily:"var(--font-inter),'Inter',sans-serif",
                          }}>{item.title}</p>
                          <span style={{
                            fontSize:13, fontWeight:700,
                            color:'#1A40C0', background:'#EEF2FF',
                            padding:'2px 8px', borderRadius:20, display:'inline-block',
                            fontFamily:"var(--font-inter),'Inter',sans-serif",
                          }}>{item.payout}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            );
          })()}

          {/* Mobile coverage grid — hidden on desktop, shown on mobile via CSS */}
          {(() => {
            const mobileImgs = [
              '/heavy-rainfall.jpg',
              '/airpo.jpg',
              '/cyclone.jpg',
              '/app-outage.jpg',
              '/bandh.jpg',
            ];
            return (
              <div className="ss-coverage-mobile" style={{
                display:'none',
                gridTemplateColumns:'repeat(2,1fr)',
                gap:14,
                width:'100%',
                maxWidth:480,
              }}>
                {COVERAGE.map((item, ci) => (
                  <div key={item.key} style={{
                    position:'relative',
                    aspectRatio:'1',
                    borderRadius:18, overflow:'hidden',
                    boxShadow:'0 4px 16px rgba(0,0,0,0.14)',
                    backgroundImage:`url(${mobileImgs[ci]})`,
                    backgroundSize:'cover',
                    backgroundPosition:'center',
                  }}>
                    {/* Dark gradient overlay */}
                    <div style={{
                      position:'absolute', inset:0,
                      background:'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0.08) 100%)',
                    }} />
                    {/* Icon top-left */}
                    <div style={{
                      position:'absolute', top:12, left:12,
                      width:40, height:40, borderRadius:10,
                      background:'rgba(255,255,255,0.18)',
                      backdropFilter:'blur(6px)',
                      WebkitBackdropFilter:'blur(6px)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      border:'1px solid rgba(255,255,255,0.25)',
                    }}>
                      <item.Icon size={20} color="#ffffff" />
                    </div>
                    {/* Title + payout bottom */}
                    <div style={{
                      position:'absolute', bottom:0, left:0, right:0,
                      padding:'10px 12px 12px',
                    }}>
                      <p style={{
                        fontSize:13, fontWeight:700, color:'#ffffff',
                        lineHeight:1.25, margin:'0 0 5px',
                        fontFamily:"var(--font-inter),'Inter',sans-serif",
                        textShadow:'0 1px 4px rgba(0,0,0,0.5)',
                      }}>{item.title}</p>
                      <span style={{
                        fontSize:11, fontWeight:700,
                        color:'#ffffff', background:'rgba(26,64,192,0.75)',
                        padding:'2px 8px', borderRadius:20,
                        display:'inline-block',
                        fontFamily:"var(--font-inter),'Inter',sans-serif",
                        backdropFilter:'blur(4px)',
                      }}>{item.payout}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

        </section>

        {/* ════════════════════════════════════════
            TESTIMONIAL
        ════════════════════════════════════════ */}
        <section ref={testimonialRef} className="ss-testimonial" style={{ display:'flex', minHeight:440 }}>

          {/* Left — image with text */}
          <div className="ss-testimonial-img" style={{
            flex:'0 0 65%',
            backgroundImage:"url('/porter_ack.jpg')",
            backgroundSize:'cover', backgroundPosition:'center',
            position:'relative', display:'flex', alignItems:'flex-end',
          }}>
            <div style={{ padding:'28px 32px' }}>
              <p style={{
                margin:'0 0 6px 0',
                fontSize:12, fontWeight:600, letterSpacing:'0.12em',
                textTransform:'uppercase', color:C.orange,
                fontFamily:"var(--font-inter),'Inter',sans-serif",
              }}>Exclusive Interview</p>
              <p style={{
                margin:0,
                fontSize:'clamp(1.1rem,1.6vw,1.4rem)', fontWeight:700,
                color:'#1E3A5F', lineHeight:1.3,
                fontFamily:"var(--font-inter),'Inter',sans-serif",
              }}>
                Hear directly from Porter LCV<br/>delivery partners who tried it first.
              </p>
            </div>
          </div>

          {/* Right — video */}
          {/* To change the video start time: edit ?start=N (N = seconds into the video)        */}
          {/* To change the thumbnail: take a screenshot of the desired frame, save it to        */}
          {/*   /public/video-thumbnail.jpg, then update the backgroundImage src below.          */}
          <div className="ss-testimonial-text" style={{
            flex:1, background:'#b5c8fb',
            display:'flex', flexDirection:'column', alignItems:'flex-start', justifyContent:'center',
            padding:'32px 32px 32px 0px',
            marginLeft:'-178px', position:'relative', zIndex:1,
          }}>
            <div style={{ width:'100%' }}>

              {/* Mobile-only text (hidden on desktop, shown when left image is hidden) */}
              <div className="ss-testimonial-mobile-text" style={{ display:'none', marginBottom:20 }}>
                <p style={{
                  margin:'0 0 6px 0',
                  fontSize:12, fontWeight:600, letterSpacing:'0.12em',
                  textTransform:'uppercase', color:C.orange,
                  fontFamily:"var(--font-inter),'Inter',sans-serif",
                }}>Exclusive Interview</p>
                <p style={{
                  margin:0,
                  fontSize:'clamp(1.1rem,1.6vw,1.4rem)', fontWeight:700,
                  color:'#1E3A5F', lineHeight:1.3,
                  fontFamily:"var(--font-inter),'Inter',sans-serif",
                }}>
                  Hear directly from Porter LCV<br/>delivery partners who tried it first.
                </p>
              </div>

              {/* 16:9 video wrapper — gradient border */}
              <div style={{
                padding:3, marginBottom:20,
                borderRadius:11,
                background:'linear-gradient(135deg, #F07820 0%, #1A40C0 100%)',
                boxShadow:'0 8px 32px rgba(0,0,0,0.18)',
              }}>
              <div style={{ position:'relative', width:'100%', paddingBottom:'56.25%', borderRadius:8, overflow:'hidden', background:'#000' }}>
                {videoPlaying ? (
                  <iframe
                    src="https://drive.google.com/file/d/1JUs3iJCZ427nV3vC9ayDoj2m398zKgAn/preview"
                    style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title="Early reviewer interview"
                  />
                ) : (
                  <div
                    role="button"
                    aria-label="Play early reviewer interview"
                    tabIndex={0}
                    onClick={() => setVideoPlaying(true)}
                    onKeyDown={e => e.key === 'Enter' && setVideoPlaying(true)}
                    style={{
                      position:'absolute', top:0, left:0, width:'100%', height:'100%',
                      backgroundImage:"url('/thumbnail.jpg')",
                      backgroundSize:'cover', backgroundPosition:'center',
                      cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}
                  >
                    <div style={{
                      width:60, height:60, borderRadius:'50%',
                      background:'rgba(255,255,255,0.92)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow:'0 4px 24px rgba(0,0,0,0.35)',
                    }}>
                      <svg viewBox="0 0 24 24" width={26} height={26} fill={C.orange}>
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>

                  </div>
                )}
              </div>{/* end 16:9 inner */}
              </div>{/* end gradient border */}

            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            LEARN
        ════════════════════════════════════════ */}
        <section id="learn" className="ss-learn-section" style={{ background:'#FFFFFF', padding:'80px 60px' }}>
          <div className="ss-learn-grid" style={{ maxWidth:1200, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1.2fr 1.2fr', gap:32, alignItems:'flex-start' }}>

            {/* Col 1 — Text + CTA */}
            <div>
              {/* Decorative line — auto-width to match label */}
              <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'stretch', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center' }}>
                  <div style={{ flex:1, height:1, background:'#D2622A' }} />
                  <div style={{ width:6, height:6, background:'#D2622A', transform:'rotate(45deg)', margin:'0 -3px', flexShrink:0 }} />
                  <div style={{ flex:1, height:1, background:'#D2622A' }} />
                </div>
                <p style={{ fontSize:14, color:'#6B6B6B', marginBottom:0, marginTop:8, fontFamily:"var(--font-inter),'Inter',sans-serif" }}>
                  Learn
                </p>
              </div>
              <h2 style={{
                fontSize:'clamp(2rem,3.5vw,2.8rem)', fontWeight:800,
                letterSpacing:'-0.03em', color:'#1A1A1A', lineHeight:1.15,
                fontFamily:"var(--font-inter),'Inter',sans-serif", marginBottom:16,
              }}>
                Explore Parametric Insurance
              </h2>
              <p style={{ fontSize:16, color:'#5A5A5A', lineHeight:1.6, marginBottom:24, maxWidth:320 }}>
                Discover the features, benefits, and insights of parametric insurance.
              </p>
              <a
                href="https://en.wikipedia.org/wiki/Parametric_insurance"
                target="_blank" rel="noopener noreferrer"
                className="ss-view-articles"
                style={{
                  display:'inline-block', background:'#1A1A1A', color:'#FFFFFF',
                  fontSize:15, fontWeight:600, padding:'14px 28px',
                  borderRadius:4, textDecoration:'none', cursor:'pointer',
                  fontFamily:"var(--font-inter),'Inter',sans-serif",
                }}
              >
                View all articles
              </a>
            </div>

            {/* Col 2 — Article Card 1 */}
            <div>
              <a
                href="https://www.gicouncil.in/news-media/gic-in-the-news/what-is-parametric-cover/"
                target="_blank" rel="noopener noreferrer"
                style={{ textDecoration:'none', display:'block', cursor:'pointer' }}
              >
                <div style={{ overflow:'hidden', borderRadius:8, marginBottom:16 }}
                  onMouseOver={e => { (e.currentTarget.querySelector('img') as HTMLImageElement).style.transform = 'scale(1.04)'; }}
                  onMouseOut={e => { (e.currentTarget.querySelector('img') as HTMLImageElement).style.transform = 'scale(1)'; }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&h=800&fit=crop"
                    alt="What is parametric cover"
                    className="ss-article-img"
                  style={{ width:'100%', height:520, objectFit:'cover', display:'block', transition:'transform 0.4s ease' }}
                  />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <span style={{
                    background:'#D2622A', color:'#FFFFFF',
                    fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:4,
                    fontFamily:"var(--font-inter),'Inter',sans-serif",
                  }}>General Insurance Council</span>
                  <span style={{ fontSize:14, color:'#6B6B6B', fontFamily:"var(--font-inter),'Inter',sans-serif" }}>May 30, 2025</span>
                </div>
                <h3 style={{
                  fontSize:19, fontWeight:700, color:'#1A1A1A', lineHeight:1.4,
                  fontFamily:"var(--font-inter),'Inter',sans-serif",
                }}>
                  What is Parametric Cover? — GI Council India
                </h3>
              </a>
            </div>

            {/* Col 3 — Article Card 2 */}
            <div>
              <a
                href="https://www.icicilombard.com/blogs/home-insurance/hoi/parametric-insurance-explained-benefits-features"
                target="_blank" rel="noopener noreferrer"
                style={{ textDecoration:'none', display:'block', cursor:'pointer' }}
              >
                <div style={{ overflow:'hidden', borderRadius:8, marginBottom:16 }}
                  onMouseOver={e => { (e.currentTarget.querySelector('img') as HTMLImageElement).style.transform = 'scale(1.04)'; }}
                  onMouseOut={e => { (e.currentTarget.querySelector('img') as HTMLImageElement).style.transform = 'scale(1)'; }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=800&fit=crop"
                    alt="Parametric insurance explained"
                    className="ss-article-img"
                  style={{ width:'100%', height:520, objectFit:'cover', display:'block', transition:'transform 0.4s ease' }}
                  />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                  <span style={{
                    background:'#D2622A', color:'#FFFFFF',
                    fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:4,
                    fontFamily:"var(--font-inter),'Inter',sans-serif",
                  }}>ICICI Bank</span>
                  <span style={{ fontSize:14, color:'#6B6B6B', fontFamily:"var(--font-inter),'Inter',sans-serif" }}>Aug 7, 2025</span>
                </div>
                <h3 style={{
                  fontSize:19, fontWeight:700, color:'#1A1A1A', lineHeight:1.4,
                  fontFamily:"var(--font-inter),'Inter',sans-serif",
                }}>
                  Parametric Insurance Explained: Benefits &amp; Features
                </h3>
              </a>
            </div>

          </div>
        </section>

        {/* ════════════════════════════════════════
            PLANS
        ════════════════════════════════════════ */}
        <section id="plans" className="ss-plans-section" style={{ background:'#294ca7', padding:'48px 40px' }}>
          <div style={{ maxWidth:1200, margin:'0 auto' }}>

            {/* ── Section header ── */}
            <div style={{
              display:'flex', justifyContent:'space-between',
              alignItems:'flex-end', marginBottom:48,
              flexWrap:'wrap', gap:24,
            }}>
              {/* Left: decorative + label + heading */}
              <div>
                {/* ────◆──── auto-width to match label */}
                <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'stretch', marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center' }}>
                    <div style={{ flex:1, height:1.5, background:C.orange }} />
                    <div style={{ width:7, height:7, background:C.orange, transform:'rotate(45deg)', flexShrink:0, margin:'0 5px' }} />
                    <div style={{ flex:1, height:1.5, background:C.orange }} />
                  </div>
                  <p style={{
                    fontSize:12, color:'rgba(255,255,255,0.5)', textTransform:'uppercase',
                    letterSpacing:'0.12em', marginBottom:0, marginTop:8,
                    fontFamily:"var(--font-inter),'Inter',sans-serif",
                  }}>Pricing</p>
                </div>
                <h2 style={{
                  fontSize:'clamp(2.2rem,3.6vw,3.2rem)',
                  fontWeight:800, letterSpacing:'-0.03em',
                  color:'#FFFFFF', lineHeight:1.1,
                  fontFamily:"var(--font-inter),'Inter',sans-serif",
                }}>
                  Pick a Plan,<br />Get Protected
                </h2>
              </div>

            </div>

            {/* ── Two-column layout ── */}
            <div className="ss-plans-layout" style={{ display:'flex', alignItems:'stretch', gap:24 }}>

              {/* LEFT — stacked selector cards */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16 }}>
                {PLANS.map((plan) => {
                  const isSel = selectedPlan === plan.slug;
                  return (
                    <div
                      key={plan.slug}
                      onClick={() => setSelectedPlan(plan.slug)}
                      style={{
                        flex:1,
                        border:`${isSel ? 2 : 1}px solid ${isSel ? C.orange : 'rgba(255,255,255,0.18)'}`,
                        borderRadius:0, padding:'20px 24px',
                        background: isSel ? C.orange : 'rgba(255,255,255,0.06)',
                        cursor:'pointer',
                        display:'flex', alignItems:'center', gap:16,
                        boxShadow: isSel ? '0 6px 28px rgba(240,120,32,0.28)' : 'none',
                        transition:'background 0.22s, border-color 0.22s, box-shadow 0.22s',
                        userSelect:'none',
                      } as React.CSSProperties}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width:20, height:20, borderRadius:0, flexShrink:0,
                        border: isSel ? 'none' : '2px solid rgba(255,255,255,0.3)',
                        background: isSel ? 'rgba(255,255,255,0.25)' : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {isSel && (
                          <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                            <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2"
                              strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>

                      {/* Plan name */}
                      <span style={{
                        flex:1, fontSize:17, fontWeight:600,
                        color: '#FFFFFF',
                        fontFamily:"var(--font-inter),'Inter',sans-serif",
                      }}>{plan.name}</span>

                      {/* Price */}
                      <span style={{
                        fontSize:26, fontWeight:700, whiteSpace:'nowrap',
                        color: '#FFFFFF',
                        fontFamily:"var(--font-inter),'Inter',sans-serif",
                        letterSpacing:'-0.02em',
                      }}>
                        ₹{plan.price}
                        <span style={{ fontWeight:400, fontSize:14, opacity:0.7 }}> /wk</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT — feature panel */}
              <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
                <div style={{
                  flex:1,
                  border:'1px solid rgba(255,255,255,0.18)', borderRadius:0,
                  overflow:'hidden',
                  display:'flex', flexDirection:'column',
                  background:'rgba(255,255,255,0.05)',
                }}>
                  {/* Panel header */}
                  <div style={{ padding:'22px 24px', borderBottom:'1px solid rgba(255,255,255,0.12)' }}>
                    <span style={{
                      fontSize:22, fontWeight:700, color:'#FFFFFF',
                      fontFamily:"var(--font-inter),'Inter',sans-serif",
                    }}>Includes:</span>
                  </div>

                  {/* Feature rows */}
                  <div>
                    <div key={selectedPlan}>
                      {(PLANS.find(p => p.slug === selectedPlan)?.features ?? []).map((f, idx, arr) => (
                        <div key={f} style={{
                          display:'flex', justifyContent:'space-between', alignItems:'center',
                          padding:'16px 24px',
                          borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        }}>
                          <span style={{ fontSize:15, color:'rgba(255,255,255,0.8)' }}>{f}</span>
                          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" style={{ flexShrink:0 }}>
                            <path d="M1.5 7L6.5 12L16.5 2" stroke={C.orange}
                              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CTA ── */}
            <div style={{ display:'flex', justifyContent:'center', marginTop:40 }}>
              <Link
                href="/register"
                className="ss-choose-plan"
                style={{
                  background:'#FFFFFF',
                  fontSize:18, fontWeight:700,
                  padding:'16px 48px', borderRadius:4,
                  textDecoration:'none', display:'inline-block',
                  fontFamily:"var(--font-inter),'Inter',sans-serif",
                }}
              >
                Choose plan
              </Link>
            </div>

          </div>
        </section>

        {/* ════════════════════════════════════════
            FAQ
        ════════════════════════════════════════ */}
        <section id="faq" className="ss-faq-section" style={{ background:'#ECEDF1', padding:'80px 40px' }}>
          <div style={{ maxWidth:900, margin:'0 auto' }}>

            {/* ── Header ── */}
            <div style={{ textAlign:'center', marginBottom:48 }}>
              {/* ────◆──── auto-width to match label */}
              <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
                <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'stretch' }}>
                  <div style={{ display:'flex', alignItems:'center' }}>
                    <div style={{ flex:1, height:1.5, background:C.orange }} />
                    <div style={{ width:7, height:7, background:C.orange, transform:'rotate(45deg)', flexShrink:0, margin:'0 5px' }} />
                    <div style={{ flex:1, height:1.5, background:C.orange }} />
                  </div>
                  <p style={{
                    fontSize:14, color:'#6B6B6B', marginBottom:0, marginTop:8,
                    fontFamily:"var(--font-inter),'Inter',sans-serif",
                  }}>FAQ</p>
                </div>
              </div>
              <h2 style={{
                fontSize:'clamp(2.2rem,4vw,3.4rem)',
                fontWeight:800, letterSpacing:'-0.03em',
                color:'#1A1A1A', lineHeight:1.1,
                fontFamily:"var(--font-inter),'Inter',sans-serif",
              }}>Frequently Asked Questions!</h2>
            </div>

            {/* ── Accordion ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {FAQS.map((faq, i) => {
                const isOpen = activeFaq === i;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveFaq(isOpen ? null : i)}
                    style={{
                      background: isOpen ? '#F5F5F7' : '#FFFFFF',
                      border:'1px solid #D0D0D0',
                      borderRadius:0,
                      padding:'20px 24px',
                      cursor:'pointer',
                      transition:'background 0.22s',
                      userSelect:'none',
                    } as React.CSSProperties}
                  >
                    {/* Question row */}
                    <div style={{
                      display:'flex', alignItems:'center',
                      justifyContent:'space-between', gap:16,
                    }}>
                      <span style={{
                        fontSize:18, fontWeight:600, color:'#1A1A1A',
                        letterSpacing:'-0.01em',
                        fontFamily:"var(--font-inter),'Inter',sans-serif",
                      }}>{faq.q}</span>

                      {/* +/× toggle button */}
                      <div style={{
                        width:36, height:36, flexShrink:0,
                        border:`1px solid ${isOpen ? 'transparent' : '#D0D0D0'}`,
                        borderRadius:0,
                        background: isOpen ? C.orange : '#FFFFFF',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'background 0.22s, border-color 0.22s',
                      }}>
                        <span style={{
                          fontSize:20, lineHeight:1, fontWeight:300,
                          color: isOpen ? '#FFFFFF' : '#6B6B6B',
                          fontFamily:"var(--font-inter),'Inter',sans-serif",
                        }}>
                          {isOpen ? '×' : '+'}
                        </span>
                      </div>
                    </div>

                    {/* Answer — animates height + opacity */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height:0, opacity:0 }}
                          animate={{ height:'auto', opacity:1 }}
                          exit={{ height:0, opacity:0 }}
                          transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
                          style={{ overflow:'hidden' }}
                        >
                          <p style={{
                            fontSize:16, color:'#5A5A5A', lineHeight:1.6,
                            paddingTop:12,
                            fontFamily:"var(--font-inter),'Inter',sans-serif",
                          }}>{faq.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* ════════════════════════════════════════
            OPPORTUNITY BANNER
        ════════════════════════════════════════ */}
        <OpportunityBanner />

        {/* ════════════════════════════════════════
            DARK FOOTER
        ════════════════════════════════════════ */}
        <DarkFooter />

      </div>

      {/* PWA Install Prompt — floating bottom-right */}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE ROW
// ─────────────────────────────────────────────────────────────────────────────

function TimelineRow({ step, isVisible, allVisible }: {
  step: typeof TIMELINE[number];
  isVisible: boolean;
  allVisible: boolean;
}) {
  const isLastAndDone = step.highlight && allVisible;
  const dotBg = !isVisible ? C.border : isLastAndDone ? '#059669' : C.orange;
  const dotBorder = isLastAndDone ? '#d1fae5' : C.white;

  return (
    <motion.div
      initial={{ opacity:0, y:14 }}
      animate={isVisible ? { opacity:1, y:0 } : { opacity:0, y:14 }}
      transition={{ duration:0.45, ease:[0.22,1,0.36,1] }}
      style={{
        position:'relative',
        flex:1,
        display:'flex', alignItems:'stretch', gap:14,
      }}
    >
      {/* Dot — animates grey → orange → green */}
      <motion.div
        animate={{ background: dotBg, borderColor: dotBorder }}
        transition={{ duration:0.4 }}
        style={{
          position:'absolute', left:-36, top:12,
          width:18, height:18, borderRadius:'50%',
          border:`3px solid ${dotBorder}`,
          zIndex:1,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}
      >
        {isLastAndDone && (
          <motion.div
            initial={{ scale:0 }}
            animate={{ scale:1 }}
            transition={{ delay:0.1, type:'spring', stiffness:300 }}
          >
            <CheckCircle2 size={8} color="#fff" />
          </motion.div>
        )}
      </motion.div>

      {/* Card */}
      <div style={{
        background: isLastAndDone ? '#f0fdf4' : C.white,
        border:`1px solid ${isLastAndDone ? '#86efac' : C.border}`,
        borderRadius:12, padding:'16px 18px', flex:1,
        display:'flex', alignItems:'center',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <step.Icon size={20} color={isLastAndDone ? '#059669' : C.orange} strokeWidth={2} style={{ flexShrink:0 }} />
            <span style={{ fontSize:15, fontWeight:600, color: isLastAndDone ? '#059669' : C.ink }}>
              {step.event}
            </span>
          </div>
          <span style={{ fontSize:13, color:C.grayLight, flexShrink:0, marginLeft:12 }}>
            {step.time}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPPORTUNITY BANNER
// ─────────────────────────────────────────────────────────────────────────────

function OpportunityBanner() {
  return (
    <section style={{ position:'relative', overflow:'hidden', minHeight:146 }}>
      {/* truck.gif background */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:"url('/truck_footer.jpg')",
        backgroundSize:'cover', backgroundPosition:'center center',
      }} />
      {/* Dark gradient — strong on left, fades right */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(to right, rgba(10,10,20,0.95) 0%, rgba(10,10,20,0.88) 45%, rgba(10,10,20,0.55) 100%)',
      }} />

      <div style={{ position:'relative', zIndex:1, maxWidth:1120, margin:'0 auto', padding:'34px 40px', display:'flex', justifyContent:'center', paddingLeft:'10%' }}>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:12, fontWeight:700, color:C.orange, textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:20 }}>
            The opportunity
          </p>
          <h2 style={{
            fontSize:'clamp(2.6rem, 5vw, 4.2rem)', fontWeight:800,
            letterSpacing:'-0.04em', color:'#FFFFFF', lineHeight:1.05,
            fontFamily:"var(--font-inter),'Inter',sans-serif", marginBottom:20,
          }}>
            500,000 Porter<br />LCV drivers.
          </h2>
          <p style={{ fontSize:'clamp(1.1rem, 2vw, 1.35rem)', color:'rgba(255,255,255,0.58)', lineHeight:1.6, marginBottom:8 }}>
            Less than 5% have income protection.
          </p>
          <p style={{ fontSize:'clamp(1.1rem, 2vw, 1.35rem)', fontWeight:700, color:C.orange, lineHeight:1.6 }}>
            We&apos;re changing that.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DARK FOOTER
// ─────────────────────────────────────────────────────────────────────────────

function DarkFooter() {
  const NAV_COLS = [
    {
      heading: 'Pages',
      links: [['How It Works','#how-it-works'],['Coverage','#coverage'],['Learn','#learn'],['Plans','#plans'],['FAQ','#faq']],
    },
    {
      heading: 'Links',
      links: [['Register','/register'],['Sign In','/login'],['Admin Dashboard','/login?role=admin'],['Contact','/contact']],
    },
  ];

  const SOCIALS = [
    { label:'GitHub', href:'https://github.com/Manogna21-prog/Safe-Shift', path:'M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z' },
    { label:'YouTube', href:'https://youtu.be/E31GBuIvsZE?si=SprofR8gVE5l-0Uu', path:'M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z' },
    { label:'Medium', href:'https://medium.com/@jv.yogashree/68409d934bfb', path:'M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z' },
  ];

  return (
    <footer style={{ background:'#000000', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
      <div className="ss-footer-inner" style={{ maxWidth:1120, margin:'0 auto', padding:'16px 24px' }}>
        <div className="ss-footer-row" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:'12px 24px' }}>

          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', marginLeft:'-8px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/safeshift_logo_dark.png" alt="SafeShift" style={{ height:28, width:'auto', flexShrink:0 }} />
            <span style={{ fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-0.04em', fontFamily:"var(--font-inter),'Inter',sans-serif", marginLeft:'-6px' }}>
              Safe<span style={{ color:C.orange }}>Shift</span>
            </span>
          </div>

          <span className="ss-footer-sep" style={{ color:'rgba(255,255,255,0.15)', fontSize:14 }}>·</span>

          {/* Links */}
          {NAV_COLS[1].links.map(([label, href], i, arr) => (
            <span key={label} style={{ display:'flex', alignItems:'center', gap:24 }}>
              <a
                href={href}
                style={{ fontSize:13, color:'rgba(255,255,255,0.6)', textDecoration:'none', transition:'color 0.18s' }}
                onMouseOver={e => (e.currentTarget.style.color = C.orange)}
                onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
              >{label}</a>
              {i < arr.length - 1 && <span className="ss-footer-sep" style={{ color:'rgba(255,255,255,0.15)', fontSize:14 }}>·</span>}
            </span>
          ))}

          <span className="ss-footer-sep" style={{ color:'rgba(255,255,255,0.15)', fontSize:14 }}>·</span>

          {/* Social icons */}
          {SOCIALS.map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
              style={{ width:26, height:26, background:C.orange, display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s', flexShrink:0 }}
              onMouseOver={e => (e.currentTarget.style.background = '#d96a18')}
              onMouseOut={e => (e.currentTarget.style.background = C.orange)}
            >
              <svg viewBox="0 0 24 24" width={14} height={14} fill="#fff"><path d={s.path} /></svg>
            </a>
          ))}

          <span className="ss-footer-sep" style={{ color:'rgba(255,255,255,0.15)', fontSize:14 }}>·</span>

          {/* Copyright */}
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.2)' }}>© {new Date().getFullYear()} SafeShift</span>

        </div>
      </div>
    </footer>
  );
}
