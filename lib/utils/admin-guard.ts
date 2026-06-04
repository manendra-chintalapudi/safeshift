// ============================================================================
// Admin Guard — Verify admin role
// ============================================================================

import { NextResponse } from 'next/server';
import { getProfile } from './auth';

/**
 * Check if current user is an admin. Returns profile if admin, or NextResponse error.
 */
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
  }
  return profile;
}

/**
 * Verify cron secret for scheduled endpoints
 */
export function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  // Support both Authorization: Bearer and x-cron-secret headers
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;
  const cronHeader = request.headers.get('x-cron-secret');
  if (cronHeader === cronSecret) return true;
  return false;
}
