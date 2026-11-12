import { describe, expect, it } from 'vitest';
import { DEFAULT_LAMBDA, LAMBDA_CLOSEST, LAMBDA_LOWEST_COST, allocate } from '../ai/allocate';
import { LIVE_BRIEF } from './brief';
import { LIVE_UNITS } from './liveListings';
import { MADRID_PROJECT_SITES } from './sites';

describe('live listings (real public flats in Madrid)', () => {
  it('132 public listings from Spotahome, Airbnb and Booking.com, each with its source and a plausible price', () => {
    expect(LIVE_UNITS).toHaveLength(132);
    const url = { Spotahome: /^https:\/\/www\.spotahome\.com\/madrid\/for-rent:apartments\/\d+$/, Airbnb: /^https:\/\/www\.airbnb\.com\/rooms\/\d+$/, 'Booking.com': /^https:\/\/www\.booking\.com\/hotel\/es\/[a-z0-9-]+\.html$/ };
    for (const u of LIVE_UNITS) {
      expect(u.city).toBe('Madrid');
      expect(u.status).toBe('public');
      expect(u.sourceUrl).toMatch(url[u.source as keyof typeof url]);
      expect(u.rent).toBeGreaterThanOrEqual(800);
      expect(u.rent).toBeLessThanOrEqual(9000);
      expect(u.lat).toBeGreaterThan(40.15);
      expect(u.lat).toBeLessThan(40.6);
    }
    expect(new Set(LIVE_UNITS.map((u) => u.id)).size).toBe(132);
    expect(LIVE_UNITS.filter((u) => u.type === '2bed').length).toBeGreaterThanOrEqual(20); // families
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

describe('personal requirements in a live plan', () => {
  it('a family gets 2 bedrooms, an executive a bigger budget, a near-site engineer a short commute', () => {
    const team = LIVE_BRIEF.employees.map((e, i) =>
      i === 0 ? { ...e, need: 'Family', household: { adults: 2, children: 1 }, budgetCap: 3500 } : i === 1 ? { ...e, need: 'Executive', budgetCap: 3500 } : i === 2 ? { ...e, need: 'Closer', maxCommuteMin: 18 } : e,
    );
    const plan = allocate({ ...LIVE_BRIEF, employees: team }, LIVE_UNITS);
    const unit = (empId: string) => LIVE_UNITS.find((u) => u.id === plan.assignments.find((a) => a.employeeId === empId)!.unitId)!;
    expect(plan.unassigned).toHaveLength(0);
    expect(unit(team[0].id).type).toBe('2bed');
    expect(plan.assignments.find((a) => a.employeeId === team[2].id)!.commuteMin).toBeLessThanOrEqual(18);
  });
});
