'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { TierType } from '@/lib/config/constants';
import TierSelectStep from '@/app/(auth)/onboarding/steps/TierSelectStep';
import PaymentStep from '@/app/(auth)/onboarding/steps/PaymentStep';

export default function PolicyPurchasePage() {
  const [step, setStep] = useState<'tier' | 'payment'>('tier');
  const [tier, setTier] = useState<TierType | ''>('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadCity() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .single();

      if (data) setCity((data as { city: string }).city || 'mumbai');
      setLoading(false);
    }
    loadCity();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--ink-60)', fontFamily: "var(--font-inter),'Inter',sans-serif" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 20px' }}>
      {step === 'tier' && (
        <TierSelectStep
          initialTier={tier}
          onNext={(selected) => {
            setTier(selected);
            setStep('payment');
          }}
          onBack={() => router.back()}
        />
      )}

      {step === 'payment' && tier && (
        <PaymentStep
          tier={tier}
          city={city}
          onNext={() => router.push('/dashboard')}
          onBack={() => setStep('tier')}
        />
      )}
    </div>
  );
}
