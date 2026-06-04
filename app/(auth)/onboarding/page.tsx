'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { TierType, OnboardingStatus } from '@/lib/config/constants';
import LanguageStep from './steps/LanguageStep';
import AadhaarKycStep from './steps/AadhaarKycStep';
import DocumentUploadStep from './steps/DocumentUploadStep';
import CitySelectStep from './steps/CitySelectStep';
import TierSelectStep from './steps/TierSelectStep';
import PaymentStep from './steps/PaymentStep';

const STEPS = [
  'Language',
  'Aadhaar KYC',
  'Documents (DL/RC)',
  'City Selection',
  'Choose Plan',
  'Payment',
];

const STATUS_TO_STEP: Record<string, number> = {
  registered: 0,
  language_selected: 1,
  aadhaar_verified: 2,
  documents_uploaded: 3,
  upi_verified: 3,
  city_selected: 4,
  tier_selected: 5,
  payment_done: 6,
  complete: 6,
};

interface ProfileData {
  language: string;
  dl_number: string | null;
  rc_number: string | null;
  upi_id: string | null;
  city: string | null;
  onboarding_status: string;
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierType | ''>('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      // Use getUser() not getSession() — getUser() round-trips to the auth
      // server and returns a validated user, silencing Supabase's "could be
      // insecure" warning that fires on cookie-only session reads.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('language, dl_number, rc_number, upi_id, city, onboarding_status')
        .eq('id', user.id)
        .single();

      if (data) {
        const p = data as unknown as ProfileData;
        setProfile(p);
        // Resume from where user left off
        const resumeStep = STATUS_TO_STEP[p.onboarding_status] ?? 0;
        setCurrentStep(resumeStep);
        if (p.onboarding_status === 'complete') {
          router.push('/dashboard');
          return;
        }
      }
      setLoading(false);
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProfile = useCallback(async (
    updates: Record<string, unknown>,
    status: OnboardingStatus
  ) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[Onboarding] No authenticated user found');
      setSaving(false);
      return;
    }

    const payload = { ...updates, onboarding_status: status };
    const { error } = await supabase
      .from('profiles')
      .update(payload as never)
      .eq('id', user.id);

    if (error) {
      console.error('[Onboarding] Update failed:', error.message, error.details);
    }

    setProfile((prev) => prev ? { ...prev, ...updates, onboarding_status: status } as ProfileData : prev);
    setSaving(false);
  }, [supabase]);

  const goToStep = (step: number) => setCurrentStep(step);

  // --- Step handlers ---
  const handleLanguage = async (language: string) => {
    await updateProfile({ language }, 'language_selected');
    goToStep(1);
  };

  const handleAadhaar = async (aadhaarHash: string) => {
    await updateProfile({ aadhaar_verified: true, aadhaar_hash: aadhaarHash }, 'aadhaar_verified');
    goToStep(2);
  };

  const handleDocuments = async (data: { dl_number: string; rc_number: string }) => {
    await updateProfile(
      { dl_number: data.dl_number, rc_number: data.rc_number, dl_verified: true, rc_verified: true },
      'documents_uploaded'
    );
    goToStep(3);
  };

  const handleCity = async (data: { city: string; zone_latitude: number; zone_longitude: number }) => {
    await updateProfile(data, 'city_selected');
    goToStep(4);
  };

  const handleTier = async (tier: TierType) => {
    setSelectedTier(tier);
    await updateProfile({}, 'tier_selected');
    goToStep(5);
  };

  const handlePayment = async () => {
    await updateProfile({}, 'complete');
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="rounded-xl p-6" style={{ background: 'var(--cream)', border: '1px solid var(--rule)' }}>
        <div className="sans text-center py-12" style={{ color: 'var(--ink-30)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-6" style={{ background: 'var(--cream)', border: '1px solid var(--rule)' }}>
      <h2 className="serif text-xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>Complete Your Profile</h2>
      <p className="sans text-sm mb-6" style={{ color: 'var(--ink-60)' }}>
        Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
      </p>

      {/* Progress bar */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: i <= currentStep ? '#F07820' : 'var(--ink-10)' }}
          />
        ))}
      </div>

      {saving && (
        <div className="mono text-xs mb-3" style={{ color: '#F07820' }}>Saving...</div>
      )}

      {/* Step content */}
      {currentStep === 0 && (
        <LanguageStep
          initialLanguage={profile?.language ?? 'en'}
          onNext={handleLanguage}
        />
      )}

      {currentStep === 1 && (
        <AadhaarKycStep
          onNext={handleAadhaar}
          onBack={() => goToStep(0)}
        />
      )}

      {currentStep === 2 && (
        <DocumentUploadStep
          initialDl={profile?.dl_number ?? ''}
          initialRc={profile?.rc_number ?? ''}
          onNext={handleDocuments}
          onBack={() => goToStep(1)}
        />
      )}

      {currentStep === 3 && (
        <CitySelectStep
          initialCity={profile?.city ?? ''}
          onNext={handleCity}
          onBack={() => goToStep(2)}
        />
      )}

      {currentStep === 4 && (
        <TierSelectStep
          initialTier={selectedTier}
          onNext={handleTier}
          onBack={() => goToStep(3)}
        />
      )}

      {currentStep === 5 && (
        <PaymentStep
          tier={selectedTier || 'normal'}
          city={profile?.city ?? ''}
          onNext={handlePayment}
          onBack={() => goToStep(4)}
        />
      )}
    </div>
  );
}

