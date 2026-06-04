-- Fix: Infinite recursion in RLS policies
-- Run this in Supabase SQL Editor

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT
USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Admins can read all policies" ON weekly_policies;
CREATE POLICY "Admins can read all policies" ON weekly_policies FOR SELECT
USING (auth.uid() = profile_id OR auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Admins can read all claims" ON parametric_claims;
CREATE POLICY "Admins can read all claims" ON parametric_claims FOR SELECT
USING (auth.uid() = profile_id OR auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Admins can update claims" ON parametric_claims;
CREATE POLICY "Admins can update claims" ON parametric_claims FOR UPDATE
USING (auth.uid() = profile_id OR auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Admins can read all payouts" ON payout_ledger;
CREATE POLICY "Admins can read all payouts" ON payout_ledger FOR SELECT
USING (auth.uid() = profile_id OR auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Admins can read system logs" ON system_logs;
CREATE POLICY "Admins can read system logs" ON system_logs FOR SELECT
USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Admins can read trigger ledger" ON parametric_trigger_ledger;
CREATE POLICY "Admins can read trigger ledger" ON parametric_trigger_ledger FOR SELECT
USING (auth.jwt() ->> 'role' = 'service_role');
