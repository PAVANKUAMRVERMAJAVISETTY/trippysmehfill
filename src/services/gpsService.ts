/**
 * gpsService — single responsibility: everything about the customer's physical location.
 *
 * 🎯 INTERVIEW QUESTION: "How do you compute the distance between two GPS points on Earth?"
 *    Answer: the Haversine formula — great-circle distance on a sphere, O(1) time and space.
 */

// Kitchen origin used for the anti-fraud radius check (Hyderabad cloud kitchen).
export const KITCHEN_COORDS = { latitude: 17.385044, longitude: 78.486671 };

// Cash-on-delivery is only allowed inside this radius, in kilometres.
export const COD_RADIUS_KM = 10;

const EARTH_RADIUS_KM = 6371; // mean Earth radius used by the Haversine formula
const toRad = (deg: number) => (deg * Math.PI) / 180; // degrees -> radians helper

/**
 * [DSA / ALGORITHM] Haversine great-circle distance.
 * WHY: straight-line "as the crow flies" distance is enough to reject COD orders
 * placed from far away (a classic fake-order pattern) without paying for a maps API.
 */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRad(b.latitude - a.latitude); // latitude delta in radians
  const dLon = toRad(b.longitude - a.longitude); // longitude delta in radians
  // h = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  // c = 2 · atan2(√h, √(1−h)) — the central angle between the two points
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c; // arc length = radius × angle
}

/** True when the live GPS fix is close enough to the kitchen for cash on delivery. */
export function isWithinCodRadius(fix: { latitude: number; longitude: number }): boolean {
  return haversineKm(KITCHEN_COORDS, fix) <= COD_RADIUS_KM;
}

/** Formats the distance for the UI, e.g. "3.4 km away". */
export function distanceLabel(fix: { latitude: number; longitude: number }): string {
  return `${haversineKm(KITCHEN_COORDS, fix).toFixed(1)} km from the kitchen`;
}
