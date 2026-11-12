// Data for the experience film: the same plans the app shows, from the same engines and seed.
import { DEFAULT_LAMBDA, LAMBDA_CLOSEST, LAMBDA_LOWEST_COST, allocate, reallocate } from '../src/ai/allocate';
import { DEMO_BRIEF } from '../src/data/brief';
import { FACTS } from '../src/data/facts';
import { MADRID_SITE, kmForMinutes } from '../src/data/sites';
import { UNITS } from '../src/data/units';
import { addMonths } from '../src/lib/dates';

export { FACTS, MADRID_SITE };

export const madridUnits = UNITS.filter((u) => u.city === 'Madrid' && u.status === 'verified');
const plan = (lambda: number) => allocate(DEMO_BRIEF, UNITS, { lambda });
export const OPTIONS = { A: plan(LAMBDA_LOWEST_COST), B: plan(DEFAULT_LAMBDA), C: plan(LAMBDA_CLOSEST) };
export const chosen = (k: 'A' | 'B' | 'C') => new Set(OPTIONS[k].assignments.map((a) => a.unitId));

// Re-plan (deck): the team drops to 15 from month 4; the last five engineers leave and their flats are
// released with Flex. Same call as store.proposeChange(-5, 4): nobody else moves.
const leave = addMonths(DEMO_BRIEF.start, FACTS.replan.fromMonth - 1);
const n = DEMO_BRIEF.employees.length;
const next = { ...DEMO_BRIEF, employees: DEMO_BRIEF.employees.map((e, i) => (i >= n - FACTS.replan.people ? { ...e, end: leave } : e)) };
export const REPLAN = reallocate(OPTIONS.B, DEMO_BRIEF, next, UNITS);
const leavers = new Set(next.employees.filter((e) => e.end).map((e) => e.id));
export const RELEASED = OPTIONS.B.assignments.filter((a) => leavers.has(a.employeeId)).map((a) => a.unitId);

export const RINGS_MIN = [15, 30];
export const ringKm = (min: number) => kmForMinutes(min);

/** Rollout cities with their labels from the business plan (FACTS.rollout). */
export const CITY_POINTS: { city: keyof typeof FACTS.rollout; lng: number; lat: number }[] = [
  { city: 'Madrid', lng: -3.7038, lat: 40.4168 },
  { city: 'Valencia', lng: -0.3763, lat: 39.4699 },
  { city: 'Zaragoza', lng: -0.8891, lat: 41.6488 },
  { city: 'Barcelona', lng: 2.1734, lat: 41.3851 },
  { city: 'Málaga', lng: -4.4214, lat: 36.7213 },
];
/** Year 5: the first hub outside Spain (business plan). Placed over central Europe for the camera. */
export const EUROPE = { lng: 4.8, lat: 46.6, label: 'Europe', when: FACTS.expansionNext.split(' · ')[1] };
