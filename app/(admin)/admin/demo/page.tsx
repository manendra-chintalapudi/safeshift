'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CITIES } from '@/lib/config/cities';
import { DISRUPTION_TYPES, TRIGGERS } from '@/lib/config/constants';
import { H3_RESOLUTION, RING_SIZE_BY_TYPE, disk, toCell } from '@/lib/utils/h3';
import type { DisruptionType } from '@/lib/config/constants';
import type { RiderPoint, EventOverlay } from '@/components/admin/ZoneH3Map';

const ZoneH3Map = dynamic(() => import('@/components/admin/ZoneH3Map'), { ssr: false });

const F = "var(--font-inter),'Inter',sans-serif";
const M = "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace";

const RECENT_ACTIVITY_MINUTES = 30;

interface ActivityRow {
  profile_id: string;
  latitude: number | null;
  longitude: number | null;
  h3_cell: string | null;
  status: string;
  recorded_at: string;
  profiles: { full_name: string | null } | null;
}

interface EventRow {
  id: string;
  event_type: string;
  center_h3_cell: string | null;
  h3_ring_size: number | null;
  severity_score: number;
  resolved_at: string | null;
}

interface TriggerResult {
  status: string;
  event_id?: string;
  claims_created?: number;
  payouts_completed?: number;
  message?: string;
  error?: string;
}

export default function AdminDemoPage() {
  const [city, setCity] = useState(CITIES[0].slug);
  const [eventType, setEventType] = useState<DisruptionType>(DISRUPTION_TYPES[0]);
  const [severity, setSeverity] = useState(7);
  const [triggerValue, setTriggerValue] = useState('');
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [ringSize, setRingSize] = useState<number>(RING_SIZE_BY_TYPE[DISRUPTION_TYPES[0]]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriggerResult | null>(null);

  const [riders, setRiders] = useState<RiderPoint[]>([]);
  const [events, setEvents] = useState<EventOverlay[]>([]);

  const triggerConfig = TRIGGERS[eventType];
  const cityMeta = useMemo(() => CITIES.find((c) => c.slug === city) ?? CITIES[0], [city]);
  const mapCenter: [number, number] = [cityMeta.latitude, cityMeta.longitude];

  // Load live riders + active events for the map
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const since = new Date(Date.now() - RECENT_ACTIVITY_MINUTES * 60 * 1000).toISOString();

    async function load() {
      const [logsRes, evtRes] = await Promise.all([
        supabase
          .from('driver_activity_logs')
          .select('profile_id, latitude, longitude, h3_cell, status, recorded_at, profiles(full_name)')
          .gte('recorded_at', since)
          .neq('status', 'offline')
          .order('recorded_at', { ascending: false })
          .limit(2000),
        supabase
          .from('live_disruption_events')
          .select('id, event_type, center_h3_cell, h3_ring_size, severity_score, resolved_at')
          .is('resolved_at', null)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (cancelled) return;

      const latest = new Map<string, ActivityRow>();
      for (const row of (logsRes.data as unknown as ActivityRow[]) || []) {
        if (!latest.has(row.profile_id)) latest.set(row.profile_id, row);
      }

      const points: RiderPoint[] = [];
      for (const row of latest.values()) {
        if (!row.h3_cell || row.latitude == null || row.longitude == null) continue;
        points.push({
          profile_id: row.profile_id,
          name: row.profiles?.full_name ?? null,
          lat: row.latitude,
          lng: row.longitude,
          status: row.status,
          h3_cell: row.h3_cell,
          recorded_at: row.recorded_at,
        });
      }

      const evs: EventOverlay[] = [];
      for (const row of (evtRes.data as unknown as EventRow[]) || []) {
        if (!row.center_h3_cell || row.h3_ring_size == null) continue;
        evs.push({
          id: row.id,
          event_type: row.event_type,
          center_h3_cell: row.center_h3_cell,
          h3_ring_size: row.h3_ring_size,
          severity_score: row.severity_score,
        });
      }
      setRiders(points);
      setEvents(evs);
    }

    load();
    return () => { cancelled = true; };
  }, [city, result?.event_id]);

  // When the user changes event type, snap ring size to the recommended default.
  useEffect(() => {
    setRingSize(RING_SIZE_BY_TYPE[eventType]);
  }, [eventType]);

  // Live preview of which hexes will be affected by the current pin + ring.
  const previewCells = useMemo(() => {
    const origin = pin ?? { lat: cityMeta.latitude, lng: cityMeta.longitude };
    return disk(toCell(origin.lat, origin.lng), ringSize);
  }, [pin, ringSize, cityMeta]);

  const previewRiders = useMemo(() => {
    if (!previewCells.length) return [];
    const set = new Set(previewCells);
    return riders.filter((r) => set.has(r.h3_cell));
  }, [previewCells, riders]);

  async function handleFire() {
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        city,
        event_type: eventType,
        severity,
        h3_ring_size: ringSize,
      };
      if (triggerValue) body.trigger_value = Number(triggerValue);
      if (pin) { body.zone_latitude = pin.lat; body.zone_longitude = pin.lng; }

      const res = await fetch('/api/admin/demo-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as TriggerResult;
      setResult(data);
    } catch (err) {
      setResult({ status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes fSlide { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .f-s { animation: fSlide 0.4s ease both; }
      `}</style>

      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: F }}>
          Demo Trigger Panel
        </h1>
        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
          Click anywhere on the map to drop a pin — the disruption fires at that exact H3 cell. Ring size controls how many hexes around the pin are affected.
        </p>
      </div>

      <div className="f-s grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,380px)] gap-4">
        {/* Left: map */}
        <div>
          <ZoneH3Map
            center={mapCenter}
            zoom={11}
            riders={riders}
            events={events}
            pin={pin}
            previewCells={previewCells}
            onPin={(lat, lng) => setPin({ lat, lng })}
            resolutionLabel={`H3 res-${H3_RESOLUTION} · click to drop pin`}
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: '#6B7280' }}>
              {pin
                ? <>Pin: <span style={{ fontFamily: M, color: '#1A1A1A' }}>{pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</span> — <span style={{ fontFamily: M, color: '#9A3412' }}>{toCell(pin.lat, pin.lng)}</span></>
                : <>No pin dropped — disruption will fire at the city centroid.</>}
            </span>
            {pin && (
              <button
                onClick={() => setPin(null)}
                style={{ fontSize: 11, fontFamily: M, border: '1px solid #E8E8EA', padding: '3px 10px', borderRadius: 8, background: '#fff', color: '#6B7280', cursor: 'pointer' }}
              >
                Clear pin
              </button>
            )}
          </div>
        </div>

        {/* Right: controls */}
        <div className="space-y-4">
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E8EA', padding: 18 }} className="space-y-4">
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A', fontFamily: M, display: 'block', marginBottom: 4 }}>City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid #E8E8EA' }}
              >
                {CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.state})</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A', fontFamily: M, display: 'block', marginBottom: 4 }}>Disruption Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as DisruptionType)}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid #E8E8EA' }}
              >
                {DISRUPTION_TYPES.map((dt) => <option key={dt} value={dt}>{TRIGGERS[dt].label}</option>)}
              </select>
              <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{triggerConfig.description}</p>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A', fontFamily: M, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Ring size</span>
                <span style={{ color: '#F97316', fontWeight: 800 }}>{ringSize} hops · ~{(ringSize * 0.92).toFixed(1)} km</span>
              </label>
              <input type="range" min={1} max={20} step={1} value={ringSize} onChange={(e) => setRingSize(Number(e.target.value))} className="w-full" style={{ accentColor: '#F97316' }} />
              <div style={{ fontSize: 9, color: '#9CA3AF', fontFamily: M, marginTop: 2 }}>
                default for {eventType.replace(/_/g, ' ')}: {RING_SIZE_BY_TYPE[eventType]} · {previewCells.length} cells · {previewRiders.length} riders in range
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A', fontFamily: M, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Severity</span>
                <span style={{ color: '#6366F1', fontWeight: 800 }}>{severity.toFixed(1)}</span>
              </label>
              <input type="range" min={0} max={10} step={0.1} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="w-full" style={{ accentColor: '#6366F1' }} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A', fontFamily: M, display: 'block', marginBottom: 4 }}>
                Trigger value ({triggerConfig.unit})
              </label>
              <input
                type="number"
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
                placeholder={`Threshold: ${triggerConfig.threshold}`}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid #E8E8EA' }}
              />
              <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                Leave empty for {triggerConfig.threshold * 1.5} {triggerConfig.unit}
              </p>
            </div>

            <button
              onClick={handleFire}
              disabled={loading}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#E5E7EB' : 'linear-gradient(135deg, #dc2626, #F97316)',
                color: '#fff', transition: 'all 0.2s',
              }}
            >
              {loading ? 'Firing…' : pin ? `Fire at pin · ${previewRiders.length} eligible rider(s)` : 'Fire at city centroid'}
            </button>
          </div>

          {result && (
            <div
              className="rounded-xl p-4"
              style={
                result.error
                  ? { background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)' }
                  : { background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.3)' }
              }
            >
              {result.error ? (
                <div style={{ color: '#dc2626' }}>
                  <div style={{ fontWeight: 700 }}>Error</div>
                  <div style={{ fontSize: 12 }}>{result.error}</div>
                </div>
              ) : (
                <div style={{ color: '#16A34A' }}>
                  <div style={{ fontWeight: 700 }}>Trigger fired</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>{result.message}</div>
                  {result.event_id && (
                    <div style={{ fontFamily: M, fontSize: 11, marginTop: 4, color: '#15803D' }}>event: {result.event_id}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
