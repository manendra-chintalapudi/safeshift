import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayClient } from '@/lib/payments/razorpay';

export async function POST() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    // Get profile
    const { data: profile } = await admin
      .from('profiles')
      .select('razorpay_subscription_id')
      .eq('id', user.id)
      .single();

    const p = profile as unknown as { razorpay_subscription_id: string | null } | null;
    if (!p?.razorpay_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }

    // Cancel in Razorpay
    const razorpay = getRazorpayClient();
    await razorpay.subscriptions.cancel(p.razorpay_subscription_id);

    // Update profile
    await admin.from('profiles').update({
      razorpay_subscription_id: null,
      auto_renew_enabled: false,
    } as never).eq('id', user.id);

    return NextResponse.json({ status: 'cancelled' });
  } catch (error) {
    console.error('[Subscription] Cancel error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
