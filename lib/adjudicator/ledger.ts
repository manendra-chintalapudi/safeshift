// ============================================================================
// Parametric Trigger Ledger — Audit trail for every adjudicator run
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import type { DisruptionType } from '@/lib/config/constants';

export async function logTriggerResult(params: {
  adjudicator_run_id: string;
  event_type: DisruptionType;
  city: string;
  trigger_value: number | null;
  outcome: 'triggered' | 'no_pay' | 'deferred' | 'error';
  claims_created: number;
  payouts_initiated: number;
  error_message?: string;
  latency_ms: number;
}): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('parametric_trigger_ledger').insert({
    adjudicator_run_id: params.adjudicator_run_id,
    event_type: params.event_type,
    city: params.city,
    trigger_value: params.trigger_value,
    outcome: params.outcome,
    claims_created: params.claims_created,
    payouts_initiated: params.payouts_initiated,
    error_message: params.error_message || null,
    rule_version: '1.0',
    latency_ms: params.latency_ms,
  } as never);
}

export async function logSystemEvent(
  eventType: string,
  severity: 'info' | 'warning' | 'error',
  metadata: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('system_logs').insert({
    event_type: eventType,
    severity,
    metadata: metadata as unknown as null,
  } as never);
}
