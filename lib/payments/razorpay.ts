// ============================================================================
// Razorpay Client — Singleton instance
// ============================================================================

import Razorpay from 'razorpay';
import { razorpayKeyId, razorpayKeySecret } from '@/lib/config/env';

let instance: InstanceType<typeof Razorpay> | null = null;

/**
 * Get or create the singleton Razorpay client.
 */
export function getRazorpayClient(): InstanceType<typeof Razorpay> {
  if (instance) return instance;

  instance = new Razorpay({
    key_id: razorpayKeyId(),
    key_secret: razorpayKeySecret(),
  });

  return instance;
}
