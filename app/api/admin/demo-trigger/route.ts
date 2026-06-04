import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { demoTriggerSchema } from '@/lib/validations/schemas';
import { getCityBySlug } from '@/lib/config/cities';
import { TRIGGERS } from '@/lib/config/constants';
import { setMockPlatformStatus } from '@/lib/clients/statusgator';
import { processClaimsForEvent } from '@/lib/adjudicator/claims';
import { toCell, disk, defaultRingSize } from '@/lib/utils/h3';
import type { DisruptionType } from '@/lib/config/constants';
import type { TriggerCandidate } from '@/lib/adjudicator/types';

export async function POST(request: Request) {
  try {
    // Auth check — get user ID if available (no role restriction for hackathon demo)
    let userId: string | null = null;
    try {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Server client may fail if cookies aren't available
    }

    const admin = createAdminClient();

    const body = await request.json();
    const { city, event_type, severity, trigger_value, zone_latitude, zone_longitude, h3_ring_size } =
      demoTriggerSchema.parse(body);

    const cityData = getCityBySlug(city);
    if (!cityData) {
      return NextResponse.json({ error: 'Unknown city' }, { status: 400 });
    }

    const triggerConfig = TRIGGERS[event_type as DisruptionType];
    const actualTriggerValue = trigger_value ?? triggerConfig.threshold * 1.5;

    // If the admin dropped a pin, fire at that exact location; otherwise fall
    // back to the city centroid so existing one-click demos keep working.
    const originLat = zone_latitude ?? cityData.latitude;
    const originLng = zone_longitude ?? cityData.longitude;
    const ringSize = h3_ring_size ?? defaultRingSize(event_type as DisruptionType);
    const centerCell = toCell(originLat, originLng);
    const affectedCells = disk(centerCell, ringSize);

    if (event_type === 'platform_outage') {
      setMockPlatformStatus('down', actualTriggerValue);
    }

    // Insert disruption event
    const { data: event, error } = await admin
      .from('live_disruption_events')
      .insert({
        event_type,
        severity_score: severity,
        city,
        zone_latitude: originLat,
        zone_longitude: originLng,
        geofence_radius_km: triggerConfig.geofence_radius_km,
        center_h3_cell: centerCell,
        h3_ring_size: ringSize,
        affected_h3_cells: affectedCells,
        trigger_value: actualTriggerValue,
        trigger_threshold: triggerConfig.threshold,
        verified_by_api: true,
        raw_api_data: { demo: true, injected_by: userId || 'admin' } as unknown as null,
        data_sources: ['demo-panel'],
        rule_version: 'demo',
      } as never)
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const evt = event as { id: string } | null;
    if (!evt?.id) {
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    // Also process claims for affected policies (like the adjudicator would).
    // Note: latitude/longitude carry the pin-drop location so downstream
    // haversine fallbacks behave consistently with the H3 disk.
    const candidate: TriggerCandidate = {
      event_type: event_type as DisruptionType,
      city,
      latitude: originLat,
      longitude: originLng,
      severity_score: severity,
      trigger_value: actualTriggerValue,
      trigger_threshold: triggerConfig.threshold,
      geofence_radius_km: triggerConfig.geofence_radius_km,
      h3_ring_size: ringSize,
      data_sources: ['demo-panel'],
      raw_api_data: { demo: true },
      verified_by_api: true,
      verified_by_llm: false,
    };

    // processClaimsForEvent now runs the FULL zero-touch pipeline:
    // Gate 1 → Gate 2 → Fraud Detection → Auto-approve+pay OR Auto-reject
    const claimResult = await processClaimsForEvent(evt.id, candidate);
    const payoutsCompleted = claimResult.payouts_initiated;

    // Write to system_logs
    await admin.from('system_logs').insert({
      event_type: 'demo_trigger_fired',
      severity: 'info',
      metadata: {
        city,
        disruption_type: event_type,
        severity_score: severity,
        trigger_value: actualTriggerValue,
        event_id: evt.id,
        claims_created: claimResult.claims_created,
        payouts_completed: payoutsCompleted,
        injected_by: userId || 'admin',
      },
    } as never);

    // Write to parametric_trigger_ledger
    await admin.from('parametric_trigger_ledger').insert({
      event_type,
      city,
      trigger_value: actualTriggerValue,
      outcome: claimResult.claims_created > 0 ? 'triggered' : 'no_pay',
      claims_created: claimResult.claims_created,
      payouts_initiated: payoutsCompleted,
      latency_ms: Date.now() - Date.now(), // approximate
      error_message: null,
    } as never);

    return NextResponse.json({
      status: 'ok',
      event_id: evt.id,
      claims_created: claimResult.claims_created,
      payouts_completed: payoutsCompleted,
      message: `Demo ${event_type} trigger injected for ${city}. ${claimResult.claims_created} claim(s) created, ${payoutsCompleted} payout(s) completed.`,
    });
  } catch (error) {
    console.error('[Admin] Demo trigger error:', error);

    // Log the error too
    try {
      const admin = createAdminClient();
      await admin.from('system_logs').insert({
        event_type: 'demo_trigger_error',
        severity: 'error',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      } as never);
    } catch { /* best effort */ }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}
