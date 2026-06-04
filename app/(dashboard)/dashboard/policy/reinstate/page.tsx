'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PLAN_PACKAGES } from '@/lib/config/constants';
import { ArrowLeft, Shield, CloudRain, MapPin, Coins } from 'lucide-react';

const F = "var(--font-inter),'Inter',sans-serif";

interface PremiumQuote {
  basePremium: number;
  weatherRisk: number;
  ubiAddon: number;
  finalPremium: number;
  reasoning: string;
  breakdown?: {
    rainfall_probability: number;
    wind_probability: number;
    aqi_probability: number;
    combined_risk_score: number;
  };
}

function ReinstateContent() {
  const router = useRouter();
  const params = useSearchParams();
  const initialTier = params.get('tier') || 'normal';

  const [selectedTier, setSelectedTier] = useState(initialTier);
  const [showPicker, setShowPicker] = useState(false);
  const [quote, setQuote] = useState<PremiumQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [coinBalance, setCoinBalance] = useState(0);
  const [coinsToRedeem, setCoinsToRedeem] = useState(0);

  const plan = PLAN_PACKAGES.find((p) => p.slug === selectedTier);

  useEffect(() => {
    setLoading(true);
    setQuote(null);
    setError('');
    setCoinsToRedeem(0);
    Promise.all([
      fetch('/api/driver/premium-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier }),
      }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('/api/driver/coins').then((r) => r.ok ? r.json() : { data: { balance: 0 } }),
    ])
      .then(([q, c]) => { setQuote(q); setCoinBalance(c.balance ?? c.data?.balance ?? 0); })
      .catch(() => setError('Could not calculate premium. Please try again.'))
      .finally(() => setLoading(false));
  }, [selectedTier]);

  const handlePay = async () => {
    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/driver/reinstate-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier, coinsToRedeem: coinsToRedeem || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Payment failed'); setPaying(false); return; }
      router.push('/dashboard');
    } catch {
      setError('Payment failed. Please try again.');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 20px', fontFamily: F }}>
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#6B7280' }}>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Calculating your premium...</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Using live weather data + your zone risk</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px', fontFamily: F }}>
      <style>{`
        .reinstate-btn {
          position: relative; overflow: hidden;
          background: #1A1A1A; color: #fff;
          z-index: 0; transition: color 0.35s ease;
        }
        .reinstate-btn::before {
          content: ''; position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 0%; background: #F07820;
          transition: height 0.35s ease; z-index: -1;
        }
        .reinstate-btn:hover:not(:disabled) { color: #fff; }
        .reinstate-btn:hover:not(:disabled)::before { height: 100%; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <ArrowLeft size={22} color="#1A1A1A" />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
          Reinstate Policy
        </h1>
      </div>

      {error && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
          padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#DC2626',
        }}>{error}</div>
      )}

      {/* Plan info */}
      <div style={{
        background: '#fff', border: '1px solid #E8E8EA', borderRadius: 14,
        padding: 20, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Shield size={20} color="#F07820" />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{plan?.name ?? selectedTier} Plan</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Max Weekly Payout</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
            ₹{plan?.max_weekly_payout_inr.toLocaleString('en-IN') ?? '--'}
          </span>
        </div>
        {plan && Object.entries(plan.payout_schedule).map(([event, amount]) => (
          <div key={event} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#9CA3AF', textTransform: 'capitalize' }}>{event.replace(/_/g, ' ')}</span>
            <span style={{ fontSize: 12, color: '#6B7280' }}>₹{amount}</span>
          </div>
        ))}
      </div>

      {/* Dynamic premium breakdown */}
      {quote && (
        <div style={{
          background: '#FFF7ED', border: '1.5px solid #FDBA74', borderRadius: 14,
          padding: 20, marginBottom: 16,
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9A3412', marginBottom: 14 }}>
            Dynamic Premium Breakdown
          </p>

          {/* Base */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: '#4B5563' }}>Base Premium ({plan?.name ?? selectedTier})</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>₹{quote.basePremium}</span>
          </div>

          {/* Weather risk */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CloudRain size={14} color="#6B7280" />
              <span style={{ fontSize: 14, color: '#4B5563' }}>Weather Risk Addon</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#EA580C' }}>+₹{quote.weatherRisk.toFixed(0)}</span>
          </div>

          {/* UBI */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} color="#6B7280" />
              <span style={{ fontSize: 14, color: '#4B5563' }}>Zone Risk (UBI)</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#EA580C' }}>+₹{quote.ubiAddon}</span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#FDBA74', marginBottom: 14 }} />

          {/* Final */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Weekly Premium</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#F07820' }}>₹{quote.finalPremium.toFixed(0)}</span>
          </div>

          {/* Risk bars */}
          {quote.breakdown && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              {[
                { label: 'Rain', val: quote.breakdown.rainfall_probability },
                { label: 'Wind', val: quote.breakdown.wind_probability },
                { label: 'AQI', val: quote.breakdown.aqi_probability },
              ].map(({ label, val }) => (
                <div key={label} style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#9A3412', marginBottom: 3, textAlign: 'center' }}>{label}</div>
                  <div style={{ height: 4, borderRadius: 2, background: '#FDE68A' }}>
                    <div style={{ width: `${Math.min(val * 100, 100)}%`, height: '100%', borderRadius: 2, background: '#F07820' }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#9A3412', marginTop: 2, textAlign: 'center' }}>{(val * 100).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Coin redemption */}
      {quote && coinBalance >= 100 && (
        <div style={{
          background: '#fff', border: '1.5px solid #E8E8EA', borderRadius: 14,
          padding: 18, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Coins size={18} color="#F07820" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>Redeem SafeShift Coins</span>
            <span style={{
              marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#F07820',
              background: '#FEF3E8', borderRadius: 20, padding: '3px 10px',
            }}>
              {coinBalance} coins
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* No redemption option */}
            <button
              type="button"
              onClick={() => setCoinsToRedeem(0)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: F,
                background: coinsToRedeem === 0 ? '#FEF3E8' : '#F9FAFB',
                border: coinsToRedeem === 0 ? '1.5px solid #F07820' : '1px solid #E8E8EA',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 13, color: '#4B5563' }}>No redemption</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: coinsToRedeem === 0 ? '#F07820' : '#9CA3AF' }}>
                ₹{quote.finalPremium.toFixed(0)}
              </span>
            </button>

            {/* Redemption tiers */}
            {([100, 200, 300, 400, 500] as const).filter(c => coinBalance >= c).map(coins => {
              const discount = coins === 500
                ? Math.round(quote.finalPremium * 0.5)
                : (coins / 100) * 5;
              const afterDiscount = Math.max(0, quote.finalPremium - discount);
              const label = coins === 500
                ? '50% off premium'
                : `₹${discount} off`;
              const selected = coinsToRedeem === coins;

              return (
                <button
                  key={coins}
                  type="button"
                  onClick={() => setCoinsToRedeem(coins)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: F,
                    background: selected ? '#FEF3E8' : '#F9FAFB',
                    border: selected ? '1.5px solid #F07820' : '1px solid #E8E8EA',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: '#F07820',
                      background: '#FEF3E8', borderRadius: 4, padding: '2px 6px',
                    }}>
                      {coins}
                    </span>
                    <span style={{ fontSize: 13, color: '#4B5563' }}>{label}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: selected ? '#F07820' : '#1A1A1A' }}>
                      ₹{afterDiscount.toFixed(0)}
                    </span>
                    {discount > 0 && (
                      <span style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'line-through', marginLeft: 6 }}>
                        ₹{quote.finalPremium.toFixed(0)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pay button */}
      {(() => {
        const discount = !quote || coinsToRedeem === 0 ? 0
          : coinsToRedeem === 500 ? Math.round(quote.finalPremium * 0.5)
          : (coinsToRedeem / 100) * 5;
        const finalAmount = Math.max(0, (quote?.finalPremium ?? 0) - discount);
        return (
          <button
            onClick={handlePay}
            disabled={paying || !quote}
            className="reinstate-btn"
            style={{
              width: '100%', padding: '14px 0', borderRadius: 10,
              fontSize: 16, fontWeight: 700, border: 'none',
              cursor: paying ? 'default' : 'pointer',
              fontFamily: F, opacity: paying ? 0.7 : 1,
            }}
          >
            {paying ? 'Processing...' : `Pay ₹${finalAmount.toFixed(0)} & Reinstate`}
          </button>
        );
      })()}

      {/* Change plan toggle */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        style={{
          display: 'block', width: '100%', marginTop: 12,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: '#F07820', fontWeight: 600, fontFamily: F,
          textAlign: 'center',
        }}
      >
        {showPicker ? 'Hide plans' : 'Change plan'}
      </button>

      {/* Inline tier picker */}
      {showPicker && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {PLAN_PACKAGES.filter((p) => p.slug !== selectedTier).map((p) => (
            <button
              key={p.slug}
              onClick={() => { setSelectedTier(p.slug); setShowPicker(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                background: '#fff', border: '1px solid #E8E8EA', fontFamily: F,
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>{p.name} Plan</p>
                <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0' }}>
                  Base ₹{p.weekly_premium_inr}/wk · Max ₹{p.max_weekly_payout_inr.toLocaleString('en-IN')}
                </p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#F07820' }}>Select →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReinstatePolicyPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>Loading...</div>}>
      <ReinstateContent />
    </Suspense>
  );
}
