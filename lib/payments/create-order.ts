// ============================================================================
// Create Razorpay Order — Premium payment for a plan
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayClient } from '@/lib/payments/razorpay';
import type { PlanPackageRow } from '@/lib/types/database';

interface CreateOrderInput {
  profileId: string;
  planId: string;
}

interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  planName: string;
}

/**
 * Create a Razorpay order for the given profile and plan.
 * Inserts a payment_transaction record in the database.
 */
export async function createOrder({ profileId, planId }: CreateOrderInput): Promise<CreateOrderResult> {
  const supabase = createAdminClient();

  // Look up the plan
  const { data: planRaw, error: planError } = await supabase
    .from('plan_packages')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError || !planRaw) {
    throw new Error('Plan not found');
  }

  const plan = planRaw as unknown as PlanPackageRow;

  // Amount in paise (Razorpay uses smallest currency unit)
  const amountPaise = plan.weekly_premium_inr * 100;

  // Use real Razorpay on localhost, mock on deployed
  const isLocal = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === undefined;

  let order: { id: string; amount: number; currency: string };

  if (isLocal) {
    try {
      const razorpay = getRazorpayClient();
      const rzpOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `ss_${profileId.slice(0, 8)}_${Date.now()}`,
        notes: { plan_id: planId, plan_name: plan.name, profile_id: profileId },
      });
      order = { id: rzpOrder.id, amount: Number(rzpOrder.amount), currency: String(rzpOrder.currency) };
    } catch {
      // Fallback to mock if Razorpay fails locally
      order = { id: `order_mock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, amount: amountPaise, currency: 'INR' };
    }
  } else {
    // Mock order for deployed environments
    order = { id: `order_mock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, amount: amountPaise, currency: 'INR' };
  }

  // Insert payment_transaction record
  const { error: txError } = await supabase
    .from('payment_transactions')
    .insert({
      profile_id: profileId,
      razorpay_order_id: order.id,
      amount_inr: plan.weekly_premium_inr,
      status: 'created',
      metadata: { plan_id: planId, plan_name: plan.name },
    } as never);

  if (txError) {
    console.error('[CreateOrder] Error inserting payment_transaction:', txError);
    throw new Error('Failed to record payment transaction');
  }

  return {
    orderId: order.id,
    amount: amountPaise,
    currency: 'INR',
    planName: plan.name,
  };
}
