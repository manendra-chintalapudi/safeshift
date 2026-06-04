// ============================================================================
// GET /api/driver/coins — Return coin balance + recent history
// ============================================================================

import { NextResponse } from 'next/server';
import { errorResponse, successResponse } from '@/lib/utils/api';
import { getSession } from '@/lib/utils/auth';
import { getBalance } from '@/lib/rewards/redemption';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CoinsLedgerEntry } from '@/lib/types/database';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileId = session.user.id;

    // Get balance
    const balance = await getBalance(profileId);

    // Get recent coin history (last 20 entries)
    const supabase = createAdminClient();
    const { data: historyRaw } = await supabase
      .from('coins_ledger')
      .select('id, activity, coins, description, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(20);

    const history = (historyRaw ?? []) as unknown as Pick<
      CoinsLedgerEntry,
      'id' | 'activity' | 'coins' | 'description' | 'created_at'
    >[];

    return successResponse({ balance, history });
  } catch (error) {
    return errorResponse(error);
  }
}
