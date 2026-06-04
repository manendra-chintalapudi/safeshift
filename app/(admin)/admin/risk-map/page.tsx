'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CITIES, type City } from '@/lib/config/cities';
import { MapPin, Droplets, Wind, Thermometer, AlertTriangle, ShieldCheck, CloudRain, Sun, Cloud, CloudLightning, CloudDrizzle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Dynamic import for Leaflet map
// ---------------------------------------------------------------------------

const ZoneRiskMap = dynamic(() => import('@/components/admin/ZoneRiskMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 420, background: 'linear-gradient(135deg, #ede9fe, #e0f2fe)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2.5px solid #E8E8EA', borderTopColor: '#8B5CF6' }} />
        <span style={{ fontSize: 13, color: '#6B7280' }}>Loading map...</span>
      </div>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Zone { zone_id: string; name: string; lat: number; lng: number; risk_score: number; risk_factors: string[]; }
interface ZonesResponse { city: string; total_zones: number; zones: Zone[]; }
interface ForecastDay { date: string; dayLabel: string; tempMax: number; tempMin: number; rain: number; windMax: number; }
interface CityRiskWeights { rainfall: number; wind: number; aqi: number; }

const CITY_WEIGHTS: Record<string, CityRiskWeights> = {
  mumbai: { rainfall: 0.50, wind: 0.20, aqi: 0.30 }, delhi: { rainfall: 0.20, wind: 0.10, aqi: 0.70 },
  bangalore: { rainfall: 0.50, wind: 0.15, aqi: 0.35 }, chennai: { rainfall: 0.35, wind: 0.40, aqi: 0.25 },
  pune: { rainfall: 0.50, wind: 0.15, aqi: 0.35 }, hyderabad: { rainfall: 0.40, wind: 0.25, aqi: 0.35 },
  kolkata: { rainfall: 0.40, wind: 0.30, aqi: 0.30 }, ahmedabad: { rainfall: 0.30, wind: 0.30, aqi: 0.40 },
  jaipur: { rainfall: 0.20, wind: 0.15, aqi: 0.65 }, lucknow: { rainfall: 0.25, wind: 0.10, aqi: 0.65 },
};

// ---------------------------------------------------------------------------
// Neon palette & card gradients
// ---------------------------------------------------------------------------

const NEON = { purple: '#8B5CF6', blue: '#3B82F6', cyan: '#06B6D4', green: '#22C55E', yellow: '#FACC15', orange: '#F97316', pink: '#EC4899', red: '#F87171', indigo: '#6366F1', violet: '#A78BFA', teal: '#14B8A6', lime: '#84CC16' };

const ZONE_CARD_STYLES = [
  { gradient: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', border: '#8B5CF6', glow: 'rgba(139,92,246,0.15)' },
  { gradient: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', border: '#3B82F6', glow: 'rgba(59,130,246,0.15)' },
  { gradient: 'linear-gradient(135deg, #fce7f3, #fbcfe8)', border: '#EC4899', glow: 'rgba(236,72,153,0.15)' },
  { gradient: 'linear-gradient(135deg, #ccfbf1, #99f6e4)', border: '#14B8A6', glow: 'rgba(20,184,166,0.15)' },
  { gradient: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#F59E0B', glow: 'rgba(245,158,11,0.15)' },
  { gradient: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', border: '#6366F1', glow: 'rgba(99,102,241,0.15)' },
  { gradient: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '#22C55E', glow: 'rgba(34,197,94,0.15)' },
  { gradient: 'linear-gradient(135deg, #fee2e2, #fecaca)', border: '#F87171', glow: 'rgba(248,113,113,0.15)' },
  { gradient: 'linear-gradient(135deg, #cffafe, #a5f3fc)', border: '#06B6D4', glow: 'rgba(6,182,212,0.15)' },
  { gradient: 'linear-gradient(135deg, #fef9c3, #fef08a)', border: '#FACC15', glow: 'rgba(250,204,21,0.15)' },
];

const FORECAST_GRADIENTS = [
  'linear-gradient(135deg, #6366F1, #8B5CF6)',
  'linear-gradient(135deg, #3B82F6, #06B6D4)',
  'linear-gradient(135deg, #14B8A6, #22C55E)',
  'linear-gradient(135deg, #F97316, #FACC15)',
  'linear-gradient(135deg, #EC4899, #A78BFA)',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const F = "var(--font-inter),'Inter',sans-serif";
const M = "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace";

function riskColor(score: number): string {
  if (score > 0.7) return NEON.red;
  if (score > 0.4) return NEON.yellow;
  return NEON.green;
}

function riskLabel(score: number): 'SAFE' | 'WATCH' | 'DISRUPTED' {
  if (score > 0.7) return 'DISRUPTED';
  if (score > 0.4) return 'WATCH';
  return 'SAFE';
}

function statusBadgeStyle(s: 'SAFE' | 'WATCH' | 'DISRUPTED'): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    SAFE: { background: 'rgba(34,197,94,0.15)', color: '#16a34a', border: '1px solid #22C55E' },
    WATCH: { background: 'rgba(250,204,21,0.15)', color: '#a16207', border: '1px solid #FACC15' },
    DISRUPTED: { background: 'rgba(248,113,113,0.15)', color: '#dc2626', border: '1px solid #F87171' },
  };
  return map[s];
}

function dayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Weather icon component based on conditions
function WeatherIcon({ rain, wind, size = 36 }: { rain: number; wind: number; size?: number }) {
  if (rain > 20 || wind > 50) return <CloudLightning size={size} />;
  if (rain > 10) return <CloudRain size={size} />;
  if (rain > 2) return <CloudDrizzle size={size} />;
  if (rain > 0.5) return <Cloud size={size} />;
  return <Sun size={size} />;
}

function weatherGradient(rain: number, wind: number): string {
  if (rain > 20 || wind > 50) return 'linear-gradient(135deg, #1e1b4b, #312e81)';
  if (rain > 10) return 'linear-gradient(135deg, #1e3a5f, #0c4a6e)';
  if (rain > 2) return 'linear-gradient(135deg, #475569, #64748b)';
  if (rain > 0.5) return 'linear-gradient(135deg, #6366F1, #8B5CF6)';
  return 'linear-gradient(135deg, #F97316, #FACC15)';
}

// ---------------------------------------------------------------------------
// Area chart SVG for risk weights
// ---------------------------------------------------------------------------

function RiskAreaChart({ weights }: { weights: CityRiskWeights }) {
  const W = 360, H = 140;
  const categories = ['Rainfall', 'Wind', 'AQI'];
  const values = [weights.rainfall, weights.wind, weights.aqi];
  const colors = [NEON.blue, NEON.cyan, NEON.purple];
  const max = 1;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        {colors.map((c, i) => (
          <linearGradient key={i} id={`area-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.4" />
            <stop offset="100%" stopColor={c} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(v => (
        <line key={v} x1={40} y1={H - 20 - (v / max) * (H - 40)} x2={W - 10} y2={H - 20 - (v / max) * (H - 40)} stroke="#E8E8EA" strokeWidth="1" strokeDasharray="4 4" />
      ))}
      {/* Bars as filled area-style shapes */}
      {values.map((v, i) => {
        const barW = 60;
        const gap = (W - 80 - barW * 3) / 2;
        const x = 50 + i * (barW + gap);
        const barH = (v / max) * (H - 40);
        const y = H - 20 - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={8} fill={`url(#area-grad-${i})`} stroke={colors[i]} strokeWidth="2" />
            <text x={x + barW / 2} y={y - 8} textAnchor="middle" fill={colors[i]} fontSize="13" fontWeight="700" fontFamily={M}>
              {(v * 100).toFixed(0)}%
            </text>
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fill="#6B7280" fontSize="11" fontFamily={M}>
              {categories[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function Tooltip({ x, y, content, visible }: { x: number; y: number; content: string[]; visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', left: x + 14, top: y - 8, background: 'linear-gradient(135deg, #1e1b4b, #312e81)', color: '#fff', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontFamily: M, lineHeight: 1.7, zIndex: 9999, pointerEvents: 'none', boxShadow: '0 8px 32px rgba(99,102,241,0.3)', border: '1px solid rgba(139,92,246,0.3)', whiteSpace: 'nowrap' }}>
      {content.map((line, i) => <div key={i}>{line}</div>)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RiskMapPage() {
  const [selectedCity, setSelectedCity] = useState<City>(CITIES[0]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [zoneError, setZoneError] = useState('');
  const [animKey, setAnimKey] = useState(0);

  const [tip, setTip] = useState<{ x: number; y: number; content: string[]; visible: boolean }>({ x: 0, y: 0, content: [], visible: false });
  function showTip(e: React.MouseEvent, content: string[]) { setTip({ x: e.clientX, y: e.clientY, content, visible: true }); }
  function moveTip(e: React.MouseEvent) { setTip(prev => ({ ...prev, x: e.clientX, y: e.clientY })); }
  function hideTip() { setTip(prev => ({ ...prev, visible: false })); }

  const ML_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8001';

  const fetchZones = useCallback(async (city: City) => {
    setLoadingZones(true); setZoneError('');
    try {
      const res = await fetch(`${ML_URL}/zones/${city.slug}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ZonesResponse = await res.json();
      setZones(data.zones);
    } catch { setZoneError('ML service unavailable — showing static zone data'); setZones([]); }
    finally { setLoadingZones(false); }
  }, [ML_URL]);

  const fetchForecast = useCallback(async (city: City) => {
    setLoadingForecast(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=Asia/Kolkata&forecast_days=5`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setForecast(data.daily.time.map((t: string, i: number) => ({
        date: t, dayLabel: dayName(t), tempMax: data.daily.temperature_2m_max[i], tempMin: data.daily.temperature_2m_min[i],
        rain: data.daily.precipitation_sum[i], windMax: data.daily.wind_speed_10m_max[i],
      })));
    } catch { setForecast([]); }
    finally { setLoadingForecast(false); }
  }, []);

  function selectCity(c: City) {
    setSelectedCity(c);
    setAnimKey(prev => prev + 1);
  }

  useEffect(() => { fetchZones(selectedCity); fetchForecast(selectedCity); }, [selectedCity, fetchZones, fetchForecast]);

  const avgRisk = zones.length > 0 ? zones.reduce((s, z) => s + z.risk_score, 0) / zones.length : 0;
  const cityWeights = CITY_WEIGHTS[selectedCity.slug] ?? { rainfall: 0.33, wind: 0.33, aqi: 0.34 };
  const dominantTypes: string[] = [];
  if (cityWeights.rainfall >= 0.4) dominantTypes.push('Heavy Rainfall / Flood');
  if (cityWeights.aqi >= 0.5) dominantTypes.push('AQI / GRAP-IV');
  if (cityWeights.wind >= 0.3) dominantTypes.push('Cyclone / High Wind');
  if (selectedCity.cyclone_prone) dominantTypes.push('Cyclone exposure');
  if (dominantTypes.length === 0) dominantTypes.push('Balanced risk profile');

  return (
    <div className="space-y-6" key={animKey}>
      <style>{`
        @keyframes riskSlideIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes riskFadeScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes weatherBob { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-4px) } }
        @keyframes rainDrop { 0% { opacity:1; transform:translateY(0) } 100% { opacity:0; transform:translateY(12px) } }
        @keyframes sunRotate { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        .risk-slide { animation: riskSlideIn 0.5s ease both; }
        .risk-slide-1 { animation-delay: 0.05s; }
        .risk-slide-2 { animation-delay: 0.1s; }
        .risk-slide-3 { animation-delay: 0.15s; }
        .risk-slide-4 { animation-delay: 0.2s; }
        .risk-fade { animation: riskFadeScale 0.6s ease both; }
        .weather-bob { animation: weatherBob 3s ease-in-out infinite; }
        .sun-spin { animation: sunRotate 20s linear infinite; }
      `}</style>

      <Tooltip x={tip.x} y={tip.y} content={tip.content} visible={tip.visible} />

      {/* ══════════════════════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════════════════════ */}
      <div className="risk-slide flex items-end justify-between">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', fontFamily: F }}>
            Risk Map & Forecast
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4, fontFamily: M }}>
            Real-time zone monitoring &middot; {CITIES.length} cities &middot; ML-powered risk scoring
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={16} style={{ color: NEON.purple }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: NEON.purple, fontFamily: F }}>{selectedCity.name}, {selectedCity.state}</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CITY SELECTOR — animated pill buttons
      ══════════════════════════════════════════════════════════════ */}
      <div className="risk-slide risk-slide-1 rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 10, fontFamily: M }}>
          Select City
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CITIES.map((c) => {
            const isActive = c.slug === selectedCity.slug;
            return (
              <button
                key={c.slug}
                onClick={() => selectCity(c)}
                style={{
                  padding: '8px 18px', borderRadius: 24, fontSize: 13, fontWeight: isActive ? 700 : 500,
                  border: isActive ? 'none' : '1.5px solid #E8E8EA',
                  background: isActive ? 'linear-gradient(135deg, #8B5CF6, #3B82F6)' : '#fff',
                  color: isActive ? '#fff' : '#4B5563',
                  cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: isActive ? '0 4px 16px rgba(99,102,241,0.3)' : 'none',
                  fontFamily: F,
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.color = '#8B5CF6'; e.currentTarget.style.transform = 'scale(1.03)'; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.borderColor = '#E8E8EA'; e.currentTarget.style.color = '#4B5563'; e.currentTarget.style.transform = 'scale(1)'; } }}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ZONE RISK MAP (Leaflet)
      ══════════════════════════════════════════════════════════════ */}
      <div className="risk-fade risk-slide-2">
        <div style={{ border: '2px solid #E8E8EA', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(99,102,241,0.08)' }}>
          {loadingZones ? (
            <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ede9fe, #e0f2fe)' }}>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '2.5px solid #E8E8EA', borderTopColor: NEON.purple }} />
                <span style={{ fontSize: 13, color: '#6B7280' }}>Loading zones for {selectedCity.name}...</span>
              </div>
            </div>
          ) : zones.length === 0 ? (
            <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ede9fe, #e0f2fe)' }}>
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>No zone data to display on map</p>
            </div>
          ) : (
            <ZoneRiskMap zones={zones} cityLat={selectedCity.latitude} cityLng={selectedCity.longitude} cityName={selectedCity.name} />
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ZONE RISK CARDS — unique gradient per card, glass effect
      ══════════════════════════════════════════════════════════════ */}
      <div className="risk-slide risk-slide-3">
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: 12, fontFamily: F }}>
          Zone Risk Cards — {selectedCity.name}
        </h2>
        {zoneError && (
          <p style={{ fontSize: 12, marginBottom: 12, padding: '8px 14px', borderRadius: 12, background: 'rgba(250,204,21,0.12)', color: '#a16207', border: '1px solid #FACC15', fontFamily: M }}>{zoneError}</p>
        )}
        {loadingZones ? (
          <div className="flex items-center gap-2 py-10 justify-center">
            <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid #F3F4F6', borderTopColor: NEON.purple }} />
            <span style={{ fontSize: 13, color: '#6B7280' }}>Loading zones...</span>
          </div>
        ) : zones.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>No zone data available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {zones.map((z, idx) => {
              const label = riskLabel(z.risk_score);
              const cardStyle = ZONE_CARD_STYLES[idx % ZONE_CARD_STYLES.length];
              return (
                <div
                  key={z.zone_id}
                  className="risk-slide"
                  style={{
                    animationDelay: `${0.05 * idx}s`,
                    background: cardStyle.gradient,
                    borderRadius: 16, padding: 20,
                    border: `1.5px solid ${cardStyle.border}30`,
                    transition: 'all 0.3s ease', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${cardStyle.glow}`; e.currentTarget.style.borderColor = cardStyle.border; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = `${cardStyle.border}30`; }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', fontFamily: F }}>{z.name}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: M }}>{z.zone_id}</div>
                    </div>
                    <span style={{ ...statusBadgeStyle(label), fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, fontFamily: M, display: 'inline-block' }}>
                      {label}
                    </span>
                  </div>
                  {/* Risk gauge */}
                  <div className="flex items-center gap-3 mb-3">
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.6)', overflow: 'hidden' }}>
                      <div style={{ width: `${z.risk_score * 100}%`, height: '100%', borderRadius: 4, background: `linear-gradient(to right, ${NEON.green}, ${NEON.yellow}, ${NEON.red})`, transition: 'width 0.8s ease' }} />
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: riskColor(z.risk_score), fontFamily: F }}>{(z.risk_score * 100).toFixed(0)}%</span>
                  </div>
                  {/* Factors */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {z.risk_factors.map((f) => (
                      <span key={f} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.7)', color: '#4B5563', fontFamily: M, backdropFilter: 'blur(4px)' }}>
                        {f.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          5-DAY FORECAST — weather icons, gradient cards, animations
      ══════════════════════════════════════════════════════════════ */}
      <div className="risk-slide risk-slide-4">
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: 12, fontFamily: F }}>
          5-Day Weather Forecast — {selectedCity.name}
        </h2>
        {loadingForecast ? (
          <div className="flex items-center gap-2 py-10 justify-center">
            <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid #F3F4F6', borderTopColor: NEON.blue }} />
            <span style={{ fontSize: 13, color: '#6B7280' }}>Loading forecast...</span>
          </div>
        ) : forecast.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>Forecast data unavailable</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {forecast.map((d, i) => {
              const isSunny = d.rain < 0.5 && d.windMax < 30;
              const isStormy = d.rain > 20 || d.windMax > 50;
              return (
                <div
                  key={d.date}
                  className="risk-slide"
                  style={{
                    animationDelay: `${0.08 * i}s`,
                    background: weatherGradient(d.rain, d.windMax),
                    borderRadius: 20, padding: 20, color: '#fff',
                    textAlign: 'center', position: 'relative', overflow: 'hidden',
                    transition: 'all 0.3s ease', cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)';
                    showTip(e, [d.dayLabel, `Max: ${d.tempMax.toFixed(0)}°C / Min: ${d.tempMin.toFixed(0)}°C`, `Rain: ${d.rain.toFixed(1)} mm`, `Wind: ${d.windMax.toFixed(0)} km/h`]);
                  }}
                  onMouseMove={moveTip}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'none'; hideTip(); }}
                >
                  {/* Decorative circle */}
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

                  {/* Day label */}
                  <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, marginBottom: 10, fontFamily: M, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {d.dayLabel.split(',')[0]}
                  </div>

                  {/* Weather icon with animation */}
                  <div className={isSunny ? 'sun-spin' : isStormy ? '' : 'weather-bob'} style={{ display: 'inline-block', marginBottom: 10 }}>
                    <WeatherIcon rain={d.rain} wind={d.windMax} size={40} />
                  </div>

                  {/* Rain drops animation for rainy days */}
                  {d.rain > 5 && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <div key={j} style={{
                          position: 'absolute', width: 2, height: 8, borderRadius: 1,
                          background: 'rgba(255,255,255,0.3)',
                          top: `${10 + j * 12}%`, left: `${15 + j * 13}%`,
                          animation: `rainDrop 1.${j + 2}s linear infinite`,
                          animationDelay: `${j * 0.2}s`,
                        }} />
                      ))}
                    </div>
                  )}

                  {/* Temperature */}
                  <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, fontFamily: F }}>
                    {d.tempMax.toFixed(0)}°
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{d.tempMin.toFixed(0)}° low</div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, fontSize: 11, opacity: 0.85 }}>
                    <span className="flex items-center gap-1"><Droplets size={12} /> {d.rain.toFixed(1)}mm</span>
                    <span className="flex items-center gap-1"><Wind size={12} /> {d.windMax.toFixed(0)}km/h</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CITY RISK SUMMARY — area chart + stats
      ══════════════════════════════════════════════════════════════ */}
      <div className="risk-slide" style={{ animationDelay: '0.25s' }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E8EA', borderRadius: 20 }}>
          {/* Header gradient strip */}
          <div style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #3B82F6)', padding: '20px 24px', color: '#fff' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: F, marginBottom: 4 }}>City Risk Summary — {selectedCity.name}</h2>
            <p style={{ fontSize: 12, opacity: 0.85 }}>ML model risk weights &amp; dominant disruption types</p>
          </div>

          <div style={{ padding: 24 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Area chart */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 12, fontFamily: M }}>
                  Risk Weight Distribution
                </div>
                <RiskAreaChart weights={cityWeights} />
              </div>

              {/* Right: Stats */}
              <div>
                {/* Avg risk with animated gauge */}
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 8, fontFamily: M }}>
                  Average Zone Risk
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ position: 'relative', width: 64, height: 64 }}>
                    <svg width="64" height="64" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#F3F4F6" strokeWidth="5" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke={riskColor(avgRisk)} strokeWidth="5"
                        strokeDasharray={`${avgRisk * 176} 176`}
                        strokeLinecap="round" transform="rotate(-90 32 32)"
                        style={{ transition: 'stroke-dasharray 1s ease' }} />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 14, fontWeight: 800, color: riskColor(avgRisk), fontFamily: F }}>
                      {(avgRisk * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <span style={{ ...statusBadgeStyle(riskLabel(avgRisk)), fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 20, display: 'inline-block', fontFamily: M }}>
                      {riskLabel(avgRisk)}
                    </span>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>{zones.length} zones monitored</div>
                  </div>
                </div>

                {/* Dominant types */}
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 8, fontFamily: M }}>
                  Primary Disruption Risks
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dominantTypes.map((t, i) => (
                    <div key={t} className="flex items-center gap-2" style={{ padding: '6px 12px', borderRadius: 10, background: ZONE_CARD_STYLES[i % ZONE_CARD_STYLES.length].gradient }}>
                      <AlertTriangle size={14} style={{ color: ZONE_CARD_STYLES[i % ZONE_CARD_STYLES.length].border }} />
                      <span style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 500, fontFamily: F }}>{t}</span>
                    </div>
                  ))}
                </div>

                {/* City flags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                  {selectedCity.flood_prone && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 20, background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#2563eb', fontFamily: M }}>
                      Flood Prone
                    </span>
                  )}
                  {selectedCity.aqi_prone && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 20, background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#a16207', fontFamily: M }}>
                      AQI Prone
                    </span>
                  )}
                  {selectedCity.cyclone_prone && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 20, background: 'linear-gradient(135deg, #fee2e2, #fecaca)', color: '#dc2626', fontFamily: M }}>
                      Cyclone Prone
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
