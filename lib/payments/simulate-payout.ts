// ============================================================================
// Payout Simulation — Mock UPI payout pipeline
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { createAssetLock } from '@/lib/fraud/asset-lock';

interface PayoutResult {
  success: boolean;
  transactionId: string;
  amount: number;
  error?: string;
}

/**
 * Simulate a UPI payout for an approved claim
 * - Insert into payout_ledger with mock UPI ref
 * - Update claim status to 'paid' + payout_completed_at
 * - Update weekly_policy.total_payout_this_week
 * - Create vehicle asset lock
 */
export async function simulatePayout(
  claimId: string,
  profileId: string,
  amountInr: number
): Promise<PayoutResult> {
  const supabase = createAdminClient();

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const mockUpiRef = `SAFESHIFT_UPI_${timestamp}_${random}`;

  try {
    // Insert into payout_ledger
    const { error: payoutError } = await supabase
      .from('payout_ledger')
      .insert({
        claim_id: claimId,
        profile_id: profileId,
        amount_inr: amountInr,
        payout_method: 'upi_mock',
        status: 'completed',
        mock_upi_ref: mockUpiRef,
        completed_at: new Date().toISOString(),
      } as never);

    if (payoutError) {
      console.error('[Payout] Error inserting payout ledger:', payoutError);
      return { success: false, transactionId: '', amount: amountInr, error: payoutError.message };
    }

    // Update claim status to 'paid'
    const now = new Date().toISOString();
    await supabase
      .from('parametric_claims')
      .update({
        status: 'paid',
        gateway_transaction_id: mockUpiRef,
        payout_initiated_at: now,
        payout_completed_at: now,
      } as never)
      .eq('id', claimId);

    // Get claim's policy_id to update weekly payout
    const { data: claimRaw } = await supabase
      .from('parametric_claims')
      .select('policy_id')
      .eq('id', claimId)
      .single();

    if (claimRaw) {
      const claim = claimRaw as unknown as { policy_id: string };

      // Get current total and update
      const { data: policyRaw } = await supabase
        .from('weekly_policies')
        .select('total_payout_this_week')
        .eq('id', claim.policy_id)
        .single();

      if (policyRaw) {
        const policy = policyRaw as unknown as { total_payout_this_week: number };
        await supabase
          .from('weekly_policies')
          .update({
            total_payout_this_week: policy.total_payout_this_week + amountInr,
          } as never)
          .eq('id', claim.policy_id);
      }
    }

    // Create vehicle asset lock
    const { data: profileRaw } = await supabase
      .from('profiles')
      .select('vehicle_hash')
      .eq('id', profileId)
      .single();

    if (profileRaw) {
      const profile = profileRaw as unknown as { vehicle_hash: string | null };
      if (profile.vehicle_hash) {
        await createAssetLock(profile.vehicle_hash, profileId, claimId);
      }
    }

    return {
      success: true,
      transactionId: mockUpiRef,
      amount: amountInr,
    };
  } catch (error) {
    console.error('[Payout] Unexpected error:', error);
    return {
      success: false,
      transactionId: '',
      amount: amountInr,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
