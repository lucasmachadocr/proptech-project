import { describe, expect, it } from 'vitest';
import { allocate } from '../ai/allocate';
import { DEMO_BRIEF } from './brief';
import { COMPANIES } from './companies';
import { PROVIDERS } from './providers';
import { RISKS } from './risks';
import { SITES } from './sites';
import { FRAUD_UNIT_ID, UNITS } from './units';

describe('seed data', () => {
  it('has the expected volumes', () => {
    expect(SITES).toHaveLength(3);
    expect(UNITS).toHaveLength(60);
    expect(PROVIDERS).toHaveLength(12);
    expect(COMPANIES).toHaveLength(2);
    expect(RISKS).toHaveLength(6);
    expect(new Set(UNITS.map((u) => u.id)).size).toBe(60);
  });

  it('rents are in the €700–2,200 range and every unit has a provider', () => {
    for (const u of UNITS) {
      expect(u.rent).toBeGreaterThanOrEqual(700);
      expect(u.rent).toBeLessThanOrEqual(2200);
      expect(PROVIDERS.some((p) => p.id === u.providerId)).toBe(true);
    }
  });

  it('demo brief: 15 people (10 eng/tech, 3 managers, 2 expat families), 6 months', () => {
    const roles = DEMO_BRIEF.employees.map((e) => e.role);
    expect(roles).toHaveLength(15);
    expect(roles.filter((r) => r === 'engineer' || r === 'technician')).toHaveLength(10);
    expect(roles.filter((r) => r === 'manager')).toHaveLength(3);
    expect(DEMO_BRIEF.employees.filter((e) => e.role === 'expat' && e.household.children > 0)).toHaveLength(2);
    expect(DEMO_BRIEF.months).toBe(6);
    expect(DEMO_BRIEF.maxCommuteMin).toBe(30);
  });

  it('contains exactly one deliberately fraudulent listing', () => {
    const owners = UNITS.filter((u) => u.ownerName !== PROVIDERS.find((p) => p.id === u.providerId)!.registryName);
    expect(owners.map((u) => u.id)).toEqual([FRAUD_UNIT_ID]);
  });

  it('calibration: demo plan costs exactly €27,000/month (= €162,000 over 6 months)', () => {
    const plan = allocate(DEMO_BRIEF, UNITS);
    expect(plan.unassigned).toHaveLength(0);
    expect(plan.metrics.monthlyRent).toBe(27_000);
    expect(plan.metrics.totalRent).toBe(162_000);
  });
});
