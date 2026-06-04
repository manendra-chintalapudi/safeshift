// ============================================================================
// GET /api/cron/activate-policies — Activate paid policies on Monday, expire old ones
// ============================================================================

import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/utils/admin-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate, nowIST } from '@/lib/utils/date';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const today = formatDate(nowIST());

    // 1. Activate policies whose week starts today and are paid/demo but not yet active
    const { data: activated, error: activateError } = await supabase
      .from('weekly_policies')
      .update({ is_active: true } as never)
      .eq('week_start_date', today)
      .in('payment_status', ['paid', 'demo'])
      .eq('is_active', false)
      .select('id');

    if (activateError) {
      console.error('[Cron/ActivatePolicies] Activation error:', activateError);
      throw activateError;
    }

    // 2. Expire policies whose week has ended but are still marked active
    const { data: expired, error: expireError } = await supabase
      .from('weekly_policies')
      .update({ is_active: false } as never)
      .lt('week_end_date', today)
      .eq('is_active', true)
      .select('id');

    if (expireError) {
      console.error('[Cron/ActivatePolicies] Expiration error:', expireError);
      throw expireError;
    }

    const activatedCount = activated?.length ?? 0;
    const expiredCount = expired?.length ?? 0;

    console.log(
      `[Cron/ActivatePolicies] Date: ${today} | Activated: ${activatedCount} | Expired: ${expiredCount}`
    );

    return NextResponse.json({
      status: 'ok',
      date: today,
      activated: activatedCount,
      expired: expiredCount,
    });
  } catch (error) {
    console.error('[Cron/ActivatePolicies] Error:', error);
    return NextResponse.json(
      { error: 'Activate policies cron failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
