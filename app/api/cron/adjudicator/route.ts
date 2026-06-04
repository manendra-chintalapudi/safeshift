import { NextResponse } from 'next/server';
import { runAdjudicatorCore } from '@/lib/adjudicator/core';
import { verifyCronSecret } from '@/lib/utils/admin-guard';

export async function GET(request: Request) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runAdjudicatorCore();

    return NextResponse.json({
      status: 'ok',
      ...result,
    });
  } catch (error) {
    console.error('[Cron] Adjudicator error:', error);
    return NextResponse.json(
      { error: 'Adjudicator failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
