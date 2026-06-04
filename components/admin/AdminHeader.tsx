'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Bell, X, ShieldAlert, Zap, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/* ═══ Section search links ═══ */

const SECTION_LINKS: { label: string; href: string }[] = [
  { label: 'Overview', href: '/admin' },
  { label: 'Risk Map & Forecast', href: '/admin/risk-map' },
  { label: 'Trigger Events', href: '/admin/triggers' },
  { label: 'Policy Center', href: '/admin/policies' },
  { label: 'Claim Center', href: '/admin/claims' },
  { label: 'Billing Analytics', href: '/admin/billing' },
  { label: 'Fraud Center', href: '/admin/fraud-center' },
  { label: 'System Logs', href: '/admin/system-logs' },
  { label: 'API Health', href: '/admin/api-health' },
];

/* ═══ Notification types ═══ */

interface Notification {
  id: string;
  type: 'fraud' | 'trigger' | 'claim_paid' | 'claim_rejected' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const NOTIF_CONFIG = {
  fraud:          { icon: ShieldAlert,  color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  trigger:        { icon: Zap,          color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  claim_paid:     { icon: DollarSign,   color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
  claim_rejected: { icon: AlertTriangle, color: '#EC4899', bg: 'rgba(236,72,153,0.08)' },
  system:         { icon: CheckCircle,  color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
};

const F = "var(--font-inter),'Inter',sans-serif";
const M = "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace";

/* ═══ Component ═══ */

export default function AdminHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [clearedAt, setClearedAt] = useState<number>(0); // timestamp of last clear
  const inputRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim().length > 0
    ? SECTION_LINKS.filter(s => s.label.toLowerCase().includes(query.toLowerCase()))
    : [];

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus();
  }, [searchOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch notifications from DB
  const loadNotifications = useCallback(async () => {
    const supabase = createClient();
    const notifs: Notification[] = [];

    // 1. Flagged/rejected claims (fraud alerts)
    const { data: fraudClaims } = await supabase
      .from('parametric_claims')
      .select('id, status, fraud_score, is_flagged, flag_reason, created_at, profiles(full_name, city)')
      .or('is_flagged.eq.true,status.eq.rejected')
      .order('created_at', { ascending: false })
      .limit(10);

    for (const c of (fraudClaims || []) as unknown as Array<{ id: string; status: string; fraud_score: number; is_flagged: boolean; flag_reason: string | null; created_at: string; profiles: { full_name: string | null; city: string | null } | null }>) {
      const isRejected = c.status === 'rejected';
      notifs.push({
        id: `fraud-${c.id}`,
        type: isRejected ? 'claim_rejected' : 'fraud',
        title: isRejected ? 'Claim Auto-Rejected' : 'Fraud Flag Raised',
        message: `${c.profiles?.full_name || 'Driver'} in ${c.profiles?.city || '?'} — score ${(c.fraud_score * 100).toFixed(0)}%${c.flag_reason ? ': ' + c.flag_reason.slice(0, 60) : ''}`,
        time: c.created_at,
        read: false,
      });
    }

    // 2. Recent trigger events
    const { data: triggers } = await supabase
      .from('live_disruption_events')
      .select('id, event_type, city, severity_score, created_at')
      .order('created_at', { ascending: false })
      .limit(8);

    for (const t of (triggers || []) as unknown as Array<{ id: string; event_type: string; city: string; severity_score: number; created_at: string }>) {
      notifs.push({
        id: `trigger-${t.id}`,
        type: 'trigger',
        title: `Disruption: ${t.event_type.replace(/_/g, ' ')}`,
        message: `${t.city} — severity ${t.severity_score.toFixed(1)}`,
        time: t.created_at,
        read: false,
      });
    }

    // 3. Recent payouts
    const { data: payouts } = await supabase
      .from('payout_ledger')
      .select('id, amount_inr, status, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    for (const p of (payouts || []) as unknown as Array<{ id: string; amount_inr: number; status: string; created_at: string }>) {
      notifs.push({
        id: `payout-${p.id}`,
        type: 'claim_paid',
        title: 'Payout Completed',
        message: `₹${Number(p.amount_inr).toLocaleString()} disbursed via UPI`,
        time: p.created_at,
        read: false,
      });
    }

    // 4. System logs (errors only)
    const { data: sysLogs } = await supabase
      .from('system_logs')
      .select('id, event_type, severity, created_at')
      .eq('severity', 'error')
      .order('created_at', { ascending: false })
      .limit(5);

    for (const l of (sysLogs || []) as unknown as Array<{ id: string; event_type: string; severity: string; created_at: string }>) {
      notifs.push({
        id: `sys-${l.id}`,
        type: 'system',
        title: 'System Error',
        message: l.event_type,
        time: l.created_at,
        read: false,
      });
    }

    // Sort all by time, newest first. Filter out anything before clearedAt.
    notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const filtered = clearedAt > 0
      ? notifs.filter(n => new Date(n.time).getTime() > clearedAt)
      : notifs;
    setNotifications(filtered.slice(0, 20));
  }, [clearedAt]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // Poll every 30s
  useEffect(() => {
    const id = setInterval(loadNotifications, 30000);
    return () => clearInterval(id);
  }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  function markAllRead() {
    setReadIds(new Set(notifications.map(n => n.id)));
  }

  function clearAll() {
    setClearedAt(Date.now());
    setNotifications([]);
    setReadIds(new Set());
  }

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div
      style={{
        height: 56, background: '#FFFFFF', borderBottom: '1px solid #E8E8EA',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          {searchOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F6F7F9', borderRadius: 10, padding: '5px 12px', border: '1px solid #E8E8EA' }}>
              <Search size={15} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search sections..."
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#1A1A1A', width: 200, fontFamily: F }} />
              <button onClick={() => { setSearchOpen(false); setQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={14} style={{ color: '#9CA3AF' }} /></button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)}
              style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F7F9', border: '1px solid #E8E8EA', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EAECF0'; }} onMouseLeave={e => { e.currentTarget.style.background = '#F6F7F9'; }}>
              <Search size={16} style={{ color: '#6B7280' }} />
            </button>
          )}
          {searchOpen && filtered.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: '#fff', borderRadius: 12, border: '1px solid #E8E8EA', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 9999, width: 280, maxHeight: 300, overflowY: 'auto' }}>
              {filtered.map((item, i) => (
                <a key={`${item.label}-${i}`} href={item.href} onClick={() => { setSearchOpen(false); setQuery(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, color: '#1A1A1A', textDecoration: 'none', borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FFF3E8'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <Search size={12} style={{ color: '#F07820', flexShrink: 0 }} /><span>{item.label}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) loadNotifications(); }}
            style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: notifOpen ? '#F3F4F6' : '#F6F7F9', border: '1px solid #E8E8EA', cursor: 'pointer', position: 'relative', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EAECF0'; }} onMouseLeave={e => { if (!notifOpen) e.currentTarget.style.background = '#F6F7F9'; }}>
            <Bell size={16} style={{ color: '#6B7280' }} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '1.5px solid #fff', fontFamily: M }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: '#fff', borderRadius: 16, border: '1px solid #E8E8EA', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', zIndex: 9999, width: 380, maxHeight: 480, display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', fontFamily: F }}>Notifications</span>
                  {unreadCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#EF4444', color: '#fff', fontFamily: M }}>{unreadCount} new</span>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: 11, color: '#6366F1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: M }}>Mark all read</button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={clearAll} style={{ fontSize: 11, color: '#EF4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: M }}>Clear all</button>
                  )}
                </div>
              </div>

              {/* List */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifications.length === 0 && (
                  <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No notifications yet</div>
                )}
                {notifications.map((n) => {
                  const cfg = NOTIF_CONFIG[n.type];
                  const Icon = cfg.icon;
                  const isUnread = !readIds.has(n.id);
                  return (
                    <div
                      key={n.id}
                      onClick={() => setReadIds(prev => new Set([...prev, n.id]))}
                      style={{
                        padding: '12px 16px', borderBottom: '1px solid #F9FAFB', cursor: 'pointer',
                        background: isUnread ? 'rgba(99,102,241,0.03)' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isUnread ? 'rgba(99,102,241,0.03)' : 'transparent'; }}
                    >
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={15} style={{ color: cfg.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', fontFamily: F }}>{n.title}</span>
                            <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: M, flexShrink: 0, marginLeft: 8 }}>{timeAgo(n.time)}</span>
                          </div>
                          <p style={{ fontSize: 11, color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</p>
                        </div>
                        {isUnread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1', flexShrink: 0, marginTop: 4 }} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
                <a href="/admin/fraud-center" style={{ fontSize: 12, color: '#6366F1', fontWeight: 600, textDecoration: 'none', fontFamily: M }}>View Fraud Center →</a>
              </div>
            </div>
          )}
        </div>

        {/* Admin avatar */}
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #F97316, #FB923C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: F, cursor: 'pointer', border: '2px solid #FFF3E8' }}>A</div>
      </div>
    </div>
  );
}
