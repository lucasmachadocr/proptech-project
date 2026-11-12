import { addMonths } from '../lib/dates';
import { describe, expect, it } from 'vitest';
import { DEMO_BRIEF, EXTRA_ENGINEERS } from '../data/brief';
import { FRAUD_UNIT_ID, MONTH_3, UNITS } from '../data/units';
import { FACTS } from '../data/facts';
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
    expect(allowedTypes(mk('technician', 1, 0), DEMO_BRIEF)).toEqual(['1bed']);
    expect(allowedTypes(mk('engineer', 1, 0), DEMO_BRIEF)).toEqual(['1bed']);
    expect(allowedTypes(mk('manager', 2, 0), DEMO_BRIEF)).toEqual(['1bed', '2bed']);
    expect(allowedTypes(mk('expat', 2, 1), DEMO_BRIEF)).toEqual(['2bed', '3bed']);
    expect(allowedTypes(mk('expat', 2, 2), DEMO_BRIEF)).toEqual(['3bed']);
  });
});

describe('allocate (demo brief)', () => {
  const plan = allocate(DEMO_BRIEF, UNITS);

  it('assigns all 15 people and respects every hard rule', () => {
    expect(plan.assignments).toHaveLength(20);
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
    expect(plan.metrics.apartments).toBe(20);
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
    expect(checkUnit(e, UNITS.find((u) => u.id === FRAUD_UNIT_ID)!, DEMO_BRIEF).fail).toBe('unverified');
    expect(checkUnit(e, UNITS.find((u) => u.city === 'Zaragoza' && u.type === '1bed')!, DEMO_BRIEF).fail).toBe('commute');
  });
});

describe('reallocate: the team drops to 15 from month 4 (deck, Nov 2026)', () => {
  const plan = allocate(DEMO_BRIEF, UNITS);
  const leave = addMonths(DEMO_BRIEF.start, FACTS.replan.fromMonth - 1);
  const next: Brief = { ...DEMO_BRIEF, employees: DEMO_BRIEF.employees.map((e, i) => (i >= DEMO_BRIEF.employees.length - FACTS.replan.people ? { ...e, end: leave } : e)) };
  const r = reallocate(plan, DEMO_BRIEF, next, UNITS);

  it('nobody moves; the leavers are housed for 3 months only', () => {
    expect(r.moved).toBe(FACTS.replan.moved);
    expect(r.plan.metrics.apartmentMonths).toBe(FACTS.demo.apartmentMonths - FACTS.replan.people * FACTS.replan.months);
    expect(r.totalDelta).toBeLessThan(0);
  });
});

describe('reallocate (+3 engineers from month 3)', () => {
  const plan = allocate(DEMO_BRIEF, UNITS);
  const joiners = EXTRA_ENGINEERS.map((e) => ({ ...e, start: MONTH_3 }));
  const next: Brief = { ...DEMO_BRIEF, employees: [...DEMO_BRIEF.employees, ...joiners] };
  const r = reallocate(plan, DEMO_BRIEF, next, UNITS);

  it('adds exactly 3 apartments and nobody already housed moves', () => {
    expect(r.plan.assignments).toHaveLength(23);
    expect(r.diff.filter((d) => d.kind === 'new' && d.toUnitId)).toHaveLength(3);
    expect(r.moved).toBe(0);
    assertHardRules(r.plan, { ...next, start: DEMO_BRIEF.start }, UNITS.map((u) => ({ ...u, availableFrom: DEMO_BRIEF.start })));
  });

  it('joiners are housed for 4 months only', () => {
    expect(r.plan.metrics.apartmentMonths).toBe(FACTS.demo.apartmentMonths + 3 * 4);
    const newRent = r.diff.filter((d) => d.kind === 'new').reduce((s, d) => s + d.rentDelta, 0);
    expect(r.totalDelta).toBe(newRent * 4);
  });

  it('an extension moves only the people whose apartment is not free for the new dates', () => {
    const units = UNITS.map((u) => (u.id === plan.assignments[0].unitId ? { ...u, availableTo: stayEnd(DEMO_BRIEF.start, DEMO_BRIEF.months) } : u));
    const p0 = allocate(DEMO_BRIEF, units);
    const ext = reallocate(p0, DEMO_BRIEF, { ...DEMO_BRIEF, months: 8 }, units);
    const moved = ext.diff.filter((d) => d.kind === 'moved');
    expect(moved).toHaveLength(1);
    expect(moved[0].reason).toMatch(/only available until/);
  });

  it('a higher move penalty never increases the number of moves', () => {
    const ext: Brief = { ...DEMO_BRIEF, months: 8, employees: next.employees };
    const free = reallocate(plan, DEMO_BRIEF, ext, UNITS, { movePenalty: 0 });
    const sticky = reallocate(plan, DEMO_BRIEF, ext, UNITS, { movePenalty: 5000 });
    expect(sticky.moved).toBeLessThanOrEqual(free.moved);
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
    const brief: Brief = { ...DEMO_BRIEF, siteId: 'S-ZAZ', employees, budgetCaps: { engineer: 2200, technician: 2200, manager: 2200, expat: 2200 } };
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
