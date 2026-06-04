// ============================================================================
// POST /api/payments/create-weekly-order — Create a Razorpay order for weekly renewal
// Enforces Sunday payment window, uses ML dynamic premium with fallback
// ============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody, errorResponse, successResponse } from '@/lib/utils/api';
import { getSession } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayClient } from '@/lib/payments/razorpay';
import { isSundayPaymentWindow } from '@/lib/utils/date';
import { PLAN_PACKAGES } from '@/lib/config/constants';
import type { PlanPackageRow } from '@/lib/types/database';

const weeklyOrderSchema = z.object({
  plan_slug: z.string(),
});

interface MLPremiumResponse {
  base_premium: number;
  weather_risk_addon: number;
  ubi_addon: number;
  final_premium: number;
}

export async function POST(request: Request) {
  try {
    // Try session first, fall back to getUser
    let profileId: string;
    try {
      const session = await getSession();
      if (session) {
        profileId = session.user.id;
      } else {
        // Fallback: try getting user directly
        const { createServerClient } = await import('@/lib/supabase/server');
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        profileId = user.id;
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await parseBody(request, weeklyOrderSchema);

    // Enforce Sunday payment window (skip in dev/test mode)
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev && !isSundayPaymentWindow()) {
      return NextResponse.json(
        { error: 'Payment window is closed. Renewals are accepted Sunday 6 AM – Monday 6 AM IST.' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Look up plan by slug
    const { data: planRaw, error: planError } = await supabase
      .from('plan_packages')
      .select('*')
      .eq('slug', body.plan_slug)
      .single();

    if (planError || !planRaw) {
      return NextResponse.json({ error: 'Plan not found for slug: ' + body.plan_slug }, { status: 404 });
    }

    const plan = planRaw as unknown as PlanPackageRow;

    // Look up driver profile for city
    const { data: profileRaw } = await supabase
      .from('profiles')
      .select('city')
      .eq('id', profileId)
      .single();

    const city = (profileRaw as unknown as { city: string | null })?.city || 'mumbai';

    // Try ML service for dynamic premium
    let premiumBreakdown: { base: number; weather: number; ubi: number; total: number };
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';

    try {
      const mlRes = await fetch(`${mlUrl}/predict/premium`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, tier: body.plan_slug }),
        signal: AbortSignal.timeout(5000),
      });

      if (!mlRes.ok) throw new Error(`ML service returned ${mlRes.status}`);

      const mlData: MLPremiumResponse = await mlRes.json();
      premiumBreakdown = {
        base: mlData.base_premium,
        weather: mlData.weather_risk_addon,
        ubi: mlData.ubi_addon,
        total: mlData.final_premium,
      };
    } catch (mlError) {
      console.warn('[CreateWeeklyOrder] ML service unavailable, using base premium:', mlError);
      // Fallback to base premium from PLAN_PACKAGES
      const basePlan = PLAN_PACKAGES.find(p => p.slug === body.plan_slug);
      const basePremium = basePlan?.weekly_premium_inr ?? plan.weekly_premium_inr;
      premiumBreakdown = {
        base: basePremium,
        weather: 0,
        ubi: 0,
        total: basePremium,
      };
    }

    // Amount in paise (Razorpay uses smallest currency unit)
    const amountPaise = Math.round(premiumBreakdown.total * 100);

    // Mock Razorpay order (no real API call needed)
    const order = {
      id: `order_mock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      amount: amountPaise,
      currency: 'INR',
    };

    // Insert payment_transaction record
    const { error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        profile_id: profileId,
        razorpay_order_id: order.id,
        amount_inr: premiumBreakdown.total,
        status: 'created',
        metadata: {
          plan_id: plan.id,
          plan_slug: body.plan_slug,
          type: 'weekly_renewal',
          premium_breakdown: premiumBreakdown,
        },
      } as never);

    if (txError) {
      console.error('[CreateWeeklyOrder] Error inserting payment_transaction:', txError);
      throw new Error('Failed to record payment transaction');
    }

    return successResponse({
      orderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      plan_id: plan.id,
      premium_breakdown: premiumBreakdown,
    });
  } catch (error) {
    console.error('[CreateWeeklyOrder] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
