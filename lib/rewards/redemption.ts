// ============================================================================
// Rewards Redemption — Convert coins to discounts or free weeks
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import { COINS } from '@/lib/config/constants';

interface RedemptionResult {
  success: boolean;
  discountInr?: number;
  freeWeek?: boolean;
  remainingBalance: number;
  error?: string;
}

/**
 * Get current coin balance for a profile
 */
export async function getBalance(profileId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('driver_coin_balance')
    .select('balance')
    .eq('profile_id', profileId)
    .single();

  if (!data) return 0;

  const row = data as unknown as { balance: number };
  return row.balance ?? 0;
}

/**
 * Redeem 100 coins for a Rs 5 discount
 */
export async function redeemDiscount(profileId: string): Promise<RedemptionResult> {
  const balance = await getBalance(profileId);

  if (balance < COINS.DISCOUNT_COINS_REQUIRED) {
    return {
      success: false,
      remainingBalance: balance,
      error: `Need ${COINS.DISCOUNT_COINS_REQUIRED} coins, have ${balance}`,
    };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('coins_ledger')
    .insert({
      profile_id: profileId,
      activity: 'redeemed_discount',
      coins: -COINS.DISCOUNT_COINS_REQUIRED,
      description: `Redeemed ${COINS.DISCOUNT_COINS_REQUIRED} coins for ₹${COINS.DISCOUNT_RATE} discount`,
    } as never);

  if (error) {
    console.error('[Redemption] Error redeeming discount:', error);
    return { success: false, remainingBalance: balance, error: error.message };
  }

  const newBalance = balance - COINS.DISCOUNT_COINS_REQUIRED;

  return {
    success: true,
    discountInr: COINS.DISCOUNT_RATE,
    remainingBalance: newBalance,
  };
}

/**
 * Redeem 500 coins for a free week credit
 */
export async function redeemFreeWeek(profileId: string): Promise<RedemptionResult> {
  const balance = await getBalance(profileId);

  if (balance < COINS.FREE_WEEK_COINS_REQUIRED) {
    return {
      success: false,
      remainingBalance: balance,
      error: `Need ${COINS.FREE_WEEK_COINS_REQUIRED} coins, have ${balance}`,
    };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('coins_ledger')
    .insert({
      profile_id: profileId,
      activity: 'redeemed_free_week',
      coins: -COINS.FREE_WEEK_COINS_REQUIRED,
      description: `Redeemed ${COINS.FREE_WEEK_COINS_REQUIRED} coins for free week`,
    } as never);

  if (error) {
    console.error('[Redemption] Error redeeming free week:', error);
    return { success: false, remainingBalance: balance, error: error.message };
  }

  const newBalance = balance - COINS.FREE_WEEK_COINS_REQUIRED;

  return {
    success: true,
    freeWeek: true,
    remainingBalance: newBalance,
  };
}
