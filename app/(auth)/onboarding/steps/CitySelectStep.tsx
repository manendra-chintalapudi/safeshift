'use client';

import { useState, useRef, useEffect } from 'react';
import { CITIES } from '@/lib/config/cities';

interface CitySelectStepProps {
  initialCity: string;
  onNext: (data: { city: string; zone_latitude: number; zone_longitude: number }) => void;
  onBack: () => void;
}

interface DropdownRect { top: number; left: number; width: number; }

export default function CitySelectStep({ initialCity, onNext, onBack }: CitySelectStepProps) {
  const [selected, setSelected] = useState(initialCity || '');
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedCity = CITIES.find((c) => c.slug === selected);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropdownRect({ top: r.bottom, left: r.left, width: r.width });
    }
    setOpen((v) => !v);
  };

  // Recalculate on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect();
        setDropdownRect({ top: r.bottom, left: r.left, width: r.width });
      }
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const handleSelect = (slug: string) => {
    setSelected(slug);
    setOpen(false);
  };

  const handleContinue = () => {
    const city = CITIES.find((c) => c.slug === selected);
    if (!city) return;
    onNext({ city: city.slug, zone_latitude: city.latitude, zone_longitude: city.longitude });
  };

  return (
    <div>
      <style>{`
        .ss-city-option:hover { background: rgba(240,120,32,0.08) !important; }
        .ss-city-option-selected { background: rgba(240,120,32,0.12) !important; }
      `}</style>

      <h3 className="serif text-lg font-semibold mb-1" style={{ color: 'var(--ink)' }}>Select Your City</h3>
      <p className="sans text-sm mb-6" style={{ color: 'var(--ink-60)' }}>
        Choose the city where you primarily operate.
      </p>

      {/* Dropdown trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', height: 52, padding: '0 16px',
          background: '#fff',
          border: open ? '2px solid #F07820' : '1.5px solid #1a1a1a',
          borderRadius: 10,
          cursor: 'pointer', boxSizing: 'border-box',
          fontFamily: "'Inter', sans-serif",
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{
          fontSize: '0.95rem',
          fontWeight: selectedCity ? 600 : 400,
          color: selectedCity ? '#1a1a1a' : '#aaa',
        }}>
          {selectedCity ? selectedCity.name : 'Choose a city…'}
        </span>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M4 6l4 4 4-4" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Overlay to close */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
      )}

      {/* Dropdown panel — fixed so it escapes overflow:hidden parents */}
      {open && dropdownRect && (
        <div style={{
          position: 'fixed',
          top: dropdownRect.top,
          left: dropdownRect.left,
          width: dropdownRect.width,
          zIndex: 999,
          background: '#fff',
          border: '1.5px solid #e0e0e0',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: 280,
          overflowY: 'auto',
        }}>
          {CITIES.map((city) => (
            <button
              key={city.slug}
              type="button"
              onClick={() => handleSelect(city.slug)}
              className={`ss-city-option${selected === city.slug ? ' ss-city-option-selected' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '12px 16px',
                background: 'transparent', border: 'none',
                borderBottom: '1px solid #f5f0eb',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '0.92rem', fontWeight: 500, color: '#1a1a1a' }}>
                {city.name}
              </span>
              <span style={{ fontSize: '0.78rem', color: '#aaa', fontWeight: 400 }}>
                {city.state}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-lg font-medium transition-colors"
          style={{ border: '1px solid var(--rule)', color: 'var(--ink-60)', background: 'transparent' }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected}
          className="flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#F07820', color: '#fff' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
