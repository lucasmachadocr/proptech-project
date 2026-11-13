// Madrid's 128 barrios (neighbourhood blocks) and how many available flats fall in each.
// Boundaries: Click That Hood (Code for America, OpenStreetMap-derived), simplified to ~64 KB in src/data/madridBarrios.json.

export interface BarrioFeature {
  type: 'Feature';
  properties: { name: string };
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] };
}
export interface BarrioFC {
  type: 'FeatureCollection';
  features: BarrioFeature[];
}

/** Ray casting: is the point inside the ring? Ring = [[lng, lat], ...], closed or not. */
export function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The barrio a point falls in (outer rings only; holes are rare in this set), or null outside the city. */
export function barrioOf(fc: BarrioFC, lng: number, lat: number): string | null {
  for (const f of fc.features) for (const poly of f.geometry.coordinates) if (pointInRing(lng, lat, poly[0])) return f.properties.name;
  return null;
}

/** Flats per barrio. Barrios with no flat are not in the map. */
export function barrioCounts(fc: BarrioFC, points: { lng: number; lat: number }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of points) {
    const name = barrioOf(fc, p.lng, p.lat);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

/** Bounding box of a MultiPolygon: [minLng, minLat, maxLng, maxLat]. */
export function bbox(f: BarrioFeature): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of f.geometry.coordinates) for (const [x, y] of poly[0]) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}
