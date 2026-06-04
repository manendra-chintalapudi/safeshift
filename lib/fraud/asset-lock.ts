// ============================================================================
// Vehicle Asset Lock — Prevent double-claiming on same vehicle
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { CLAIM_RULES } from '@/lib/config/constants';

interface AssetLockCheckResult {
  locked: boolean;
  lockedBySame: boolean;
  reason?: string;
}

/**
 * Check if a vehicle is already asset-locked
 * - Locked by DIFFERENT profile = flag "vehicle_already_claimed"
 * - Locked by SAME profile = skip (already processed)
 * - No lock = OK
 */
export async function checkAssetLock(
  vehicleHash: string,
  profileId: string
): Promise<AssetLockCheckResult> {
  const supabase = createAdminClient();

  const { data: lockRaw } = await supabase
    .from('vehicle_asset_locks')
    .select('id, profile_id, expires_at')
    .eq('vehicle_hash', vehicleHash)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .single();

  if (!lockRaw) {
    return { locked: false, lockedBySame: false };
  }

  const lock = lockRaw as unknown as { id: string; profile_id: string; expires_at: string };

  if (lock.profile_id === profileId) {
    return { locked: true, lockedBySame: true };
  }

  return {
    locked: true,
    lockedBySame: false,
    reason: 'vehicle_already_claimed',
  };
}

/**
 * Create an asset lock for a vehicle with 24h expiry
 */
export async function createAssetLock(
  vehicleHash: string,
  profileId: string,
  claimId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const expiresAt = new Date(
    Date.now() + CLAIM_RULES.ASSET_LOCK_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabase
    .from('vehicle_asset_locks')
    .insert({
      vehicle_hash: vehicleHash,
      profile_id: profileId,
      claim_id: claimId,
      locked_at: new Date().toISOString(),
      expires_at: expiresAt,
    } as never);

  if (error) {
    console.error('[AssetLock] Error creating lock:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
