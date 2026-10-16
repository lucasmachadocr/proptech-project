import { useNavigate } from 'react-router-dom';
import { AiBadge, Badge } from '../../components/ui';
import { APP_NAME } from '../../config';
import { PROVIDERS } from '../../data/providers';
import { SITES } from '../../data/sites';
import { DEMO_STEPS, startStep } from '../../demo/steps';
import { useStore } from '../../store';

export default function DemoPage() {
  const navigate = useNavigate();
  const units = useStore((s) => s.units);
  const steps = DEMO_STEPS;

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
          <button
            type="button"
            data-testid="start-guided-demo"
            onClick={() => navigate(startStep(1))}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-800 sm:w-auto"
          >
            ▶ Start guided demo
          </button>
          <p className="mt-2 text-xs text-stone-500">Walks through the five steps with a bar at the bottom of the screen: Next, Back and talking points.</p>
        </div>
      </section>

      <h2 className="mt-8 mb-4 text-lg font-semibold text-stone-900">Run the demo in five steps</h2>
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" data-testid="demo-steps">
        {steps.map((s) => (
          <li key={s.n} className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="num grid h-8 w-8 place-items-center rounded-full bg-stone-900 text-sm font-semibold text-white">{s.n}</span>
              {s.ai && <AiBadge />}
            </div>
            <h3 className="mt-3 text-[15px] leading-snug font-semibold text-stone-900">{s.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">{s.say}</p>
            <div className="mt-4 text-xs text-stone-400">Opens {s.where}</div>
            <button
              type="button"
              data-testid={`demo-step-${s.n}`}
              onClick={() => navigate(startStep(s.n))}
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
