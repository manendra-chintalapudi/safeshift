import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/driver/notifications
 * Returns recent notification-worthy events: policy purchases, coin awards, claims.
 */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    const [coinsRes, claimsRes, policiesRes] = await Promise.all([
      // Recent coin activity — awards and redemptions (last 20)
      admin
        .from('coins_ledger')
        .select('activity, coins, description, created_at')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),

      // Recent claims (last 10)
      admin
        .from('parametric_claims')
        .select('id, payout_amount_inr, status, created_at, live_disruption_events(event_type, city)')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),

      // Recent policy purchases (last 10)
      admin
        .from('weekly_policies')
        .select('week_start_date, week_end_date, final_premium_inr, is_active, payment_status, plan_packages(name, tier), created_at')
        .eq('profile_id', user.id)
        .in('payment_status', ['paid', 'demo'])
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    interface Notification {
      type: 'claim' | 'coin' | 'policy';
      message: string;
      timestamp: string;
      pinned: boolean;
    }

    const notifications: Notification[] = [];

    // Claims — pinned to top
    const claims = (claimsRes.data ?? []) as unknown as Array<{
      id: string; payout_amount_inr: number; status: string; created_at: string;
      live_disruption_events: { event_type: string; city: string } | null;
    }>;
    for (const c of claims) {
      const event = c.live_disruption_events?.event_type?.replace(/_/g, ' ') ?? 'disruption';
      const statusLabel = c.status === 'paid' ? 'Payout completed' : c.status === 'triggered' ? 'Claim triggered' : c.status;
      notifications.push({
        type: 'claim',
        message: `${statusLabel} — ₹${c.payout_amount_inr} for ${event}`,
        timestamp: c.created_at,
        pinned: true,
      });
    }

    // Policy purchases
    const policies = (policiesRes.data ?? []) as unknown as Array<{
      week_start_date: string; week_end_date: string; final_premium_inr: number;
      is_active: boolean; payment_status: string;
      plan_packages: { name: string; tier: string } | null; created_at: string;
    }>;
    for (const p of policies) {
      const planName = p.plan_packages?.name ?? p.plan_packages?.tier ?? 'Plan';
      notifications.push({
        type: 'policy',
        message: `${planName} policy purchased — ₹${p.final_premium_inr}/wk (${p.week_start_date} to ${p.week_end_date})`,
        timestamp: p.created_at,
        pinned: false,
      });
    }

    // Coin awards
    const coins = (coinsRes.data ?? []) as unknown as Array<{
      activity: string; coins: number; description: string; created_at: string;
    }>;
    for (const c of coins) {
      const isRedemption = c.coins < 0;
      notifications.push({
        type: 'coin',
        message: isRedemption
          ? `${c.coins} SafeShift Coins — ${c.description || 'Redeemed for discount'}`
          : `+${c.coins} SafeShift Coins — ${c.description || c.activity}`,
        timestamp: c.created_at,
        pinned: false,
      });
    }

    // Sort: pinned first, then by timestamp desc
    notifications.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return NextResponse.json({ notifications: notifications.slice(0, 30) });
  } catch (error) {
    console.error('[Notifications] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
