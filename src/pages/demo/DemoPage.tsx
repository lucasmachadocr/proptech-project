import { useNavigate } from 'react-router-dom';
import { AiBadge, Badge } from '../../components/ui';
import { APP_NAME } from '../../config';
import { DEMO_BRIEF } from '../../data/brief';
import { PROVIDERS } from '../../data/providers';
import { SITES } from '../../data/sites';
import { FRAUD_UNIT_ID } from '../../data/units';
import { ensureDemoPlan, useStore } from '../../store';

interface Step {
  n: number;
  title: string;
  button: string;
  say: string;
  where: string;
  run: () => string; // returns the route to open
}

export default function DemoPage() {
  const navigate = useNavigate();
  const units = useStore((s) => s.units);

  const steps: Step[] = [
    {
      n: 1,
      title: 'One brief → one housing plan',
      button: 'Allocate 15 employees',
      say: '15 people, 6 months, Microsoft campus area, ≤ 30 min commute and per-role budgets. The engine evaluates every person × unit pair and explains its trade-offs.',
      where: 'Client · Plan',
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
      run: () => {
        ensureDemoPlan();
        return '/ops/ledger';
      },
    },
  ];

  const verifiedUnits = units.filter((u) => u.status === 'verified').length;

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white px-5 py-7 shadow-sm sm:px-10 sm:py-10">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-50" aria-hidden />
        <div className="relative max-w-3xl">
          <Badge tone="accent">Investor demo · 13 Nov 2026</Badge>
          <h1 className="mt-4 text-[26px] leading-tight font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Housing for project teams, planned like a project.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-600 sm:text-base">
            {APP_NAME} houses the engineers, technicians, managers and expat families who move to Zaragoza for the data-centre and gigafactory build-outs. A company sends one brief; our engine
            proposes one plan; leases, payments and changes run on one platform with one monthly invoice.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat k="Project sites" v={String(SITES.length)} />
            <Stat k="Verified units" v={String(verifiedUnits)} />
            <Stat k="Professional providers" v={String(PROVIDERS.length)} />
            <Stat k="Take rate" v="18%" />
          </dl>
        </div>
      </section>

      <h2 className="mt-8 mb-4 text-lg font-semibold text-stone-900">Run the demo in five steps</h2>
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" data-testid="demo-steps">
        {steps.map((s) => (
          <li key={s.n} className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="num grid h-8 w-8 place-items-center rounded-full bg-stone-900 text-sm font-semibold text-white">{s.n}</span>
              {(s.n === 1 || s.n === 2 || s.n === 3) && <AiBadge />}
            </div>
            <h3 className="mt-3 text-[15px] leading-snug font-semibold text-stone-900">{s.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">{s.say}</p>
            <div className="mt-4 text-xs text-stone-400">Opens {s.where}</div>
            <button
              type="button"
              data-testid={`demo-step-${s.n}`}
              onClick={() => navigate(s.run())}
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-brand-700 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
            >
              {s.button} →
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-stone-500">
        Each step can run on its own: it prepares whatever it needs. Use “Reset demo” in the footer to start clean. All companies, people and listings are fictional demo data.
      </p>
    </>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{k}</dt>
      <dd className="num text-2xl font-semibold text-stone-900">{v}</dd>
    </div>
  );
}
