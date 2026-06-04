// ============================================================================
// POST /api/driver/toggle-auto-pay — Toggle auto-renew for weekly premium
// ============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody, errorResponse, successResponse } from '@/lib/utils/api';
import { getSession } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const toggleAutoPaySchema = z.object({
  enabled: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await parseBody(request, toggleAutoPaySchema);
    const profileId = session.user.id;
    const supabase = createAdminClient();

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        auto_renew_enabled: body.enabled,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', profileId);

    if (updateError) {
      console.error('[ToggleAutoPay] Error updating profile:', updateError);
      throw new Error('Failed to update auto-pay preference');
    }

    return successResponse({
      success: true,
      auto_renew_enabled: body.enabled,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
