// ============================================================================
// POST /api/payments/create-order — Create a Razorpay order for premium
// ============================================================================

import { NextResponse } from 'next/server';
import { parseBody, errorResponse, successResponse } from '@/lib/utils/api';
import { getSession } from '@/lib/utils/auth';
import { createOrderSchema } from '@/lib/validations/schemas';
import { createOrder } from '@/lib/payments/create-order';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlanPackageRow } from '@/lib/types/database';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await parseBody(request, createOrderSchema);

    // Resolve plan_id from plan_slug if needed
    let planId = body.plan_id;
    if (!planId && body.plan_slug) {
      const supabase = createAdminClient();
      const { data: planRaw, error: planError } = await supabase
        .from('plan_packages')
        .select('id')
        .eq('slug', body.plan_slug)
        .single();

      if (planError || !planRaw) {
        return NextResponse.json({ error: 'Plan not found for slug: ' + body.plan_slug }, { status: 404 });
      }
      planId = (planRaw as unknown as PlanPackageRow).id;
    }

    const result = await createOrder({
      profileId: session.user.id,
      planId: planId!,
    });

    return successResponse({
      ...result,
      plan_id: planId,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
