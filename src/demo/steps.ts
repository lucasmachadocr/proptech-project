// The scripted 3-minute investor demo: Brief → Plan → Approve → Re-plan → Invoice.
// Each step prepares whatever it needs (so steps can run in any order) and returns the route to open.
import { DEMO_BRIEF } from '../data/brief';
import { ensureDemoPlan, useStore } from '../store';

export interface DemoStep {
  n: number;
  key: 'brief' | 'plan' | 'approve' | 'replan' | 'invoice';
  title: string;
  say: string;
  run: () => string;
}

/** Base demo plan, already released by Ops (used by steps 3–5). */
function ensureReleased() {
  ensureDemoPlan();
  const s = useStore.getState();
  if (!s.reviewedAt) s.releasePlan();
}

export const DEMO_STEPS: DemoStep[] = [
  {
    n: 1,
    key: 'brief',
    title: 'Brief',
    say: 'A company needs 20 engineers in Madrid for 6 months. Instead of 20 searches, it sends one brief. HR can paste the request as written: a language model running in the browser reads who, where, how long and the budget.',
    run: () => {
      useStore.getState().setBrief(DEMO_BRIEF);
      return '/client/brief';
    },
  },
  {
    n: 2,
    key: 'plan',
    title: 'Plan',
    say: 'Our AI matches all 20 people to verified apartments near the site in seconds. Before the client sees it, our ops team reviews the plan — target under 48 hours from brief to plan.',
    run: () => {
      const s = useStore.getState();
      if (!s.plan) {
        s.setBrief(DEMO_BRIEF);
        useStore.getState().runAllocation();
      }
      return '/ops/review';
    },
  },
  {
    n: 3,
    key: 'approve',
    title: 'Approve',
    say: 'The client sees one plan on a map: every apartment, every commute, one monthly price. One click approves the whole team.',
    run: () => {
      ensureReleased();
      return '/client/plan';
    },
  },
  {
    n: 4,
    key: 'replan',
    title: 'Re-plan',
    say: 'Projects change: 3 more engineers join from month 3. Nobody already housed moves; the engine finds 3 more apartments nearby and the client sees the cost before approving: 3 × €1,992 × 4 months = +€23,904, still in the 4% tier.',
    run: () => {
      ensureReleased();
      const s = useStore.getState();
      if (!s.approvedAt) s.approvePlan();
      s.proposeChange(3, 3);
      return '/client/change';
    },
  },
  {
    n: 5,
    key: 'invoice',
    title: 'Invoice',
    say: 'One invoice for the whole mission: rent, our markup and the optional Flex as separate lines, collected by SEPA monthly in advance. Operators are paid at check-in.',
    run: () => {
      ensureReleased();
      const s = useStore.getState();
      if (!s.approvedAt) s.approvePlan();
      return '/client/invoice';
    },
  },
];

/** Runs step n, remembers it for the stepper and returns the route to open. */
export function startStep(n: number): string {
  const route = DEMO_STEPS[n - 1].run();
  useStore.getState().setDemoStep(n);
  return route;
}
