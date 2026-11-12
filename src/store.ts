import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { allocate, reallocate } from './ai/allocate';
import type { Triage } from './ai/triage';
import { DEMO_BRIEF, EXTRA_ENGINEERS, LIVE_BRIEF, genericTeam } from './data/brief';
import { LIVE_UNITS } from './data/liveListings';
import { UNITS } from './data/units';
import { addMonths } from './lib/dates';
import type { Brief, Plan, Reallocation, Unit, VerificationStatus } from './types';

export interface Incident {
  id: string;
  employeeId: string;
  text: string;
  triage: Triage;
  createdAt: string;
}

export interface SignedLease {
  unitId: string;
  employeeId: string;
  hash: string;
  signedAt: string;
}

export interface ChangeRequest {
  label: string;
  extendMonths: number;
  addEngineers: number;
  fromMonth: number; // new people join at the start of this mission month (1 = from the start)
  brief: Brief;
  result: Reallocation;
}

/** live = anyone plans their own mission on real public listings in Madrid; demo = the scripted investor case. */
export type Mode = 'live' | 'demo';
export const unitsFor = (mode: Mode) => (mode === 'live' ? LIVE_UNITS : UNITS);

interface State {
  mode: Mode;
  setMode: (m: Mode) => void;
  brief: Brief;
  plan: Plan | null;
  reviewedAt: string | null; // released by the Ops team after plan review
  approvedAt: string | null; // approved by the client company
  flex: boolean; // Flex option on the mission
  change: ChangeRequest | null;
  units: Unit[];
  signed: SignedLease[];
  incidents: Incident[];
  demoStep: number | null; // guided investor demo: current step (not persisted)
  setDemoStep: (n: number | null) => void;
  setBrief: (b: Brief) => void;
  runAllocation: () => Plan;
  approvePlan: () => void;
  releasePlan: () => void;
  /** Live mode: the client continues with the option it picked (A, B or C). */
  choosePlan: (p: Plan) => void;
  setFlex: (on: boolean) => void;
  proposeChange: (addEngineers: number, fromMonth?: number, extendMonths?: number) => ChangeRequest;
  applyChange: () => void;
  setUnitStatus: (unitId: string, status: VerificationStatus) => void;
  signLease: (l: SignedLease) => void;
  addIncident: (i: Incident) => void;
  reset: () => void;
}

const initial = (mode: Mode = 'live') => ({
  mode,
  brief: mode === 'live' ? LIVE_BRIEF : DEMO_BRIEF,
  plan: null as Plan | null,
  reviewedAt: null as string | null,
  approvedAt: null as string | null,
  flex: true,
  change: null as ChangeRequest | null,
  units: unitsFor(mode),
  signed: [] as SignedLease[],
  incidents: [] as Incident[],
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial(),
      demoStep: null,
      // Switching mode starts from a clean slate with that mode's apartments and default brief.
      setMode: (mode) => {
        if (get().mode !== mode) set({ ...initial(mode) });
      },
      setBrief: (brief) => set({ brief, plan: null, reviewedAt: null, approvedAt: null, change: null, signed: [] }),
      runAllocation: () => {
        const plan = allocate(get().brief, get().units);
        set({ plan, reviewedAt: null, approvedAt: null, change: null, signed: [] });
        return plan;
      },
      approvePlan: () => set({ approvedAt: new Date().toISOString(), reviewedAt: get().reviewedAt ?? new Date().toISOString() }),
      releasePlan: () => set({ reviewedAt: new Date().toISOString() }),
      choosePlan: (plan) => set({ plan, reviewedAt: new Date().toISOString(), approvedAt: null, change: null, signed: [] }),
      setFlex: (flex) => set({ flex }),
      proposeChange: (addEngineers, fromMonth = 1, extendMonths = 0) => {
        const { brief, plan, units } = get();
        const base = plan ?? get().runAllocation();
        const existing = new Set(brief.employees.map((e) => e.id));
        const joinDate = addMonths(brief.start, fromMonth - 1);
        if (addEngineers < 0) {
          // The team shrinks: the last people leave at the start of `fromMonth`; their flats are released.
          const n = Math.min(-addEngineers, brief.employees.length - 1);
          const employees = brief.employees.map((e, i) => (i >= brief.employees.length - n ? { ...e, end: joinDate } : e));
          const next: Brief = { ...brief, employees };
          const result = reallocate(base, brief, next, units);
          const change: ChangeRequest = { label: `−${n} engineers from month ${fromMonth}`, extendMonths: 0, addEngineers: -n, fromMonth, brief: next, result };
          set({ change });
          return change;
        }
        const extra =
          get().mode === 'live'
            ? genericTeam(addEngineers, brief.employees.length + 1, fromMonth > 1 ? joinDate : undefined)
            : EXTRA_ENGINEERS.filter((e) => !existing.has(e.id))
                .slice(0, addEngineers)
                .map((e) => (fromMonth > 1 ? { ...e, start: joinDate } : e));
        const next: Brief = { ...brief, months: brief.months + extendMonths, employees: [...brief.employees, ...extra] };
        const result = reallocate(base, brief, next, units);
        const parts = [
          extra.length ? `+${extra.length} engineer${extra.length > 1 ? 's' : ''}${fromMonth > 1 ? ` from month ${fromMonth}` : ''}` : '',
          extendMonths ? `extend ${extendMonths} month${extendMonths > 1 ? 's' : ''}` : '',
        ].filter(Boolean);
        const change: ChangeRequest = { label: parts.join(', ') || 'No change', extendMonths, addEngineers: extra.length, fromMonth, brief: next, result };
        set({ change });
        return change;
      },
      applyChange: () => {
        const c = get().change;
        if (!c) return;
        set({ brief: c.brief, plan: c.result.plan, change: null, approvedAt: new Date().toISOString() });
      },
      setUnitStatus: (unitId, status) => set({ units: get().units.map((u) => (u.id === unitId ? { ...u, status } : u)) }),
      signLease: (l) => set({ signed: [...get().signed.filter((s) => s.unitId !== l.unitId), l] }),
      addIncident: (i) => set({ incidents: [i, ...get().incidents] }),
      setDemoStep: (demoStep) => set({ demoStep }),
      reset: () => set({ ...initial('live'), demoStep: null }),
    }),
    {
      name: 'settle-in-v12',
      version: 12,
      storage: createJSONStorage(() => localStorage),
      // Persist only verification decisions, not the unit catalogue, so seed updates always apply.
      partialize: (s) => ({
        mode: s.mode,
        brief: s.brief,
        plan: s.plan,
        reviewedAt: s.reviewedAt,
        approvedAt: s.approvedAt,
        flex: s.flex,
        change: s.change,
        signed: s.signed,
        incidents: s.incidents,
        unitStatus: Object.fromEntries(s.units.map((u) => [u.id, u.status])),
      }),
      merge: (persisted, current) => {
        const { unitStatus, ...rest } = (persisted ?? {}) as Partial<State> & { unitStatus?: Record<string, VerificationStatus> };
        const mode: Mode = rest.mode === 'demo' ? 'demo' : 'live';
        return { ...current, ...rest, mode, units: unitsFor(mode).map((u) => ({ ...u, status: unitStatus?.[u.id] ?? u.status })) };
      },
    },
  ),
);

/** Ensure the base demo plan exists (used by /demo steps so each step works on its own). */
export function ensureDemoPlan(): Plan {
  useStore.getState().setMode('demo');
  const s = useStore.getState();
  const isBase = s.brief.id === DEMO_BRIEF.id && s.brief.months === DEMO_BRIEF.months && s.brief.employees.length === DEMO_BRIEF.employees.length;
  if (s.plan && isBase) return s.plan;
  s.setBrief(DEMO_BRIEF);
  return useStore.getState().runAllocation();
}
