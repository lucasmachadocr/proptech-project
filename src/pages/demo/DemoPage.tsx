import { Link, useNavigate } from 'react-router-dom';
import CityMap from '../../components/CityMap';
import { APP_ONE_LINER, CONTACT_EMAIL } from '../../config';
import { FACTS } from '../../data/facts';
import { LIVE_LISTINGS_COLLECTED, LIVE_UNITS } from '../../data/liveListings';
import { MADRID_PROJECT_SITES } from '../../data/sites';
import { FRAUD_UNIT_ID } from '../../data/units';
import { startStep } from '../../demo/steps';
import { formatDate } from '../../lib/dates';
import { useStore } from '../../store';

// The six steps of the service (Deliverable 3, user journey).
const JOURNEY = [
  { t: 'Brief', d: 'Paste the email or fill a short form. Day 0.' },
  { t: 'Plan', d: `Three plans from real flats, checked by a person. Within ${FACTS.kpi.briefToPlanHours} h.` },
  { t: 'Sign', d: 'One framework agreement; a seasonal lease per flat, signed online.' },
  { t: 'Move in', d: 'Address, keys and house rules on WhatsApp. No app.' },
  { t: 'Re-plan', d: 'More people or new dates: the cost is shown before you approve.' },
  { t: 'Pay', d: 'One monthly invoice by direct debit.' },
];

export default function DemoPage() {
  const navigate = useNavigate();
  const next = FACTS.cities.slice(1);

  const startLive = () => {
    const s = useStore.getState();
    s.setMode('live');
    s.reset(); // a fresh mission every time
    navigate('/client/brief');
  };
  const startDemo = () => {
    useStore.getState().reset();
    navigate(startStep(1));
  };

  return (
    <div className="space-y-14">
      <section className="mx-auto max-w-3xl pt-4 text-center sm:pt-10">
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-700 ring-1 ring-brand-200">
          <span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden /> Now open in {FACTS.cities[0]}
        </p>
        <h1 className="mt-5 text-3xl leading-tight font-semibold tracking-tight text-ink sm:text-5xl">Housing for your whole project team, in one brief.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-stone-600">{APP_ONE_LINER}</p>
        <button
          type="button"
          data-testid="start-live"
          onClick={startLive}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-700 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-brand-800"
        >
          Start a mission in {FACTS.cities[0]} →
        </button>
        <p className="mt-3 text-sm text-stone-500">
          Your own project, on {LIVE_UNITS.length} real flats listed in {FACTS.cities[0]}. No sign-up.
        </p>
      </section>

      <section aria-labelledby="how" className="space-y-4">
        <h2 id="how" className="text-xl font-semibold text-ink">
          How it works
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {JOURNEY.map((j, i) => (
            <li key={j.t} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="num text-sm font-semibold text-brand-700">{i + 1}</div>
              <div className="mt-1 font-semibold text-ink">{j.t}</div>
              <div className="mt-1 text-sm text-stone-600">{j.d}</div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="madrid" className="space-y-4">
        <div>
          <h2 id="madrid" className="text-xl font-semibold text-ink">
            {FACTS.cities[0]}: real flats, live today
          </h2>
          <p className="text-sm text-stone-600">
            Furnished 1-bedroom flats listed publicly on Spotahome, collected {formatDate(LIVE_LISTINGS_COLLECTED)}. Each dot is a real listing (neighbourhood location); tap one to open it.
          </p>
        </div>
        <CityMap city={FACTS.cities[0]} units={LIVE_UNITS} site={MADRID_PROJECT_SITES[0]} height={380} />
      </section>

      <section aria-labelledby="next" className="rounded-2xl border border-stone-200 bg-white p-6" data-testid="coming-next">
        <h2 id="next" className="text-xl font-semibold text-ink">
          Coming next
        </h2>
        <p className="mt-1 text-sm text-stone-600">We open two cities a year, once {FACTS.cities[0]} meets its month-12 targets.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {next.map((c) => (
            <li key={c} className="flex flex-col justify-between gap-3 rounded-xl bg-cream/60 p-4 ring-1 ring-stone-200">
              <div>
                <div className="font-semibold text-ink">{c}</div>
                <div className="text-sm font-semibold tracking-wide text-brand-700 uppercase">{FACTS.rollout[c]}</div>
              </div>
              {CONTACT_EMAIL ? (
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Tell me when Settle In opens in ${c}`)}`}
                  className="inline-flex justify-center rounded-full px-4 py-2 text-sm font-medium text-ink ring-1 ring-stone-300 hover:ring-ink"
                >
                  Tell me when it opens
                </a>
              ) : (
                <span className="text-xs text-stone-500">Not yet open for briefs</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="investors" className="border-t border-stone-200 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="investors" className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
              For investors
            </h2>
            <p className="mt-1 text-sm text-stone-600">The scripted case from our business plan: {FACTS.demo.people} engineers, {FACTS.demo.city}, {FACTS.demo.months} months. Demo data.</p>
          </div>
          <button type="button" data-testid="start-demo" onClick={startDemo} className="rounded-full px-5 py-2.5 font-semibold text-ink ring-1 ring-stone-300 hover:ring-ink">
            Investor demo · 3 min →
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <BehindLink
            to={`/ops/verification?focus=${FRAUD_UNIT_ID}`}
            title="A fake listing gets caught"
            text="KYC, Catastro, duplicate photos, price check"
            testId="link-fraud"
            onClick={() => {
              useStore.getState().setMode('demo');
              useStore.getState().setUnitStatus(FRAUD_UNIT_ID, 'pending');
            }}
          />
          <BehindLink to="/ops/compliance?scenario=noncompliant" title="A bad lease can't be signed" text="Seasonal-lease rules (RDL 29/2026)" testId="link-lease" onClick={() => useStore.getState().setMode('demo')} />
          <BehindLink to="/ops/ledger" title="Where the money goes" text="Operator payout · our revenue · Flex pool" testId="link-ledger" onClick={() => useStore.getState().setMode('demo')} />
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
