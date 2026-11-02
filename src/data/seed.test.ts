import { describe, expect, it } from 'vitest';
import { LAMBDA_CLOSEST, LAMBDA_LOWEST_COST, allocate, reallocate } from '../ai/allocate';
import { companyInvoice, missionPricePerApartmentMonth, replanCost } from '../lib/money';
import { EXTRA_ENGINEERS } from './brief';
import { MONTH_3 } from './units';
import { DEMO_BRIEF } from './brief';
import { FACTS } from './facts';
import { PROVIDERS } from './providers';
import { SITES } from './sites';
import { FRAUD_UNIT_ID, UNITS } from './units';

describe('seed data', () => {
  it('covers the five v11 cities with ~20 units each', () => {
    for (const city of FACTS.cities) {
      const n = UNITS.filter((u) => u.city === city).length;
      expect(n, city).toBeGreaterThanOrEqual(19);
      expect(SITES.some((s) => s.city === city), city).toBe(true);
    }
    expect(new Set(UNITS.map((u) => u.id)).size).toBe(UNITS.length);
  });

  it('every unit has an operator', () => {
    for (const u of UNITS) expect(PROVIDERS.some((p) => p.id === u.providerId)).toBe(true);
  });

  it('demo brief = 20 engineers in Madrid for 6 months', () => {
    expect(DEMO_BRIEF.employees).toHaveLength(FACTS.demo.people);
    expect(DEMO_BRIEF.employees.every((e) => e.role === 'engineer')).toBe(true);
    expect(DEMO_BRIEF.months).toBe(FACTS.demo.months);
    expect(SITES.find((s) => s.id === DEMO_BRIEF.siteId)!.city).toBe(FACTS.demo.city);
  });

  it('contains exactly one listing whose owner does not match Catastro (the fraud)', () => {
    expect(UNITS.filter((u) => u.ownerName !== u.catastroOwner).map((u) => u.id)).toEqual([FRAUD_UNIT_ID]);
  });

  it('calibration: demo plan = 20 apartments × €1,879.20 = €37,584/month → €225,504 over 6 months', () => {
    const plan = allocate(DEMO_BRIEF, UNITS);
    expect(plan.unassigned).toHaveLength(0);
    expect(plan.metrics.apartments).toBe(20);
    expect(plan.metrics.apartmentMonths).toBe(FACTS.demo.apartmentMonths);
    expect(plan.metrics.monthlyRent).toBe(37_584);
    expect(plan.metrics.totalRent).toBe(FACTS.demo.rentTotal);
    expect(plan.metrics.monthlyRent / 20).toBeCloseTo(FACTS.demo.rentPerApartmentMonth, 2);
  });

  it('the engine produces the three business-plan options A / B / C', () => {
    const run = (lambda?: number) => allocate(DEMO_BRIEF, UNITS, lambda === undefined ? {} : { lambda });
    for (const [k, p] of [['A', run(LAMBDA_LOWEST_COST)], ['B', run()], ['C', run(LAMBDA_CLOSEST)]] as const) {
      const price = Math.round(companyInvoice(p.metrics.monthlyRent, p.metrics.apartments, true).total / p.metrics.apartments);
      expect(price, k).toBe(FACTS.options[k].pricePerApartmentMonth);
      expect(Math.round(p.metrics.avgCommuteMin), k).toBe(FACTS.options[k].avgCommuteMin);
    }
  });

  it('re-plan: +3 engineers from month 3 cost 3 × €1,992 × 4 = €23,904 and stay in the 4% tier', () => {
    const plan = allocate(DEMO_BRIEF, UNITS);
    const price = missionPricePerApartmentMonth(plan.metrics.totalRent, plan.metrics.apartments, plan.metrics.apartmentMonths, true);
    expect(price).toBe(FACTS.replan.pricePerApartmentMonth);
    expect(replanCost(price, FACTS.replan.people, FACTS.replan.months)).toBe(FACTS.replan.delta);
    const r = reallocate(plan, DEMO_BRIEF, { ...DEMO_BRIEF, employees: [...DEMO_BRIEF.employees, ...EXTRA_ENGINEERS.map((e) => ({ ...e, start: MONTH_3 }))] }, UNITS);
    expect(r.plan.metrics.apartments).toBe(FACTS.replan.apartmentsAfter);
    expect(r.moved).toBe(0);
    expect(companyInvoice(1, r.plan.metrics.apartments).markupRate).toBe(0.04);
  });
});
