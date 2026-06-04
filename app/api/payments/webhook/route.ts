// ============================================================================
// POST /api/payments/webhook — Razorpay webhook handler
// Verifies signature, processes payment.captured events with idempotency
// ============================================================================

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { razorpayWebhookSecret } from '@/lib/config/env';
import { getWeekStart, getWeekEnd, formatDate } from '@/lib/utils/date';
import Razorpay from 'razorpay';
import type { PlanPackageRow } from '@/lib/types/database';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const isValid = Razorpay.validateWebhookSignature(
      rawBody,
      signature,
      razorpayWebhookSecret()
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      payload: {
        payment?: {
          entity: {
            id: string;
            order_id: string;
            amount: number;
            status: string;
            notes?: Record<string, string>;
          };
        };
      };
      account_id: string;
    };

    const eventId = `${event.event}_${event.payload.payment?.entity?.id ?? Date.now()}`;

    const supabase = createAdminClient();

    // Idempotency check via razorpay_payment_events table
    const { data: existingRaw } = await supabase
      .from('razorpay_payment_events')
      .select('id')
      .eq('event_id', eventId)
      .single();

    const existing = existingRaw as unknown as { id: string } | null;

    if (existing) {
      // Already processed
      return NextResponse.json({ status: 'already_processed' });
    }

    // Record the event for idempotency
    await supabase
      .from('razorpay_payment_events')
      .insert({
        event_id: eventId,
        event_type: event.event,
        payload: JSON.parse(rawBody),
        processed: false,
      } as never);

    // Process payment.captured events
    if (event.event === 'payment.captured' && event.payload.payment) {
      const payment = event.payload.payment.entity;
      const profileId = payment.notes?.profile_id;
      const planId = payment.notes?.plan_id;

      if (profileId && planId) {
        // Update payment_transaction status
        await supabase
          .from('payment_transactions')
          .update({
            razorpay_payment_id: payment.id,
            status: 'captured',
            updated_at: new Date().toISOString(),
          } as never)
          .eq('razorpay_order_id', payment.order_id)
          .eq('profile_id', profileId);

        // Check if a policy already exists for this order (created by verify route)
        const { data: existingPolicyRaw } = await supabase
          .from('weekly_policies')
          .select('id')
          .eq('razorpay_order_id', payment.order_id)
          .single();

        const existingPolicy = existingPolicyRaw as unknown as { id: string } | null;

        if (!existingPolicy) {
          // Look up the plan to create the policy
          const { data: planRaw } = await supabase
            .from('plan_packages')
            .select('*')
            .eq('id', planId)
            .single();

          if (planRaw) {
            const plan = planRaw as unknown as PlanPackageRow;
            const weekStart = getWeekStart();
            const weekEnd = getWeekEnd();

            await supabase
              .from('weekly_policies')
              .insert({
                profile_id: profileId,
                plan_id: planId,
                week_start_date: formatDate(weekStart),
                week_end_date: formatDate(weekEnd),
                base_premium_inr: plan.weekly_premium_inr,
                weather_risk_addon: 0,
                ubi_addon: 0,
                final_premium_inr: plan.weekly_premium_inr,
                is_active: true,
                payment_status: 'paid',
                razorpay_order_id: payment.order_id,
                razorpay_payment_id: payment.id,
                total_payout_this_week: 0,
              } as never);
          }

          // Mark onboarding complete
          await supabase
            .from('profiles')
            .update({
              onboarding_status: 'complete',
              updated_at: new Date().toISOString(),
            } as never)
            .eq('id', profileId);
        }
      }
    }

    // Mark event as processed
    await supabase
      .from('razorpay_payment_events')
      .update({ processed: true } as never)
      .eq('event_id', eventId);

    return NextResponse.json({ status: 'processed' });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
