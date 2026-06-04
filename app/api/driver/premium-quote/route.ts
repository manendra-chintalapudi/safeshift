import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { calculateDynamicPremium } from '@/lib/ml/premium-calc';

/**
 * POST /api/driver/premium-quote
 * Returns the ML-calculated dynamic premium for a given tier.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tier } = await request.json();
    if (!tier) return NextResponse.json({ error: 'tier required' }, { status: 400 });

    const result = await calculateDynamicPremium(user.id, tier);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[PremiumQuote] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    );
  }
}
