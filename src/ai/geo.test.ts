import { describe, expect, it } from 'vitest';
import { commuteMin, haversineKm } from './geo';

const zaragozaCentre = { lat: 41.6488, lng: -0.8891 };
const villanueva = { lat: 41.7688, lng: -0.8262 };

describe('geo', () => {
  it('haversine: Zaragoza centre → Villanueva de Gállego ≈ 14.4 km', () => {
    expect(haversineKm(zaragozaCentre, villanueva)).toBeGreaterThan(13.4);
    expect(haversineKm(zaragozaCentre, villanueva)).toBeLessThan(15.4);
  });

  it('commute = km × 1.3 at 50 km/h', () => {
    const km = haversineKm(zaragozaCentre, villanueva);
    expect(commuteMin(zaragozaCentre, villanueva)).toBeCloseTo(((km * 1.3) / 50) * 60, 6);
    expect(commuteMin(villanueva, villanueva)).toBe(0);
  });
});
