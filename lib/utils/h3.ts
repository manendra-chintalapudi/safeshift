// ============================================================================
// H3 zone helpers — thin wrapper around h3-js
// ----------------------------------------------------------------------------
// We use H3 resolution 8 (~0.74 km² per cell, ~920m across). This is fine
// enough that a driver's heartbeat maps to exactly one cell, and coarse
// enough that a city core fits in ~40-60 cells.
// ============================================================================

import { cellToBoundary, cellToLatLng, gridDisk, gridDistance, latLngToCell } from 'h3-js';
import type { DisruptionType } from '@/lib/config/constants';

export const H3_RESOLUTION = 8;

// Ring size per disruption type. Bigger ring = larger affected disk.
// At resolution 8, ring N covers ~ N × 0.92 km radius.
export const RING_SIZE_BY_TYPE: Record<DisruptionType, number> = {
  heavy_rainfall: 3,    // ~2.8 km — localized monsoon cell
  aqi_grap_iv: 5,       // ~4.6 km — pollution band
  cyclone: 10,          // ~9 km — wider wind field
  platform_outage: 15,  // ~14 km — full metro area
  curfew_bandh: 7,      // ~6.4 km — locality / neighborhood
};

/** Convert a lat/lng to an H3 cell at our default resolution. */
export function toCell(lat: number, lng: number): string {
  return latLngToCell(lat, lng, H3_RESOLUTION);
}

/** Centroid of an H3 cell, as [lat, lng]. */
export function cellCenter(cell: string): [number, number] {
  return cellToLatLng(cell);
}

/** Boundary polygon of an H3 cell, as [[lat, lng], ...]. */
export function cellPolygon(cell: string): [number, number][] {
  return cellToBoundary(cell) as [number, number][];
}

/** All cells within `ringSize` hops of the center (incl. center). */
export function disk(centerCell: string, ringSize: number): string[] {
  return gridDisk(centerCell, Math.max(0, ringSize));
}

/** Hop distance between two cells. Returns -1 if undefined (not adjacent grid). */
export function distance(a: string, b: string): number {
  try {
    return gridDistance(a, b);
  } catch {
    return -1;
  }
}

/** Is `cell` inside a disk of `ringSize` centered on `centerCell`? */
export function isInDisk(cell: string, centerCell: string, ringSize: number): boolean {
  const d = distance(cell, centerCell);
  return d >= 0 && d <= ringSize;
}

/** Default ring size for a disruption type. */
export function defaultRingSize(eventType: DisruptionType): number {
  return RING_SIZE_BY_TYPE[eventType] ?? 5;
}
