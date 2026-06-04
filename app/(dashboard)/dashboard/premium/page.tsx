'use client';

import { useState } from 'react';
import { CITIES } from '@/lib/config/cities';
import { TIER_TYPES } from '@/lib/config/constants';

interface ZoneContribution {
  zone_id: string;
  zone_name: string;
  risk_score: number;
  time_percentage: number;
  risk_contribution: number;
}

interface UBIDetails {
  ubi_addon: number;
  weighted_risk_score: number;
  risk_level: string;
  zone_contributions: ZoneContribution[];
}

interface PremiumResult {
  city: string;
  date: string;
  tier: string;
  base_premium: number;
  weather_risk_addon: number;
  ubi_addon: number;
  final_premium: number;
  breakdown: {
    prediction_as_of: string;
    rainfall_probability: number;
    wind_probability: number;
    aqi_probability: number;
    combined_risk_score: number;
    city_weights: Record<string, number>;
    aqi_current: number;
    aqi_max_forecast: number;
  };
  ubi_details: UBIDetails;
}

export default function PremiumCalculatorPage() {
  const [city, setCity] = useState('mumbai');
  const [tier, setTier] = useState('normal');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [driverId, setDriverId] = useState('driver_123');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PremiumResult | null>(null);
  const [error, setError] = useState('');

  const ML_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8001';

  async function handleCalculate() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${ML_URL}/predict/premium`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, tier, date, driver_id: driverId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.error || `HTTP ${res.status}`);
      }

      const data: PremiumResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate premium');
    } finally {
      setLoading(false);
    }
  }

  const tierActiveStyles: Record<string, React.CSSProperties> = {
    normal: { background: 'var(--teal-bg)', color: 'var(--teal)', border: '1px solid var(--teal)' },
    medium: { background: 'var(--teal-bg)', color: 'var(--teal)', border: '1px solid var(--teal)' },
    high: { background: 'var(--teal-bg)', color: 'var(--teal)', border: '1px solid var(--teal)' },
  };

  const riskLevelStyles: Record<string, React.CSSProperties> = {
    low: { color: 'var(--teal)', border: '1px solid var(--teal)' },
    medium: { color: 'var(--ink-60)', border: '1px solid var(--ink-30)' },
    high: { color: 'var(--red-acc)', border: '1px solid var(--red-acc)' },
  };

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <h1 className="serif text-xl font-bold" style={{ color: 'var(--ink)' }}>Dynamic Premium Calculator</h1>
      <p className="text-sm" style={{ color: 'var(--ink-60)' }}>ML-powered premium with zone-based UBI</p>

      {/* Inputs */}
      <div className="rounded-xl p-5 space-y-4" style={{ border: '1px solid var(--rule)' }}>
        <div>
          <label className="mono block text-sm font-medium mb-1" style={{ color: 'var(--ink-60)' }}>City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--rule)', background: 'var(--cream)' }}>
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}, {c.state}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mono block text-sm font-medium mb-1" style={{ color: 'var(--ink-60)' }}>Tier</label>
          <div className="grid grid-cols-3 gap-2">
            {TIER_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setTier(t)}
                className="py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors"
                style={tier === t ? tierActiveStyles[t] : { background: 'var(--cream-d)', color: 'var(--ink-60)', border: '1px solid var(--rule)' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mono block text-sm font-medium mb-1" style={{ color: 'var(--ink-60)' }}>Prediction Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm" style={{ border: '1px solid var(--rule)', background: 'var(--cream)' }} />
          <p className="text-xs mt-1" style={{ color: 'var(--ink-30)' }}>Change date to see seasonal premium variation</p>
        </div>

        <div>
          <label className="mono block text-sm font-medium mb-1" style={{ color: 'var(--ink-60)' }}>Driver ID (for zone lookup)</label>
          <input type="text" value={driverId} onChange={(e) => setDriverId(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid var(--rule)', background: 'var(--cream)' }}
            placeholder="driver_123" />
          <p className="text-xs mt-1" style={{ color: 'var(--ink-30)' }}>Different IDs get different zone assignments from Porter</p>
        </div>

        <button onClick={handleCalculate} disabled={loading}
          className="w-full py-3 rounded-lg font-medium transition-colors"
          style={{ background: 'var(--teal)', color: 'var(--cream)', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Calculating...' : 'Calculate Premium'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(192,57,43,0.07)', border: '1px solid var(--red-acc)', color: 'var(--red-acc)' }}>{error}</div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Final Premium Card */}
          <div className="rounded-xl p-5" style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
            <div className="mono text-sm" style={{ opacity: 0.7 }}>Weekly Premium</div>
            <div className="serif text-4xl font-bold mt-1">₹{result.final_premium.toFixed(2)}</div>
            <div className="text-sm mt-2" style={{ opacity: 0.7 }}>
              {result.city} | {result.tier} tier | as of {result.date}
            </div>
          </div>

          {/* Premium Breakdown */}
          <div className="rounded-xl p-5" style={{ border: '1px solid var(--rule)' }}>
            <h3 className="serif font-semibold mb-3" style={{ color: 'var(--ink)' }}>Premium Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--ink-60)' }}>Base Premium ({result.tier})</span>
                <span className="serif font-medium">₹{result.base_premium}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm" style={{ color: 'var(--ink-60)' }}>Weather Risk</span>
                  <span className="text-xs ml-1" style={{ color: 'var(--ink-30)' }}>(ML predicted)</span>
                </div>
                <span className="serif font-medium" style={{ color: 'var(--teal)' }}>+₹{result.weather_risk_addon.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm" style={{ color: 'var(--ink-60)' }}>UBI (Zone Risk)</span>
                  <span className="mono text-xs ml-1 px-1.5 py-0.5 rounded-full" style={riskLevelStyles[result.ubi_details.risk_level]}>
                    {result.ubi_details.risk_level}
                  </span>
                </div>
                <span className="serif font-medium" style={{ color: 'var(--teal)' }}>+₹{result.ubi_addon.toFixed(2)}</span>
              </div>
              <hr style={{ borderColor: 'var(--ink-10)' }} />
              <div className="flex justify-between items-center text-lg">
                <span className="font-bold">Total</span>
                <span className="serif font-bold" style={{ color: 'var(--teal)' }}>₹{result.final_premium.toFixed(2)}/week</span>
              </div>
            </div>
          </div>

          {/* Disruption Risk Predictions */}
          <div className="rounded-xl p-5" style={{ border: '1px solid var(--rule)' }}>
            <h3 className="serif font-semibold mb-3" style={{ color: 'var(--ink)' }}>Disruption Risk (next 7 days)</h3>
            <div className="space-y-3">
              <RiskBar label="Heavy Rainfall (>65mm)" probability={result.breakdown.rainfall_probability} color="blue" />
              <RiskBar label="Cyclone/Wind (>70km/h)" probability={result.breakdown.wind_probability} color="orange" />
              <RiskBar label="AQI GRAP-IV (>450)" probability={result.breakdown.aqi_probability} color="red" />
            </div>
            <div className="mt-4 pt-3 flex justify-between text-sm" style={{ borderTop: '1px solid var(--ink-10)' }}>
              <span style={{ color: 'var(--ink-60)' }}>Combined Risk Score</span>
              <span className="serif font-semibold">{(result.breakdown.combined_risk_score * 100).toFixed(2)}%</span>
            </div>
          </div>

          {/* UBI Zone Analysis */}
          <div className="rounded-xl p-5" style={{ border: '1px solid var(--rule)' }}>
            <h3 className="serif font-semibold mb-1" style={{ color: 'var(--ink)' }}>Zone-Based UBI Analysis</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--ink-60)' }}>
              Based on driver&apos;s frequent delivery zones from Porter
            </p>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm" style={{ color: 'var(--ink-60)' }}>Weighted Zone Risk:</span>
              <span className="mono text-sm font-semibold px-2 py-0.5 rounded-full" style={riskLevelStyles[result.ubi_details.risk_level]}>
                {(result.ubi_details.weighted_risk_score * 100).toFixed(1)}% ({result.ubi_details.risk_level})
              </span>
            </div>

            <div className="space-y-2">
              {result.ubi_details.zone_contributions.map((zone) => (
                <div key={zone.zone_id} className="rounded-lg p-3" style={{ border: '1px solid var(--rule)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{zone.zone_name}</span>
                      <div className="mono text-xs mt-0.5" style={{ color: 'var(--ink-60)' }}>{zone.time_percentage}% of trips</div>
                    </div>
                    <div className="text-right">
                      <ZoneRiskBadge score={zone.risk_score} />
                    </div>
                  </div>
                  {/* Risk bar */}
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--ink-10)' }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${zone.risk_score * 100}%`, background: 'var(--teal)' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mono mt-3 pt-3 text-xs" style={{ borderTop: '1px solid var(--ink-10)', color: 'var(--ink-30)' }}>
              UBI Formula: weighted_risk ({(result.ubi_details.weighted_risk_score).toFixed(4)}) x ₹15 = ₹{result.ubi_addon.toFixed(2)}
            </div>
          </div>

          {/* City Risk Weights */}
          <div className="rounded-xl p-5" style={{ border: '1px solid var(--rule)' }}>
            <h3 className="serif font-semibold mb-3" style={{ color: 'var(--ink)' }}>City Risk Profile ({result.city})</h3>
            <div className="space-y-2">
              {Object.entries(result.breakdown.city_weights).map(([key, weight]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="mono text-sm capitalize w-20" style={{ color: 'var(--ink-60)' }}>{key}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--ink-10)' }}>
                    <div className="h-2 rounded-full" style={{ background: 'var(--teal)', width: `${weight * 100}%` }} />
                  </div>
                  <span className="serif text-sm font-medium w-12 text-right">{(weight * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* AQI Live */}
          {result.breakdown.aqi_current > 0 && (
            <div className="rounded-xl p-4 text-sm flex justify-between" style={{ background: 'var(--cream-d)', border: '1px solid var(--rule)' }}>
              <div>
                <span style={{ color: 'var(--ink-60)' }}>Live AQI: </span>
                <span className="serif font-medium">{result.breakdown.aqi_current}</span>
              </div>
              <div>
                <span style={{ color: 'var(--ink-60)' }}>Forecast Max: </span>
                <span className="serif font-medium">{result.breakdown.aqi_max_forecast}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RiskBar({ label, probability }: { label: string; probability: number; color: string }) {
  const pct = Math.min(probability * 100, 100);

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span style={{ color: 'var(--ink-60)' }}>{label}</span>
        <span className="serif font-medium" style={{ color: 'var(--teal)' }}>{(probability * 100).toFixed(2)}%</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'var(--ink-10)' }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%`, background: 'var(--teal)' }} />
      </div>
    </div>
  );
}

function ZoneRiskBadge({ score }: { score: number }) {
  const badgeStyle: React.CSSProperties = score > 0.7
    ? { color: 'var(--red-acc)', border: '1px solid var(--red-acc)' }
    : score > 0.5
      ? { color: 'var(--ink-60)', border: '1px solid var(--ink-30)' }
      : { color: 'var(--teal)', border: '1px solid var(--teal)' };
  const label = score > 0.7 ? 'High Risk' : score > 0.5 ? 'Medium' : 'Low Risk';
  return (
    <span className="mono text-xs font-medium px-2 py-0.5 rounded-full" style={badgeStyle}>
      {label} ({(score * 100).toFixed(0)}%)
    </span>
  );
}
