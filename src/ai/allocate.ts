// Allocation engine (phase 1 "AI"): explainable local optimisation.
//
//   minimise  Σ rent + λ · Σ one-way commute minutes  (+ move penalty on re-allocation)
//   s.t.      rent ≤ role budget cap · unit type fits household + company policy ·
//             unit available for the whole stay · commute ≤ cap · one household per unit ·
//             only verified units
//
// Greedy start (most-constrained employee first) followed by local search
// (move to a free unit, pairwise swap, one-step ejection for unassigned people).
import { HOTEL_NIGHT_EUR, NIGHTS_PER_MONTH, COMPANY_FEE_RATE } from '../config';
import { siteById } from '../data/sites';
import { formatDate, stayEnd } from '../lib/dates';
import type {
  Assignment, Brief, DiffRow, Employee, Plan, PlanMetrics, Reallocation, Role, Tradeoff, Unit, UnitType,
} from '../types';
import { commuteMin } from './geo';

export const DEFAULT_LAMBDA = 15; // € per one-way commute minute per month
export const DEFAULT_MOVE_PENALTY = 400; // € equivalent per person moved

export interface AllocateOptions {
  lambda?: number;
  movePenalty?: number;
  maxIterations?: number;
  /** Previous plan: people keep their unit when still feasible; moving costs `movePenalty`. */
  previous?: Plan;
  /** Skip local search (used by tests to compare against the greedy start). */
  greedyOnly?: boolean;
}

const TYPE_RANK: Record<UnitType, number> = { studio: 0, '1bed': 1, '2bed': 2, '3bed': 3 };
const TYPES: UnitType[] = ['studio', '1bed', '2bed', '3bed'];

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Unit types allowed for an employee: household size rule + company policy per role. */
export function allowedTypes(emp: Employee, brief: Brief): UnitType[] {
  const { adults, children } = emp.household;
  let min: UnitType = 'studio';
  let max: UnitType = '1bed';
  if (children >= 2) [min, max] = ['3bed', '3bed'];
  else if (children === 1) [min, max] = ['2bed', '3bed'];
  else if (adults >= 2) [min, max] = ['1bed', '2bed'];
  const policyMin = brief.minUnitType[emp.role];
  const lo = Math.max(TYPE_RANK[min], TYPE_RANK[policyMin]);
  const hi = Math.max(TYPE_RANK[max], TYPE_RANK[policyMin]);
  return TYPES.filter((t) => TYPE_RANK[t] >= lo && TYPE_RANK[t] <= hi);
}

export type RuleFailure = 'unverified' | 'type' | 'budget' | 'availability' | 'commute';

export interface Feasibility {
  ok: boolean;
  fail?: RuleFailure;
  commute: number;
}

export function checkUnit(emp: Employee, unit: Unit, brief: Brief): Feasibility {
  const site = siteById(brief.siteId);
  const commute = commuteMin(site, unit);
  const end = stayEnd(brief.start, brief.months);
  if (unit.status !== 'verified') return { ok: false, fail: 'unverified', commute };
  if (!allowedTypes(emp, brief).includes(unit.type)) return { ok: false, fail: 'type', commute };
  if (unit.rent > brief.budgetCaps[emp.role]) return { ok: false, fail: 'budget', commute };
  if (unit.availableFrom > brief.start || unit.availableTo < end) return { ok: false, fail: 'availability', commute };
  if (commute > brief.maxCommuteMin) return { ok: false, fail: 'commute', commute };
  return { ok: true, commute };
}

const FAIL_TEXT: Record<RuleFailure, string> = {
  unverified: 'not yet verified',
  type: 'unit type does not fit the household/policy',
  budget: 'over the role budget cap',
  availability: 'not available for the whole stay',
  commute: 'commute above the cap',
};

interface Ctx {
  brief: Brief;
  units: Unit[];
  emps: Employee[];
  feas: Map<string, Map<string, number>>; // empId -> unitId -> commute (only feasible pairs)
  prevUnit: Map<string, string>;
  lambda: number;
  movePenalty: number;
  unitIdx: Map<string, Unit>;
}

function cost(ctx: Ctx, empId: string, unitId: string): number {
  const commute = ctx.feas.get(empId)!.get(unitId)!;
  const unit = ctx.unitIdx.get(unitId)!;
  const prev = ctx.prevUnit.get(empId);
  const penalty = prev !== undefined && prev !== unitId ? ctx.movePenalty : 0;
  return unit.rent + ctx.lambda * commute + penalty;
}

function totalObjective(ctx: Ctx, assign: Map<string, string>): number {
  let t = 0;
  for (const [e, u] of assign) t += cost(ctx, e, u);
  return t;
}

function buildContext(brief: Brief, units: Unit[], opts: AllocateOptions): Ctx {
  const feas = new Map<string, Map<string, number>>();
  for (const e of brief.employees) {
    const m = new Map<string, number>();
    for (const u of units) {
      const f = checkUnit(e, u, brief);
      if (f.ok) m.set(u.id, f.commute);
    }
    feas.set(e.id, m);
  }
  const prevUnit = new Map<string, string>();
  for (const a of opts.previous?.assignments ?? []) prevUnit.set(a.employeeId, a.unitId);
  return {
    brief,
    units,
    emps: brief.employees,
    feas,
    prevUnit,
    lambda: opts.lambda ?? DEFAULT_LAMBDA,
    movePenalty: opts.previous ? (opts.movePenalty ?? DEFAULT_MOVE_PENALTY) : 0,
    unitIdx: new Map(units.map((u) => [u.id, u])),
  };
}

function greedy(ctx: Ctx): Map<string, string> {
  const assign = new Map<string, string>();
  const taken = new Set<string>();
  // Keep previous homes that are still feasible (minimal disruption start).
  for (const e of ctx.emps) {
    const prev = ctx.prevUnit.get(e.id);
    if (prev && ctx.feas.get(e.id)!.has(prev) && !taken.has(prev)) {
      assign.set(e.id, prev);
      taken.add(prev);
    }
  }
  const order = ctx.emps
    .filter((e) => !assign.has(e.id))
    .sort((a, b) => ctx.feas.get(a.id)!.size - ctx.feas.get(b.id)!.size || a.id.localeCompare(b.id));
  for (const e of order) {
    let best: string | undefined;
    let bestCost = Infinity;
    for (const uId of [...ctx.feas.get(e.id)!.keys()].sort()) {
      if (taken.has(uId)) continue;
      const c = cost(ctx, e.id, uId);
      if (c < bestCost - 1e-9) [best, bestCost] = [uId, c];
    }
    if (best) {
      assign.set(e.id, best);
      taken.add(best);
    }
  }
  return assign;
}

function localSearch(ctx: Ctx, assign: Map<string, string>, maxIterations: number): number {
  let iterations = 0;
  let improved = true;
  const ids = ctx.emps.map((e) => e.id);
  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;
    const taken = new Set(assign.values());

    // 1. Ejection: place an unassigned person by bumping someone to a free unit.
    for (const e of ids) {
      if (assign.has(e)) continue;
      outer: for (const [holder, uId] of [...assign]) {
        if (!ctx.feas.get(e)!.has(uId)) continue;
        for (const alt of ctx.feas.get(holder)!.keys()) {
          if (taken.has(alt)) continue;
          assign.set(holder, alt);
          assign.set(e, uId);
          taken.add(alt);
          improved = true;
          break outer;
        }
      }
    }

    // 2. Move to a free unit.
    for (const e of ids) {
      const cur = assign.get(e);
      if (!cur) continue;
      let best = cur;
      let bestCost = cost(ctx, e, cur);
      for (const uId of ctx.feas.get(e)!.keys()) {
        if (taken.has(uId)) continue;
        const c = cost(ctx, e, uId);
        if (c < bestCost - 1e-9) [best, bestCost] = [uId, c];
      }
      if (best !== cur) {
        taken.delete(cur);
        taken.add(best);
        assign.set(e, best);
        improved = true;
      }
    }

    // 3. Pairwise swaps.
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i];
        const b = ids[j];
        const ua = assign.get(a);
        const ub = assign.get(b);
        if (!ua || !ub) continue;
        if (!ctx.feas.get(a)!.has(ub) || !ctx.feas.get(b)!.has(ua)) continue;
        const before = cost(ctx, a, ua) + cost(ctx, b, ub);
        const after = cost(ctx, a, ub) + cost(ctx, b, ua);
        if (after < before - 1e-9) {
          assign.set(a, ub);
          assign.set(b, ua);
          improved = true;
        }
      }
    }
  }
  return iterations;
}

function unassignedReason(ctx: Ctx, emp: Employee): string {
  if (ctx.feas.get(emp.id)!.size > 0) return 'All feasible units are taken by other team members — widen commute cap or budget.';
  const counts = new Map<RuleFailure, number>();
  for (const u of ctx.units) {
    const f = checkUnit(emp, u, ctx.brief);
    if (f.fail) counts.set(f.fail, (counts.get(f.fail) ?? 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1])[0];
  return `No feasible unit: most candidates are ${top ? FAIL_TEXT[top[0]] : 'unavailable'}.`;
}

export function planMetrics(brief: Brief, assignments: Assignment[], objective: number): PlanMetrics {
  const monthlyRent = assignments.reduce((s, a) => s + a.rent, 0);
  const commutes = assignments.map((a) => a.commuteMin);
  const people = brief.employees.length;
  const hotelMonthly = people * HOTEL_NIGHT_EUR * NIGHTS_PER_MONTH;
  const ourMonthly = monthlyRent * (1 + COMPANY_FEE_RATE);
  const roles: Role[] = ['engineer', 'technician', 'manager', 'expat'];
  const budgetUse = Object.fromEntries(
    roles.map((r) => {
      const inRole = assignments.filter((a) => brief.employees.find((e) => e.id === a.employeeId)?.role === r);
      return [r, { used: inRole.reduce((s, a) => s + a.rent, 0), cap: brief.budgetCaps[r] * inRole.length, count: inRole.length }];
    }),
  ) as PlanMetrics['budgetUse'];
  return {
    monthlyRent,
    totalRent: monthlyRent * brief.months,
    avgCommuteMin: commutes.length ? r1(commutes.reduce((s, c) => s + c, 0) / commutes.length) : 0,
    maxCommuteMin: commutes.length ? r1(Math.max(...commutes)) : 0,
    hotelMonthly: Math.round(hotelMonthly * 100) / 100,
    savingVsHotelMonthly: Math.round((hotelMonthly - ourMonthly) * 100) / 100,
    savingVsHotelPct: hotelMonthly ? (hotelMonthly - ourMonthly) / hotelMonthly : 0,
    objective: Math.round(objective),
    budgetUse,
  };
}

const firstName = (e: Employee) => e.name.split(' ')[0];
const short = (u: Unit) => `${u.type === 'studio' ? 'studio' : u.type.replace('bed', '-bed')} in ${u.zone}`;

function explain(ctx: Ctx, assign: Map<string, string>): Tradeoff[] {
  const out: (Tradeoff & { weight: number })[] = [];
  for (const e of ctx.emps) {
    const uId = assign.get(e.id);
    if (!uId) continue;
    const chosen = ctx.unitIdx.get(uId)!;
    const cc = ctx.feas.get(e.id)!.get(uId)!;
    let cheapest: Unit | undefined;
    let closest: Unit | undefined;
    for (const id of ctx.feas.get(e.id)!.keys()) {
      const u = ctx.unitIdx.get(id)!;
      if (!cheapest || u.rent < cheapest.rent) cheapest = u;
      const c = ctx.feas.get(e.id)!.get(id)!;
      if (!closest || c < ctx.feas.get(e.id)!.get(closest.id)!) closest = u;
    }
    if (closest && closest.id !== uId) {
      const dMin = cc - ctx.feas.get(e.id)!.get(closest.id)!;
      const dEur = closest.rent - chosen.rent;
      if (dMin >= 3 && dEur > 0) {
        out.push({ kind: 'commute', weight: dEur, text: `${firstName(e)} (${e.role}) commutes ${Math.round(dMin)} min more each way from a ${short(chosen)} to save €${dEur}/mo versus the closest option (${short(closest)}).` });
      }
    }
    if (cheapest && cheapest.id !== uId && cheapest.rent < chosen.rent) {
      const holder = [...assign].find(([, u]) => u === cheapest!.id)?.[0];
      const dMin = ctx.feas.get(e.id)!.get(cheapest.id)! - cc;
      if (dMin > 2 && !holder) {
        out.push({ kind: 'cost', weight: (chosen.rent - cheapest.rent) / 2, text: `${firstName(e)} pays €${chosen.rent - cheapest.rent}/mo more than the cheapest fit to cut ${Math.round(dMin)} min of commute (λ = €${ctx.lambda}/min).` });
      }
    }
  }
  const excluded = ctx.units.filter((u) => u.status !== 'verified');
  if (excluded.length) {
    const cheap = excluded.reduce((a, b) => (a.rent < b.rent ? a : b));
    out.push({ kind: 'excluded', weight: 10_000, text: `${excluded.length} listings still in verification were excluded (cheapest: €${cheap.rent}/mo ${short(cheap)}). Only verified units are offered.` });
  }
  const families = ctx.emps.filter((e) => e.household.children > 0);
  for (const f of families) {
    out.push({ kind: 'rule', weight: 5_000, text: `${f.name}: household of ${f.household.adults + f.household.children} → needs ${allowedTypes(f, ctx.brief).map((t) => t.replace('bed', '-bed')).join(' or ')}; ${ctx.feas.get(f.id)!.size} units qualify within ${ctx.brief.maxCommuteMin} min.` });
  }
  // Most valuable personal trade-offs first, then hard rules, then exclusions.
  const personal = out.filter((t) => t.kind === 'commute' || t.kind === 'cost').sort((a, b) => b.weight - a.weight).slice(0, 4);
  const rest = out.filter((t) => t.kind !== 'commute' && t.kind !== 'cost').sort((a, b) => a.weight - b.weight);
  return [...personal, ...rest].map(({ kind, text }) => ({ kind, text }));
}

export function allocate(brief: Brief, units: Unit[], opts: AllocateOptions = {}): Plan {
  const t0 = performance.now();
  const ctx = buildContext(brief, units, opts);
  const assign = greedy(ctx);
  if (!opts.greedyOnly) localSearch(ctx, assign, opts.maxIterations ?? 50);

  const assignments: Assignment[] = brief.employees
    .filter((e) => assign.has(e.id))
    .map((e) => {
      const uId = assign.get(e.id)!;
      return { employeeId: e.id, unitId: uId, rent: ctx.unitIdx.get(uId)!.rent, commuteMin: r1(ctx.feas.get(e.id)!.get(uId)!) };
    });
  const unassigned = brief.employees.filter((e) => !assign.has(e.id)).map((e) => ({ employeeId: e.id, reason: unassignedReason(ctx, e) }));
  const objective = totalObjective(ctx, assign);
  const tradeoffs = explain(ctx, assign);
  tradeoffs.push({ kind: 'info', text: `Commute is an estimate: straight-line distance × 1.3 road factor at 50 km/h. Objective = rent + €${ctx.lambda} × minutes.` });
  return {
    briefId: brief.id,
    assignments,
    unassigned,
    metrics: planMetrics(brief, assignments, objective),
    tradeoffs,
    computedMs: Math.round((performance.now() - t0) * 10) / 10,
    candidatesConsidered: brief.employees.length * units.length,
  };
}

/** Re-allocate after a change (dates, headcount): minimal moves, explicit diff and cost delta. */
export function reallocate(previous: Plan, prevBrief: Brief, nextBrief: Brief, units: Unit[], opts: AllocateOptions = {}): Reallocation {
  const plan = allocate(nextBrief, units, { ...opts, previous });
  const prevBy = new Map(previous.assignments.map((a) => [a.employeeId, a]));
  const nextBy = new Map(plan.assignments.map((a) => [a.employeeId, a]));
  const diff: DiffRow[] = [];
  for (const e of nextBrief.employees) {
    const p = prevBy.get(e.id);
    const n = nextBy.get(e.id);
    if (!p) {
      diff.push({ employeeId: e.id, kind: 'new', toUnitId: n?.unitId, reason: n ? 'New team member' : 'No feasible unit', rentDelta: n?.rent ?? 0 });
    } else if (n && p.unitId === n.unitId) {
      diff.push({ employeeId: e.id, kind: 'kept', fromUnitId: p.unitId, toUnitId: n.unitId, reason: 'Unit still available for the new dates', rentDelta: 0 });
    } else {
      const old = units.find((u) => u.id === p.unitId)!;
      const f = checkUnit(e, old, nextBrief);
      const reason = f.ok
        ? 'Moved to free a better overall plan'
        : f.fail === 'availability'
          ? `Current unit only available until ${formatDate(old.availableTo)}`
          : `Current unit ${FAIL_TEXT[f.fail!]}`;
      diff.push({ employeeId: e.id, kind: 'moved', fromUnitId: p.unitId, toUnitId: n?.unitId, reason, rentDelta: (n?.rent ?? 0) - p.rent });
    }
  }
  for (const e of prevBrief.employees) {
    if (!nextBrief.employees.some((x) => x.id === e.id)) {
      const p = prevBy.get(e.id);
      diff.push({ employeeId: e.id, kind: 'removed', fromUnitId: p?.unitId, reason: 'Left the project', rentDelta: -(p?.rent ?? 0) });
    }
  }
  const monthlyDelta = plan.metrics.monthlyRent - previous.metrics.monthlyRent;
  return {
    plan,
    diff,
    moved: diff.filter((d) => d.kind === 'moved').length,
    monthlyDelta,
    totalDelta: plan.metrics.totalRent - previous.metrics.totalRent,
  };
}
