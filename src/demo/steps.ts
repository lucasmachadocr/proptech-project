// The scripted 5-step investor demo. Each step prepares whatever it needs, so steps can run
// in any order, and returns the route to open.
import { DEMO_BRIEF } from '../data/brief';
import { FRAUD_UNIT_ID } from '../data/units';
import { ensureDemoPlan, useStore } from '../store';

export interface DemoStep {
  n: number;
  title: string;
  button: string;
  say: string;
  where: string;
  ai: boolean;
  run: () => string;
}

export const DEMO_STEPS: DemoStep[] = [
  {
    n: 1,
    title: 'One brief → one housing plan',
    button: 'Allocate 15 employees',
    say: '15 people, 6 months, Microsoft campus area, ≤ 30 min commute and per-role budgets. The engine evaluates every person × unit pair and explains its trade-offs.',
    where: 'Client · Plan',
    ai: true,
    run: () => {
      const s = useStore.getState();
      s.setBrief(DEMO_BRIEF);
      s.runAllocation();
      return '/client/plan';
    },
  },
  {
    n: 2,
    title: 'The project changes, the plan follows',
    button: 'Extend 2 months + 3 engineers',
    say: 'Three units are not free for the extra months. Only those three people move, three new engineers are housed, and the client sees the cost delta before approving.',
    where: 'Client · Changes',
    ai: true,
    run: () => {
      ensureDemoPlan();
      const s = useStore.getState();
      if (!s.approvedAt) s.approvePlan();
      s.proposeChange(2, 3);
      return '/client/change';
    },
  },
  {
    n: 3,
    title: 'Verification catches a fraudulent listing',
    button: 'Run verification on the queue',
    say: 'A new provider lists a cheap flat in the centre. Its photos belong to another listing, the price is 40% below the area median and the owner on the deed does not match the company.',
    where: 'Operations · Verification',
    ai: true,
    run: () => {
      useStore.getState().setUnitStatus(FRAUD_UNIT_ID, 'pending');
      return `/ops/verification?focus=${FRAUD_UNIT_ID}`;
    },
  },
  {
    n: 4,
    title: 'Compliance blocks a non-compliant lease',
    button: 'Check a non-compliant lease',
    say: 'Under Royal Decree-Law 29/2026 a seasonal lease needs a documented work cause, more than 31 days and at most 12 months, no third consecutive lease and at most a one-month guarantee. Red means no signature.',
    where: 'Operations · Compliance',
    ai: false,
    run: () => {
      ensureDemoPlan();
      return '/ops/compliance?scenario=noncompliant';
    },
  },
  {
    n: 5,
    title: 'One invoice: GMV vs our revenue',
    button: 'Show the money',
    say: '€162,000 of rent becomes €174,960 invoiced. Rent sits at a licensed payment provider, never on our balance sheet. We keep 18%: €29,160.',
    where: 'Operations · Payments ledger',
    ai: false,
    run: () => {
      ensureDemoPlan();
      return '/ops/ledger';
    },
  },
];

/** Runs step n, remembers it for the guided demo bar and returns the route to open. */
export function startStep(n: number): string {
  const step = DEMO_STEPS[n - 1];
  const route = step.run();
  useStore.getState().setDemoStep(n);
  return route;
}
