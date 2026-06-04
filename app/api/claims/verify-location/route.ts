// ============================================================================
// POST /api/claims/verify-location — Trigger Gate 2 verification for a claim
// ============================================================================

import { NextResponse } from 'next/server';
import { parseBody, errorResponse, successResponse } from '@/lib/utils/api';
import { getSession } from '@/lib/utils/auth';
import { verifyLocationSchema } from '@/lib/validations/schemas';
import { processClaimVerification } from '@/lib/claims/engine';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ParametricClaim } from '@/lib/types/database';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await parseBody(request, verifyLocationSchema);

    // Verify the claim belongs to the user
    const supabase = createAdminClient();
    const { data: claimRaw } = await supabase
      .from('parametric_claims')
      .select('id, profile_id, status')
      .eq('id', body.claim_id)
      .single();

    if (!claimRaw) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const claim = claimRaw as unknown as Pick<ParametricClaim, 'id' | 'profile_id' | 'status'>;

    if (claim.profile_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only process claims that are at gate1_passed stage
    if (claim.status !== 'gate1_passed') {
      return NextResponse.json(
        { error: `Claim is in '${claim.status}' status, expected 'gate1_passed'` },
        { status: 400 }
      );
    }

    const result = await processClaimVerification(body.claim_id, body.latitude, body.longitude);

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
