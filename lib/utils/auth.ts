// ============================================================================
// Auth Utilities — server-side user identification
// ----------------------------------------------------------------------------
// All helpers go through supabase.auth.getUser(), which validates the JWT
// against the Supabase auth server. We intentionally do NOT use
// supabase.auth.getSession() server-side — the warning Supabase emits when
// you do is correct: the session object is read straight from cookies and
// can be spoofed if anyone has access to forge them. getUser() round-trips
// to auth and returns the canonical user.
// ============================================================================

import { createServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types/database';

/**
 * Get the validated, server-authenticated user. Returns null if not signed in.
 */
export async function getAuthUser(): Promise<User | null> {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Backwards-compatible session getter. Existing call sites that read
 * `session.user.id` keep working. New code should prefer getAuthUser().
 */
export async function getSession(): Promise<{ user: User } | null> {
  const user = await getAuthUser();
  return user ? { user } : null;
}

/**
 * Get current user's profile from `profiles` table.
 */
export async function getProfile(): Promise<Profile | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

/**
 * Require authentication — throws if not signed in.
 */
export async function requireAuth(): Promise<{ user: User }> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return { user };
}
