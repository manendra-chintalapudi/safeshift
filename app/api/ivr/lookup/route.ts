// ============================================================================
// POST /api/ivr/lookup — IVR phone lookup (no auth required)
// ============================================================================

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSundayPaymentWindow, getNextSunday } from '@/lib/utils/date';

// ---------------------------------------------------------------------------
// Types for Supabase selects
// ---------------------------------------------------------------------------

interface PlanRow {
  name: string;
  tier: string;
  max_weekly_payout_inr: number;
}

interface PolicyRow {
  final_premium_inr: number;
  week_start_date: string;
  week_end_date: string;
  plan_packages: PlanRow | null;
}

interface NextWeekPolicyRow {
  final_premium_inr: number;
  week_start_date: string;
  plan_packages: { tier: string; name: string } | null;
}

interface DisruptionRow {
  event_type: string;
  city: string;
}

interface ClaimRow {
  payout_amount_inr: number;
  status: string;
  created_at: string;
  live_disruption_events: DisruptionRow | null;
}

interface CoinBalanceRow {
  balance: number;
}

interface ProfileLookupRow {
  id: string;
  full_name: string | null;
  city: string | null;
  phone_number: string | null;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone: string | undefined = body?.phone;

    // 1. Validate phone format (10-digit Indian mobile)
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Must be a 10-digit Indian mobile number.' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // 2. Look up user by phone_number — try both raw and +91 prefixed
    const { data: profileRaw } = await admin
      .from('profiles')
      .select('id, full_name, city, phone_number')
      .or(`phone_number.eq.${phone},phone_number.eq.+91${phone}`)
      .limit(1)
      .maybeSingle();

    const profileData = profileRaw as unknown as ProfileLookupRow | null;

    if (!profileData) {
      return NextResponse.json({ found: false });
    }

    const profileId = profileData.id;

    // 3. Compute IST-aware today
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 4. Fetch data in parallel
    const [policyRes, claimsRes, coinsRes, nextWeekRes] = await Promise.all([
      // Active policy
      admin
        .from('weekly_policies')
        .select('final_premium_inr, week_start_date, week_end_date, plan_packages(name, tier, max_weekly_payout_inr)')
        .eq('profile_id', profileId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),

      // Recent claims (last 3)
      admin
        .from('parametric_claims')
        .select('payout_amount_inr, status, created_at, live_disruption_events(event_type, city)')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(3),

      // Coin balance
      admin
        .from('driver_coin_balance')
        .select('balance')
        .eq('profile_id', profileId)
        .maybeSingle(),

      // Next week policy
      admin
        .from('weekly_policies')
        .select('final_premium_inr, week_start_date, plan_packages(tier, name)')
        .eq('profile_id', profileId)
        .eq('is_active', false)
        .in('payment_status', ['paid', 'demo'])
        .gte('week_start_date', today)
        .order('week_start_date', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    const policy = policyRes.data as unknown as PolicyRow | null;
    const claims = (claimsRes.data as unknown as ClaimRow[]) || [];
    const coins = coinsRes.data as unknown as CoinBalanceRow | null;
    const nextWeekPolicy = nextWeekRes.data as unknown as NextWeekPolicyRow | null;

    // 5. Compute payment window and next sunday
    const isPaymentWindow = isSundayPaymentWindow();
    const nextSunday = getNextSunday().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    // 6. Assemble response
    return NextResponse.json({
      found: true,
      name: profileData.full_name || '',
      city: profileData.city || '',
      policy: policy
        ? {
            tier: policy.plan_packages?.tier ?? '',
            name: policy.plan_packages?.name ?? '',
            premium: policy.final_premium_inr,
            max_payout: policy.plan_packages?.max_weekly_payout_inr ?? 0,
            week_start: policy.week_start_date,
            week_end: policy.week_end_date,
          }
        : null,
      next_week_policy: nextWeekPolicy
        ? {
            tier: nextWeekPolicy.plan_packages?.tier ?? '',
            name: nextWeekPolicy.plan_packages?.name ?? '',
            premium: nextWeekPolicy.final_premium_inr,
            week_start: nextWeekPolicy.week_start_date,
          }
        : null,
      claims: claims.map((c) => ({
        event_type: c.live_disruption_events?.event_type ?? 'unknown',
        amount: c.payout_amount_inr,
        status: c.status,
        date: c.created_at,
      })),
      coins: coins?.balance ?? 0,
      is_payment_window: isPaymentWindow,
      next_sunday: nextSunday,
    });
  } catch (error) {
    console.error('[IVR Lookup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
