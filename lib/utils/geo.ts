// ============================================================================
// Geospatial Utilities
// ============================================================================

/**
 * Haversine distance between two lat/lng points in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is within a circular geofence
 */
export function isWithinCircle(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): boolean {
  return haversineDistance(pointLat, pointLng, centerLat, centerLng) <= radiusKm;
}

/**
 * Calculate severity score using linear interpolation
 */
export function calculateSeverity(
  value: number,
  range: [number, number],
  severityMin: number = 5.0,
  severityMax: number = 10.0
): number {
  const [rangeMin, rangeMax] = range;
  if (value <= rangeMin) return severityMin;
  if (value >= rangeMax) return severityMax;
  const ratio = (value - rangeMin) / (rangeMax - rangeMin);
  return severityMin + ratio * (severityMax - severityMin);
}
