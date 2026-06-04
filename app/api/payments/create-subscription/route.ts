import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayClient } from '@/lib/payments/razorpay';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan_id } = await request.json();
    if (!plan_id) return NextResponse.json({ error: 'plan_id required' }, { status: 400 });

    const admin = createAdminClient();

    // Get plan
    const { data: plan } = await admin
      .from('plan_packages')
      .select('*')
      .eq('id', plan_id)
      .single();

    const p = plan as unknown as { weekly_premium_inr: number; razorpay_plan_id: string | null; name: string } | null;
    if (!p) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const razorpay = getRazorpayClient();

    // Create or use existing Razorpay plan
    let razorpayPlanId = p.razorpay_plan_id;
    if (!razorpayPlanId) {
      const rpPlan = await razorpay.plans.create({
        period: 'weekly',
        interval: 1,
        item: {
          name: `SafeShift ${p.name} Plan`,
          amount: Math.round(p.weekly_premium_inr * 100),
          currency: 'INR',
        },
      });
      razorpayPlanId = rpPlan.id;
      await admin.from('plan_packages').update({ razorpay_plan_id: razorpayPlanId } as never).eq('id', plan_id);
    }

    // Create subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 52, // ~1 year of weeks
      quantity: 1,
    });

    // Update profile
    await admin.from('profiles').update({
      razorpay_subscription_id: subscription.id,
      auto_renew_enabled: true,
    } as never).eq('id', user.id);

    return NextResponse.json({
      subscription_id: subscription.id,
      short_url: subscription.short_url,
    });
  } catch (error) {
    console.error('[Subscription] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
