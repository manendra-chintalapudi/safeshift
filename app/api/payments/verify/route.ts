// ============================================================================
// POST /api/payments/verify — Verify Razorpay payment signature
// Supports both onboarding (first payment) and renewal (weekly) flows
// ============================================================================

import { NextResponse } from 'next/server';
import { parseBody, errorResponse, successResponse } from '@/lib/utils/api';
import { getSession } from '@/lib/utils/auth';
import { verifyPaymentSchema } from '@/lib/validations/schemas';
import { createAdminClient } from '@/lib/supabase/admin';
import { razorpayKeySecret } from '@/lib/config/env';
import { getWeekStart, getWeekEnd, getNextMonday, getNextWeekEnd, getFirstPolicyStartDate, formatDate } from '@/lib/utils/date';
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils';
import type { PlanPackageRow } from '@/lib/types/database';

export async function POST(request: Request) {
  try {
    // Get user — try session first, fall back to getUser
    let profileId: string;
    try {
      const session = await getSession();
      if (session) {
        profileId = session.user.id;
      } else {
        const { createServerClient } = await import('@/lib/supabase/server');
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        profileId = user.id;
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await parseBody(request, verifyPaymentSchema);
    const paymentType = body.type || 'onboarding';

    // Verify signature — accept mock payments (pay_mock_*) or validate real ones
    const isMockPayment = body.razorpay_payment_id.startsWith('pay_mock_');
    if (!isMockPayment) {
      const isValid = validatePaymentVerification(
        {
          order_id: body.razorpay_order_id,
          payment_id: body.razorpay_payment_id,
        },
        body.razorpay_signature,
        razorpayKeySecret()
      );
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
      }
    }

    const supabase = createAdminClient();

    // Update payment_transaction (non-fatal in mock mode)
    const { error: txError } = await supabase
      .from('payment_transactions')
      .update({
        razorpay_payment_id: body.razorpay_payment_id,
        razorpay_signature: body.razorpay_signature,
        status: 'captured',
        updated_at: new Date().toISOString(),
      } as never)
      .eq('razorpay_order_id', body.razorpay_order_id)
      .eq('profile_id', profileId);

    if (txError) {
      console.error('[VerifyPayment] Error updating transaction:', txError);
      // Don't fail — mock payments may not have a transaction row
    }

    // Look up the plan
    const { data: planRaw, error: planError } = await supabase
      .from('plan_packages')
      .select('*')
      .eq('id', body.plan_id)
      .single();

    if (planError || !planRaw) {
      throw new Error('Plan not found');
    }

    const plan = planRaw as unknown as PlanPackageRow;

    // Determine premium amount
    const premiumAmount = body.dynamic_premium ?? plan.weekly_premium_inr;

    let weekStart: Date;
    let weekEnd: Date;
    let isActive: boolean;

    if (paymentType === 'renewal') {
      // --- RENEWAL FLOW ---
      // Create policy for NEXT week (Mon-Sun)
      weekStart = getNextMonday();
      weekEnd = getNextWeekEnd();
      isActive = false; // activate-policies cron will activate it on Monday
    } else {
      // --- ONBOARDING FLOW ---
      // Check if this is a first-time purchase (no existing policies)
      const { count } = await supabase
        .from('weekly_policies')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      const isFirstTime = (count ?? 0) === 0;

      if (isFirstTime) {
        // First-time: use getFirstPolicyStartDate (7-13 day waiting period)
        weekStart = getFirstPolicyStartDate();
        const weekEndDate = new Date(weekStart);
        weekEndDate.setDate(weekStart.getDate() + 6);
        weekEndDate.setHours(23, 59, 59, 999);
        weekEnd = weekEndDate;
        isActive = false; // cron will activate it later
      } else {
        // Returning user onboarding: current week
        weekStart = getWeekStart();
        weekEnd = getWeekEnd();
        isActive = true;
      }
    }

    const { data: policyRaw, error: policyError } = await supabase
      .from('weekly_policies')
      .insert({
        profile_id: profileId,
        plan_id: body.plan_id,
        week_start_date: formatDate(weekStart),
        week_end_date: formatDate(weekEnd),
        base_premium_inr: plan.weekly_premium_inr,
        weather_risk_addon: 0,
        ubi_addon: 0,
        final_premium_inr: premiumAmount,
        is_active: isActive,
        payment_status: 'paid',
        razorpay_order_id: body.razorpay_order_id,
        razorpay_payment_id: body.razorpay_payment_id,
        total_payout_this_week: 0,
        claim_active_from: formatDate(weekStart),
      } as never)
      .select('id')
      .single();

    if (policyError) {
      console.error('[VerifyPayment] Error creating weekly_policy:', JSON.stringify(policyError));
      throw new Error(`Failed to create weekly policy: ${policyError.message || policyError.code || 'Unknown'}`);
    }

    const policy = policyRaw as unknown as { id: string };

    // Link the policy to the payment transaction
    await supabase
      .from('payment_transactions')
      .update({ policy_id: policy.id } as never)
      .eq('razorpay_order_id', body.razorpay_order_id)
      .eq('profile_id', profileId);

    // Mark onboarding complete only for onboarding flow
    if (paymentType === 'onboarding') {
      await supabase
        .from('profiles')
        .update({
          onboarding_status: 'complete',
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', profileId);
    }

    return successResponse({
      success: true,
      policy_id: policy.id,
      week_start: formatDate(weekStart),
      week_end: formatDate(weekEnd),
      is_active: isActive,
      type: paymentType,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
