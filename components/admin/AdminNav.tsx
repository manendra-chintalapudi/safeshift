'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Map, Zap, Shield, FileText, DollarSign, LogOut, ScrollText, HeartPulse, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/risk-map', label: 'Risk Map & Forecast', icon: Map },
  { href: '/admin/triggers', label: 'Triggers', icon: Zap },
  { href: '/admin/policies', label: 'Policy Center', icon: Shield },
  { href: '/admin/claims', label: 'Claim Center', icon: FileText },
  { href: '/admin/billing', label: 'Billing Center', icon: DollarSign },
  { href: '/admin/fraud-center', label: 'Fraud Center', icon: ShieldAlert },
  { href: '/admin/system-logs', label: 'System Logs', icon: ScrollText },
  { href: '/admin/api-health', label: 'API Health', icon: HeartPulse },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <aside
      className="w-64 fixed left-0 flex flex-col"
      style={{
        top: 0,
        bottom: 0,
        background: '#111111',
        zIndex: 110,
      }}
    >
      {/* Logo + Title — same height as top bar (56px) */}
      <div style={{ height: 56, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/logo.png"
            alt="SafeShift"
            style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }}
          />
          <div>
            <h1
              style={{
                fontFamily: "var(--font-inter),'Inter',sans-serif",
                fontSize: 15, fontWeight: 800, color: '#FFFFFF',
                letterSpacing: '-0.03em', lineHeight: 1.2, margin: 0,
              }}
            >
              SafeShift Admin
            </h1>
            <p
              style={{
                fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
                fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0, marginTop: 1,
              }}
            >
              Insurance Management
            </p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="p-2 space-y-1 flex-1 overflow-y-auto" style={{ paddingTop: 8 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
              style={
                isActive
                  ? {
                      background: '#F07820',
                      color: '#FFFFFF',
                      fontWeight: 700,
                    }
                  : {
                      color: 'rgba(255,255,255,0.6)',
                      fontWeight: 500,
                    }
              }
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon className="h-4 w-4" style={{ color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.45)' }} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Admin + logout icon */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: '#F07820',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12, fontWeight: 700,
                fontFamily: "var(--font-inter),'Inter',sans-serif",
              }}
            >
              A
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: "var(--font-inter),'Inter',sans-serif" }}>
              Admin
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(240,120,32,0.15)'; e.currentTarget.style.borderColor = '#F07820'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            <LogOut size={14} style={{ color: '#F07820' }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
