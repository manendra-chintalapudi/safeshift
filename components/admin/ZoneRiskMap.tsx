'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ---------------------------------------------------------------------------
// Fix Leaflet default icon paths (webpack/Next.js asset issue)
// ---------------------------------------------------------------------------

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Zone {
  zone_id: string;
  name: string;
  lat: number;
  lng: number;
  risk_score: number;
  risk_factors: string[];
}

interface ZoneRiskMapProps {
  zones: Zone[];
  cityLat: number;
  cityLng: number;
  cityName: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function zoneColor(risk: number): string {
  if (risk > 0.7) return '#ef4444';
  if (risk >= 0.4) return '#f59e0b';
  return '#22c55e';
}

function riskLabel(risk: number): string {
  if (risk > 0.7) return 'Disrupted';
  if (risk >= 0.4) return 'Watch';
  return 'Safe';
}

// ---------------------------------------------------------------------------
// Auto-fit bounds helper component
// ---------------------------------------------------------------------------

function FitBounds({ zones, cityLat, cityLng }: { zones: Zone[]; cityLat: number; cityLng: number }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    // Reset on each new props change so we re-fit
    fitted.current = false;
  }, [zones, cityLat, cityLng]);

  useEffect(() => {
    if (fitted.current) return;
    fitted.current = true;

    if (zones.length > 0) {
      const points: L.LatLngExpression[] = zones.map((z) => [z.lat, z.lng]);
      points.push([cityLat, cityLng]);
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    } else {
      map.setView([cityLat, cityLng], 12);
    }
  }, [map, zones, cityLat, cityLng]);

  return null;
}

// ---------------------------------------------------------------------------
// Legend overlay
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 1000,
        background: '#ffffff',
        border: '1px solid #E8E8EA',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        fontFamily: 'var(--font-mono, monospace)',
        lineHeight: 1.8,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, color: '#1A1A1A' }}>Risk Level</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
        <span style={{ color: '#6B7280' }}>Safe</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
        <span style={{ color: '#6B7280' }}>Watch</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
        <span style={{ color: '#6B7280' }}>Disrupted</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ZoneRiskMap({ zones, cityLat, cityLng, cityName }: ZoneRiskMapProps) {
  return (
    <div style={{ position: 'relative', height: 400, width: '100%', borderRadius: 16, overflow: 'hidden' }}>
      <MapContainer
        center={[cityLat, cityLng]}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* City center marker */}
        <Marker position={[cityLat, cityLng]}>
          <Popup>
            <strong>{cityName}</strong>
            <br />
            City Center
          </Popup>
        </Marker>

        {/* Zone risk circle markers */}
        {zones.map((z) => {
          const color = zoneColor(z.risk_score);
          return (
            <CircleMarker
              key={z.zone_id}
              center={[z.lat, z.lng]}
              radius={20}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.4,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{z.name}</div>
                  <div>
                    Risk: <strong style={{ color }}>{(z.risk_score * 100).toFixed(0)}%</strong>{' '}
                    <span style={{ color: '#6B7280' }}>({riskLabel(z.risk_score)})</span>
                  </div>
                  {z.risk_factors.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {z.risk_factors.map((f) => (
                        <span
                          key={f}
                          style={{
                            display: 'inline-block',
                            background: '#f3f4f6',
                            borderRadius: 4,
                            padding: '1px 6px',
                            margin: '2px 2px 0 0',
                            fontSize: 11,
                          }}
                        >
                          {f.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        <FitBounds zones={zones} cityLat={cityLat} cityLng={cityLng} />
      </MapContainer>

      {/* Legend overlay */}
      <Legend />
    </div>
  );
}
