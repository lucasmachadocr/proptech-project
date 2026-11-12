import { describe, expect, it } from 'vitest';
import { DEFAULT_LAMBDA, LAMBDA_CLOSEST, LAMBDA_LOWEST_COST, allocate } from '../ai/allocate';
import { LIVE_BRIEF } from './brief';
import { LIVE_UNITS } from './liveListings';
import { MADRID_PROJECT_SITES } from './sites';

describe('live listings (real public flats in Madrid)', () => {
  it('76 Spotahome 1-bedroom listings, each with a public link and a plausible price', () => {
    expect(LIVE_UNITS).toHaveLength(76);
    for (const u of LIVE_UNITS) {
      expect(u.city).toBe('Madrid');
      expect(u.status).toBe('public');
      expect(u.sourceUrl).toMatch(/^https:\/\/www\.spotahome\.com\/madrid\/for-rent:apartments\/\d+$/);
      expect(u.rent).toBeGreaterThanOrEqual(800);
      expect(u.rent).toBeLessThanOrEqual(5000);
      expect(u.lat).toBeGreaterThan(40.3);
      expect(u.lat).toBeLessThan(40.6);
    }
    expect(new Set(LIVE_UNITS.map((u) => u.id)).size).toBe(76);
  });

  it('builds three plans for 10 engineers at the San Fernando de Henares site', () => {
    const brief = { ...LIVE_BRIEF, site: MADRID_PROJECT_SITES[0] };
    const plans = [LAMBDA_LOWEST_COST, DEFAULT_LAMBDA, LAMBDA_CLOSEST].map((lambda) => allocate(brief, LIVE_UNITS, { lambda }));
    for (const p of plans) {
      expect(p.assignments).toHaveLength(10);
      expect(p.unassigned).toHaveLength(0);
      expect(p.assignments.every((a) => a.rent <= 2200 && a.commuteMin <= 35)).toBe(true);
    }
    // cheapest plan is not dearer than the closest plan; closest is not further away
    expect(plans[0].metrics.monthlyRent).toBeLessThanOrEqual(plans[2].metrics.monthlyRent);
    expect(plans[2].metrics.avgCommuteMin).toBeLessThanOrEqual(plans[0].metrics.avgCommuteMin);
  });

  it('a site placed anywhere in Madrid works too (Valdebebas)', () => {
    const brief = { ...LIVE_BRIEF, site: MADRID_PROJECT_SITES[1] };
    expect(allocate(brief, LIVE_UNITS).assignments).toHaveLength(10);
  });
});
