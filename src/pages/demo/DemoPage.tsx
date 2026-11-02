import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CityMap, { CityChips } from '../../components/CityMap';
import { APP_ONE_LINER } from '../../config';
import { FACTS } from '../../data/facts';
import { FRAUD_UNIT_ID } from '../../data/units';
import { startStep } from '../../demo/steps';
import { useStore } from '../../store';

export default function DemoPage() {
  const navigate = useNavigate();
  const [city, setCity] = useState<string>(FACTS.demo.city);

  return (
    <div className="space-y-12">
      <section className="mx-auto max-w-3xl pt-4 text-center sm:pt-10">
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">{FACTS.brand.tagline}</p>
        <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-ink sm:text-5xl">Housing for whole project teams, booked in one go.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-stone-600">{APP_ONE_LINER}</p>
        <button
          type="button"
          data-testid="start-demo"
          onClick={() => navigate(startStep(1))}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-700 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-brand-800"
        >
          Start the demo →
        </button>
        <p className="mt-3 text-sm text-stone-500">3 minutes · 5 steps: Brief → Plan → Approve → Re-plan → Invoice</p>
      </section>

      <section aria-labelledby="explore" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="explore" className="text-xl font-semibold text-ink">
              Where we house teams
            </h2>
            <p className="text-sm text-stone-600">Pick a city: the dark pin is the work site, the rings show 15 and 30 minutes by car.</p>
          </div>
          <CityChips city={city} onChange={setCity} />
        </div>
        <CityMap city={city} height={380} />
      </section>

      <section aria-labelledby="behind" className="border-t border-stone-200 pt-8">
        <h2 id="behind" className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
          Behind the scenes · Ops console
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <BehindLink to={`/ops/verification?focus=${FRAUD_UNIT_ID}`} title="A fake listing gets caught" text="KYC, Catastro, duplicate photos, price check" testId="link-fraud" onClick={() => useStore.getState().setUnitStatus(FRAUD_UNIT_ID, 'pending')} />
          <BehindLink to="/ops/compliance?scenario=noncompliant" title="A bad lease can't be signed" text="Seasonal-lease rules (RDL 29/2026)" testId="link-lease" />
          <BehindLink to="/ops/ledger" title="Where the money goes" text="Operator payout · our revenue · Flex pool" testId="link-ledger" />
        </div>
      </section>
    </div>
  );
}

function BehindLink({ to, title, text, testId, onClick }: { to: string; title: string; text: string; testId: string; onClick?: () => void }) {
  return (
    <Link to={to} onClick={onClick} data-testid={testId} className="group rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:border-ink">
      <div className="font-semibold text-ink group-hover:text-brand-700">{title} →</div>
      <div className="mt-1 text-sm text-stone-600">{text}</div>
    </Link>
  );
}
