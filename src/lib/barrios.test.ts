import { describe, expect, it } from 'vitest';
import barrios from '../data/madridBarrios.json';
import { LIVE_UNITS } from '../data/liveListings';
import { barrioCounts, barrioOf, pointInRing, type BarrioFC } from './barrios';

const fc = barrios as BarrioFC;

describe('barrios', () => {
  it('has the 128 barrios of Madrid, each a closed multipolygon', () => {
    expect(fc.features).toHaveLength(128);
    for (const f of fc.features) {
      expect(f.properties.name).toBeTruthy();
      for (const poly of f.geometry.coordinates) expect(poly[0][0]).toEqual(poly[0][poly[0].length - 1]);
    }
  });

  it('ray casting works on a square', () => {
    const sq = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    expect(pointInRing(0.5, 0.5, sq)).toBe(true);
    expect(pointInRing(1.5, 0.5, sq)).toBe(false);
  });

  it('places the Palacio listing in Palacio and the Puerta del Sol in Sol', () => {
    expect(barrioOf(fc, -3.71675, 40.41654)).toBe('Palacio');
    expect(barrioOf(fc, -3.7038, 40.4169)).toBe('Sol');
    expect(barrioOf(fc, -3.5361, 40.4237)).toBeNull(); // San Fernando de Henares is outside the city
  });

  it('counts most of the 132 live flats inside the city, by barrio', () => {
    const counts = barrioCounts(fc, LIVE_UNITS);
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(100);
    expect(total).toBeLessThanOrEqual(LIVE_UNITS.length);
    expect(counts.get('Palacio')).toBeGreaterThanOrEqual(1);
  });
});
