// ============================================================================
// Adjudicator Core — Main orchestrator
// Runs every 15 minutes, checks all 5 triggers for active zones
// ============================================================================

import { getActiveZones } from './zones';
import { isDuplicateEvent, insertDisruptionEvent } from './events';
import { processClaimsForEvent } from './claims';
import { logTriggerResult, logSystemEvent } from './ledger';
import { checkRainfallTrigger } from './triggers/rainfall';
import { checkAqiTrigger } from './triggers/aqi';
import { checkCycloneTrigger } from './triggers/cyclone';
import { checkOutageTrigger } from './triggers/platform-outage';
import { checkCurfewBandhTrigger } from './triggers/curfew-bandh';
import type { TriggerCandidate, AdjudicatorResult, ZoneInfo } from './types';
import type { DisruptionType } from '@/lib/config/constants';

type TriggerChecker = (city: string, lat: number, lng: number) => Promise<TriggerCandidate | null>;

const TRIGGER_CHECKERS: Record<DisruptionType, TriggerChecker> = {
  heavy_rainfall: checkRainfallTrigger,
  aqi_grap_iv: checkAqiTrigger,
  cyclone: checkCycloneTrigger,
  platform_outage: checkOutageTrigger,
  curfew_bandh: checkCurfewBandhTrigger,
};

/**
 * Main adjudicator entry point
 */
export async function runAdjudicatorCore(): Promise<AdjudicatorResult> {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const result: AdjudicatorResult = {
    run_id: runId,
    started_at: startedAt,
    completed_at: '',
    zones_checked: 0,
    triggers_detected: [],
    events_created: 0,
    claims_created: 0,
    payouts_initiated: 0,
    errors: [],
  };

  try {
    // 1. Get all active zones
    const zones = await getActiveZones();
    result.zones_checked = zones.length;

    if (zones.length === 0) {
      await logSystemEvent('adjudicator_run', 'info', {
        run_id: runId,
        message: 'No active zones found',
      });
      result.completed_at = new Date().toISOString();
      return result;
    }

    // 2. For each zone, run all 5 trigger checks in parallel
    for (const zone of zones) {
      const candidates = await checkAllTriggersForZone(zone, runId);

      // 3. Process each valid trigger
      for (const candidate of candidates) {
        result.triggers_detected.push(candidate);

        // Check for duplicate events
        const isDupe = await isDuplicateEvent(candidate);
        if (isDupe) continue;

        // Insert disruption event
        const eventId = await insertDisruptionEvent(candidate);
        if (!eventId) {
          result.errors.push(`Failed to insert event for ${candidate.event_type} in ${candidate.city}`);
          continue;
        }

        result.events_created++;

        // Process claims for affected policies
        const claimResult = await processClaimsForEvent(eventId, candidate);
        result.claims_created += claimResult.claims_created;
        result.payouts_initiated += claimResult.payouts_initiated;
      }
    }

    // Log the run
    await logSystemEvent('adjudicator_run', 'info', {
      run_id: runId,
      zones_checked: result.zones_checked,
      triggers_detected: result.triggers_detected.length,
      events_created: result.events_created,
      claims_created: result.claims_created,
      duration_ms: Date.now() - new Date(startedAt).getTime(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(message);

    await logSystemEvent('adjudicator_run', 'error', {
      run_id: runId,
      error: message,
    });
  }

  result.completed_at = new Date().toISOString();
  return result;
}

/**
 * Run all 5 trigger checks for a single zone in parallel
 */
async function checkAllTriggersForZone(
  zone: ZoneInfo,
  runId: string
): Promise<TriggerCandidate[]> {
  const candidates: TriggerCandidate[] = [];
  const triggerTypes = Object.keys(TRIGGER_CHECKERS) as DisruptionType[];

  const results = await Promise.allSettled(
    triggerTypes.map(async (type) => {
      const start = Date.now();
      try {
        const candidate = await TRIGGER_CHECKERS[type](zone.city, zone.latitude, zone.longitude);
        const latency = Date.now() - start;

        await logTriggerResult({
          adjudicator_run_id: runId,
          event_type: type,
          city: zone.city,
          trigger_value: candidate?.trigger_value ?? null,
          outcome: candidate ? 'triggered' : 'no_pay',
          claims_created: 0,
          payouts_initiated: 0,
          latency_ms: latency,
        });

        return candidate;
      } catch (error) {
        const latency = Date.now() - start;
        const message = error instanceof Error ? error.message : String(error);

        await logTriggerResult({
          adjudicator_run_id: runId,
          event_type: type,
          city: zone.city,
          trigger_value: null,
          outcome: 'error',
          claims_created: 0,
          payouts_initiated: 0,
          error_message: message,
          latency_ms: latency,
        });

        return null;
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      candidates.push(result.value);
    }
  }

  return candidates;
}
