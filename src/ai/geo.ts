// Commute estimate used by the allocation engine. Not a routing engine:
// straight-line distance × road factor at an average speed.
export const ROAD_FACTOR = 1.3;
export const AVG_SPEED_KMH = 50;

export interface LatLng {
  lat: number;
  lng: number;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** One-way commute in minutes (estimate). */
export function commuteMin(a: LatLng, b: LatLng): number {
  return ((haversineKm(a, b) * ROAD_FACTOR) / AVG_SPEED_KMH) * 60;
}
