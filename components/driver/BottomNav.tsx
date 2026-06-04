'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  motion, useMotionValue, useSpring, useTransform, AnimatePresence,
} from 'framer-motion';
import { Home, Shield, FileText, User, Sparkles, type LucideIcon } from 'lucide-react';

// ─── All 5 nav items (AI is index 2) ────────────────────────────────────────
const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard',         label: 'Home',    icon: Home },
  { href: '/dashboard/policy',  label: 'Policy',  icon: Shield },
  { href: '/dashboard/ai',      label: 'AI',      icon: Sparkles },
  { href: '/dashboard/claims',  label: 'Claims',  icon: FileText },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

const F        = "var(--font-inter),'Inter',sans-serif";
const CIRCLE_D = 52;
const CIRCLE_R = CIRCLE_D / 2;
const BAR_VIS  = 64;
const DIP_D    = 38;
const DIP_HW   = 40;
const PAD_TOP  = CIRCLE_R - 14;
const SVG_H    = PAD_TOP + BAR_VIS;
const BAR_Y    = PAD_TOP;

// ─── SVG path — flat bar with smooth concave dip ────────────────────────────
function barPath(w: number, cx: number): string {
  const t  = BAR_Y;
  const d  = DIP_D;
  const hw = DIP_HW;
  const h  = SVG_H;
  const x  = Math.max(hw + 4, Math.min(w - hw - 4, cx));

  return [
    `M 0,${t}`,
    `H ${x - hw}`,
    `C ${x - hw},${t + d * 0.05} ${x - hw * 0.58},${t + d} ${x},${t + d}`,
    `C ${x + hw * 0.58},${t + d} ${x + hw},${t + d * 0.05} ${x + hw},${t}`,
    `H ${w}`,
    `V ${h}`,
    `H 0`,
    `Z`,
  ].join(' ');
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function BottomNav() {
  const pathname   = usePathname();
  const boxRef     = useRef<HTMLDivElement>(null);
  const itemEls    = useRef<(HTMLElement | null)[]>([]);
  const [xs, setXs]       = useState<number[]>([]);
  const [w, setW]         = useState(400);
  const [ready, setReady] = useState(false);

  // Active index across all 5 items (0-4), -1 if no match
  const activeIdx = NAV_ITEMS.findIndex(
    (t) => pathname === t.href || (t.href !== '/dashboard' && pathname.startsWith(t.href)),
  );

  // ── Measure positions ─────────────────────────────────────────────────────
  const measure = useCallback(() => {
    if (!boxRef.current) return;
    const br = boxRef.current.getBoundingClientRect();
    setW(br.width);
    setXs(itemEls.current.map((el) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2 - br.left;
    }));
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => { measure(); setReady(true); }));
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // ── Spring ────────────────────────────────────────────────────────────────
  const fallback = w / 2;
  const targetX  = (activeIdx >= 0 && xs[activeIdx] > 0) ? xs[activeIdx] : fallback;
  const rawX     = useMotionValue(targetX);
  const springX  = useSpring(rawX, { stiffness: 280, damping: 26, mass: 0.9 });

  useEffect(() => { rawX.set(targetX); }, [targetX, rawX]);

  const pathD = useTransform(springX, (cx) => barPath(w, cx));
  const show  = ready && activeIdx >= 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0" style={{ zIndex: 100 }}>
      <div
        ref={boxRef}
        style={{
          position: 'relative',
          maxWidth: 440,
          margin: '0 auto',
          height: SVG_H,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* ══════ SVG bar shape ══════ */}
        <svg
          width={w} height={SVG_H}
          style={{
            position: 'absolute', top: 0, left: 0,
            filter: 'drop-shadow(0 -4px 14px rgba(0,0,0,0.10))',
            overflow: 'visible',
          }}
        >
          <defs>
            <filter id="nav-goo" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feColorMatrix in="blur" mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
                result="goo" />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>

          <g filter="url(#nav-goo)">
            <motion.path d={pathD} fill="#F07820" />
            {show && (
              <motion.circle
                cy={BAR_Y - 2}
                r={CIRCLE_R}
                fill="#FFFFFF"
                style={{ cx: springX }}
              />
            )}
          </g>

          {/* Top stroke for visibility */}
        </svg>

        {/* ══════ Floating circle border + active icon ══════ */}
        {show && (
          <motion.div
            style={{
              position: 'absolute',
              width: CIRCLE_D,
              height: CIRCLE_D,
              borderRadius: '50%',
              border: '2.5px solid #D96A10',
              background: '#F07820',
              boxShadow: '0 2px 12px rgba(240,120,32,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 5,
              top: BAR_Y - CIRCLE_R - 1,
              left: -CIRCLE_R,
              x: springX,
              willChange: 'transform',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {activeIdx === 2
                  ? <img src="/logo.png" alt="SafeShift" width={52} height={52} style={{ borderRadius: 4, filter: 'brightness(0) invert(1)' }} />
                  : (() => { const I = NAV_ITEMS[activeIdx].icon; return <I size={22} color="#ffffff" strokeWidth={2.2} />; })()
                }
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* ══════ Hit targets ══════ */}
        <div style={{
          position: 'absolute', top: PAD_TOP, left: 0, right: 0,
          height: BAR_VIS,
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '0 6px',
          zIndex: 4,
        }}>
          {NAV_ITEMS.map((item, i) => {
            const active = i === activeIdx;
            const Icon = item.icon;
            const isAI = i === 2;

            return (
              <Link
                key={item.href}
                ref={(el) => { itemEls.current[i] = el; }}
                href={item.href}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 3,
                  padding: isAI ? '6px 10px' : '6px 14px',
                  minWidth: isAI ? 48 : 54, minHeight: 48,
                  textDecoration: 'none', position: 'relative',
                }}
              >
                <motion.div
                  animate={{ opacity: active ? 0 : 1, scale: active ? 0.4 : 1, y: active ? -6 : 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {isAI
                    ? <img src="/logo.png" alt="SafeShift" width={46} height={46} style={{ borderRadius: 4, filter: 'brightness(0) invert(1)' }} />
                    : <Icon size={22} color="#ffffff" strokeWidth={1.5} />
                  }
                </motion.div>
                <motion.span
                  style={{ fontSize: 11, fontWeight: 500, color: '#ffffff', fontFamily: F }}
                  animate={{ opacity: active ? 0 : 1, y: active ? -4 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {item.label}
                </motion.span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
