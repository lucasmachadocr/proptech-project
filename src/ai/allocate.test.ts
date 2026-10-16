import { describe, expect, it } from 'vitest';
import { DEMO_BRIEF, EXTRA_ENGINEERS } from '../data/brief';
import { UNITS } from '../data/units';
import { stayEnd } from '../lib/dates';
import type { Brief, Employee, Plan, Role, Unit, UnitType } from '../types';
import { allocate, allowedTypes, checkUnit, reallocate } from './allocate';

function assertHardRules(plan: Plan, brief: Brief, units: Unit[]) {
  const end = stayEnd(brief.start, brief.months);
  const used = new Set<string>();
  for (const a of plan.assignments) {
    const e = brief.employees.find((x) => x.id === a.employeeId)!;
    const u = units.find((x) => x.id === a.unitId)!;
    expect(u.status).toBe('verified');
    expect(u.rent).toBeLessThanOrEqual(brief.budgetCaps[e.role]);
    expect(allowedTypes(e, brief)).toContain(u.type);
    expect(u.availableFrom <= brief.start && u.availableTo >= end).toBe(true);
    expect(a.commuteMin).toBeLessThanOrEqual(brief.maxCommuteMin);
    expect(used.has(u.id)).toBe(false);
    used.add(u.id);
  }
}

describe('allowedTypes', () => {
  it('maps household + role policy to unit types', () => {
    const mk = (role: Role, adults: number, children: number): Employee => ({ id: 'x', name: 'X', role, title: '', household: { adults, children } });
    expect(allowedTypes(mk('technician', 1, 0), DEMO_BRIEF)).toEqual(['studio', '1bed']);
    expect(allowedTypes(mk('engineer', 1, 0), DEMO_BRIEF)).toEqual(['1bed']);
    expect(allowedTypes(mk('manager', 2, 0), DEMO_BRIEF)).toEqual(['1bed', '2bed']);
    expect(allowedTypes(mk('expat', 2, 1), DEMO_BRIEF)).toEqual(['2bed', '3bed']);
    expect(allowedTypes(mk('expat', 2, 2), DEMO_BRIEF)).toEqual(['3bed']);
  });
});

describe('allocate (demo brief)', () => {
  const plan = allocate(DEMO_BRIEF, UNITS);

  it('assigns all 15 people and respects every hard rule', () => {
    expect(plan.assignments).toHaveLength(15);
    expect(plan.unassigned).toHaveLength(0);
    assertHardRules(plan, DEMO_BRIEF, UNITS);
  });

  it('never offers the fraudulent / unverified listings', () => {
    const offered = new Set(plan.assignments.map((a) => a.unitId));
    for (const u of UNITS.filter((x) => x.status !== 'verified')) expect(offered.has(u.id)).toBe(false);
  });

  it('is deterministic', () => {
    const again = allocate(DEMO_BRIEF, UNITS);
    expect(again.assignments).toEqual(plan.assignments);
  });

  it('local search is never worse than the greedy start', () => {
    const greedy = allocate(DEMO_BRIEF, UNITS, { greedyOnly: true });
    expect(plan.metrics.objective).toBeLessThanOrEqual(greedy.metrics.objective);
  });

  it('returns human-readable trade-offs and KPIs', () => {
    expect(plan.tradeoffs.length).toBeGreaterThanOrEqual(3);
    expect(plan.tradeoffs.some((t) => t.kind === 'excluded')).toBe(true);
    expect(plan.metrics.hotelMonthly).toBeCloseTo(15 * 74 * 30.4, 2);
    expect(plan.metrics.savingVsHotelMonthly).toBeGreaterThan(0);
    expect(plan.metrics.avgCommuteMin).toBeGreaterThan(0);
  });

  it('reports infeasible people with a reason', () => {
    const giant: Employee = { id: 'EX', name: 'Big Family', role: 'technician', title: '', household: { adults: 2, children: 4 } };
    const p = allocate({ ...DEMO_BRIEF, employees: [giant] }, UNITS);
    expect(p.unassigned).toHaveLength(1);
    expect(p.unassigned[0].reason).toMatch(/No feasible unit/);
  });

  it('checkUnit flags the reason a unit is rejected', () => {
    const e = DEMO_BRIEF.employees[0];
    expect(checkUnit(e, UNITS.find((u) => u.id === 'U60')!, DEMO_BRIEF).fail).toBe('unverified');
    expect(checkUnit(e, UNITS.find((u) => u.zone === 'Fuentes de Ebro' && u.type === '1bed')!, DEMO_BRIEF).fail).toBe('commute');
  });
});

describe('reallocate (extend 2 months + 3 engineers)', () => {
  const plan = allocate(DEMO_BRIEF, UNITS);
  const next: Brief = { ...DEMO_BRIEF, months: 8, employees: [...DEMO_BRIEF.employees, ...EXTRA_ENGINEERS] };
  const r = reallocate(plan, DEMO_BRIEF, next, UNITS);

  it('adds exactly 3 assignments and keeps all rules', () => {
    expect(r.plan.assignments).toHaveLength(18);
    expect(r.diff.filter((d) => d.kind === 'new')).toHaveLength(3);
    assertHardRules(r.plan, next, UNITS);
  });

  it('moves only the people whose unit expires', () => {
    const newEnd = stayEnd(next.start, next.months);
    const expiring = new Set(plan.assignments.filter((a) => UNITS.find((u) => u.id === a.unitId)!.availableTo < newEnd).map((a) => a.employeeId));
    expect(expiring.size).toBeGreaterThan(0);
    const moved = r.diff.filter((d) => d.kind === 'moved').map((d) => d.employeeId);
    expect(new Set(moved)).toEqual(expiring);
    for (const d of r.diff.filter((x) => x.kind === 'moved')) expect(d.reason).toMatch(/only available until/);
  });

  it('reports the cost delta', () => {
    expect(r.monthlyDelta).toBe(r.plan.metrics.monthlyRent - plan.metrics.monthlyRent);
    expect(r.totalDelta).toBe(r.plan.metrics.totalRent - 162_000);
    expect(r.monthlyDelta).toBeGreaterThan(0);
  });

  it('a higher move penalty never increases the number of moves', () => {
    const free = reallocate(plan, DEMO_BRIEF, next, UNITS, { movePenalty: 0 });
    const sticky = reallocate(plan, DEMO_BRIEF, next, UNITS, { movePenalty: 5000 });
    expect(sticky.moved).toBeLessThanOrEqual(free.moved);
    expect(r.moved).toBeLessThanOrEqual(free.moved);
  });
});

describe('performance', () => {
  it('50 people × 200 units in under 1 s', () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
    const types: UnitType[] = ['studio', '1bed', '2bed', '3bed'];
    const units: Unit[] = Array.from({ length: 200 }, (_, i) => {
      const type = types[Math.floor(rnd() * 4)];
      return {
        ...UNITS[0],
        id: `G${i}`,
        type,
        rent: 900 + Math.round(rnd() * 1300),
        lat: 41.62 + rnd() * 0.25,
        lng: -0.98 + rnd() * 0.25,
        photos: [],
        status: 'verified',
      };
    });
    const roles: Role[] = ['engineer', 'technician', 'manager', 'expat'];
    const employees: Employee[] = Array.from({ length: 50 }, (_, i) => {
      const role = roles[i % 4];
      return { id: `P${i}`, name: `Person ${i}`, role, title: '', household: role === 'expat' ? { adults: 2, children: 1 + (i % 2) } : { adults: 1, children: 0 } };
    });
    const brief: Brief = { ...DEMO_BRIEF, employees, budgetCaps: { engineer: 2200, technician: 2200, manager: 2200, expat: 2200 } };
    const t0 = performance.now();
    const plan = allocate(brief, units);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(1000);
    expect(plan.assignments.length).toBeGreaterThan(40);
    assertHardRules(plan, brief, units);
    const greedy = allocate(brief, units, { greedyOnly: true });
    expect(plan.metrics.objective).toBeLessThanOrEqual(greedy.metrics.objective);
  });
});
