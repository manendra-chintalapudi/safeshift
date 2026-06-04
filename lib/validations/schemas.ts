// ============================================================================
// Zod Validation Schemas
// ============================================================================

import { z } from 'zod';
import { DISRUPTION_TYPES, TIER_TYPES } from '@/lib/config/constants';

// --- Auth ---
export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone_number: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

// --- Onboarding ---
export const aadhaarSchema = z.object({
  aadhaar_number: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits'),
});

export const documentUploadSchema = z.object({
  dl_number: z.string().min(5, 'Invalid DL number'),
  rc_number: z.string().min(5, 'Invalid RC number'),
  dl_image_url: z.string().url().optional(),
  rc_image_url: z.string().url().optional(),
});

export const upiVerifySchema = z.object({
  upi_id: z.string().regex(/^[\w.\-]+@[\w]+$/, 'Invalid UPI ID format (e.g., name@upi)'),
});

export const citySelectSchema = z.object({
  city: z.string().min(1, 'City is required'),
  zone_latitude: z.number().min(-90).max(90),
  zone_longitude: z.number().min(-180).max(180),
});

export const tierSelectSchema = z.object({
  tier: z.enum(TIER_TYPES),
});

// --- Claims ---
export const verifyLocationSchema = z.object({
  claim_id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
});

export const appealSchema = z.object({
  claim_id: z.string().uuid(),
  evidence_url: z.string().url().optional(),
});

// --- Driver Activity ---
export const activityLogSchema = z.object({
  status: z.enum(['online', 'searching', 'on_trip', 'offline']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// --- Admin ---
export const demoTriggerSchema = z.object({
  city: z.string().min(1),
  event_type: z.enum(DISRUPTION_TYPES),
  severity: z.number().min(0).max(10),
  trigger_value: z.number().positive().optional(),
  // Zone-level overrides (pin-drop from the admin map). When present, override
  // the city centroid; the disruption fires at this exact point.
  zone_latitude: z.number().min(-90).max(90).optional(),
  zone_longitude: z.number().min(-180).max(180).optional(),
  h3_ring_size: z.number().int().min(0).max(30).optional(),
});

export const reviewClaimSchema = z.object({
  claim_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

// --- Coins ---
export const redeemCoinsSchema = z.object({
  type: z.enum(['discount', 'free_week']),
});

// --- Payments ---
export const createOrderSchema = z.object({
  plan_id: z.string().uuid().optional(),
  plan_slug: z.string().optional(),
}).refine(d => d.plan_id || d.plan_slug, { message: 'plan_id or plan_slug required' });

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  plan_id: z.string().uuid(),
  type: z.enum(['onboarding', 'renewal']).optional(),
  dynamic_premium: z.number().optional(),
});
