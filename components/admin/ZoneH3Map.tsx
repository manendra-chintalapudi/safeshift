'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { cellCenter, cellPolygon, disk, toCell } from '@/lib/utils/h3';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RiderPoint {
  profile_id: string;
  name: string | null;
  lat: number;
  lng: number;
  status: string;              // online / searching / on_trip / offline
  h3_cell: string;
  recorded_at: string;
}

export interface EventOverlay {
  id: string;
  event_type: string;
  center_h3_cell: string;
  h3_ring_size: number;
  severity_score: number;
}

interface Props {
  center: [number, number];
  zoom?: number;
  riders: RiderPoint[];
  events: EventOverlay[];
  /** Enable click-to-drop-pin mode (for the demo trigger). */
  onPin?: (lat: number, lng: number) => void;
  /** Currently-placed pin for the demo trigger. */
  pin?: { lat: number; lng: number } | null;
  /** Highlight these cells as the simulated disruption footprint. */
  previewCells?: string[];
  /** Resolution label shown in the legend. */
  resolutionLabel?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cellDensityColor(count: number, max: number): string {
  // Empty cells drawn separately (thin, grey); this only colors populated cells.
  if (max <= 0) return '#E5E7EB';
  const t = Math.min(1, count / max);
  // Lerp from light indigo → deep indigo → magenta
  if (t < 0.5) {
    const u = t * 2;
    // indigo-100 → indigo-500
    return lerpHex('#E0E7FF', '#6366F1', u);
  }
  const u = (t - 0.5) * 2;
  // indigo-500 → fuchsia-600
  return lerpHex('#6366F1', '#C026D3', u);
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function statusColor(status: string): string {
  if (status === 'on_trip') return '#22C55E';
  if (status === 'online' || status === 'searching') return '#3B82F6';
  return '#9CA3AF';
}

// Child component so useMapEvents has a MapContainer ancestor.
function PinDropper({ onPin }: { onPin?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onPin) onPin(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ZoneH3Map({
  center,
  zoom = 11,
  riders,
  events,
  onPin,
  pin,
  previewCells,
  resolutionLabel,
}: Props) {
  // (dynamic(..., { ssr: false }) at the import site already handles SSR —
  // adding another mount guard here double-mounts the MapContainer under
  // React 18 Strict Mode and breaks Leaflet's internal refs.)

  // Compute per-cell rider density from incoming points.
  const densityByCell = useMemo(() => {
    const m = new Map<string, RiderPoint[]>();
    for (const r of riders) {
      const arr = m.get(r.h3_cell);
      if (arr) arr.push(r);
      else m.set(r.h3_cell, [r]);
    }
    return m;
  }, [riders]);

  const maxDensity = useMemo(() => {
    let max = 0;
    for (const arr of densityByCell.values()) if (arr.length > max) max = arr.length;
    return max;
  }, [densityByCell]);

  // Union of all "affected" cells from live events (for stroke highlight).
  const affectedByEvent = useMemo(() => {
    return events.map((e) => ({ event: e, cells: new Set(disk(e.center_h3_cell, e.h3_ring_size)) }));
  }, [events]);

  const previewCellSet = useMemo(() => new Set(previewCells ?? []), [previewCells]);

  return (
    <div style={{ position: 'relative', width: '100%', height: 520, borderRadius: 16, overflow: 'hidden', border: '1px solid #E8E8EA' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onPin && <PinDropper onPin={onPin} />}

        {/* Rider-density hexagons */}
        {[...densityByCell.entries()].map(([cell, arr]) => {
          const color = cellDensityColor(arr.length, maxDensity);
          return (
            <Polygon
              key={`density-${cell}`}
              positions={cellPolygon(cell)}
              pathOptions={{
                color: color,
                weight: 1.2,
                fillOpacity: 0.55,
                fillColor: color,
              }}
            >
              <Tooltip direction="top" sticky>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                  <div style={{ fontWeight: 700 }}>{arr.length} rider{arr.length === 1 ? '' : 's'} active</div>
                  <div style={{ color: '#6B7280', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, marginTop: 2 }}>{cell}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>
                    {arr.slice(0, 4).map((r) => (
                      <div key={r.profile_id}>• {r.name ?? 'Unknown'} — <span style={{ color: statusColor(r.status) }}>{r.status}</span></div>
                    ))}
                    {arr.length > 4 && <div>+{arr.length - 4} more</div>}
                  </div>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        {/* Affected-zone hexagons (outline on top) */}
        {affectedByEvent.map(({ event, cells }) =>
          [...cells].map((cell) => (
            <Polygon
              key={`affected-${event.id}-${cell}`}
              positions={cellPolygon(cell)}
              pathOptions={{
                color: '#EF4444',
                weight: 2,
                opacity: 0.85,
                fill: false,
                dashArray: '4 3',
              }}
            />
          ))
        )}

        {/* Event centers */}
        {events.map((e) => {
          const [lat, lng] = cellCenter(e.center_h3_cell);
          return (
            <CircleMarker
              key={`center-${e.id}`}
              center={[lat, lng]}
              radius={9}
              pathOptions={{ color: '#EF4444', weight: 2, fillColor: '#FEE2E2', fillOpacity: 1 }}
            >
              <Tooltip direction="top" offset={[0, -8]} sticky>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#B91C1C' }}>{e.event_type.replace(/_/g, ' ')}</div>
                  <div style={{ color: '#6B7280' }}>severity {e.severity_score.toFixed(1)} · ring {e.h3_ring_size}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Preview-only cells for the pin-drop trigger */}
        {previewCellSet.size > 0 &&
          [...previewCellSet].map((cell) => (
            <Polygon
              key={`preview-${cell}`}
              positions={cellPolygon(cell)}
              pathOptions={{
                color: '#F97316',
                weight: 2,
                opacity: 0.9,
                fillOpacity: 0.18,
                fillColor: '#FDBA74',
              }}
            />
          ))}

        {/* Drop-pin marker */}
        {pin && (
          <CircleMarker
            center={[pin.lat, pin.lng]}
            radius={8}
            pathOptions={{ color: '#F97316', weight: 2, fillColor: '#F97316', fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -6]} permanent>
              <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#9A3412' }}>
                {toCell(pin.lat, pin.lng)}
              </div>
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid #E8E8EA',
          borderRadius: 10,
          padding: '8px 10px',
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          zIndex: 500,
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>Legend</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, background: '#E0E7FF', border: '1px solid #C7D2FE', borderRadius: 2 }} />
          <span style={{ color: '#6B7280' }}>few riders</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, background: '#C026D3', borderRadius: 2 }} />
          <span style={{ color: '#6B7280' }}>many riders</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, border: '2px dashed #EF4444', borderRadius: 2 }} />
          <span style={{ color: '#6B7280' }}>disruption zone</span>
        </div>
        {resolutionLabel && (
          <div style={{ color: '#9CA3AF', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, marginTop: 4 }}>
            {resolutionLabel}
          </div>
        )}
      </div>
    </div>
  );
}
