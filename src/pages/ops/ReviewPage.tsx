import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_LAMBDA, LAMBDA_CLOSEST, LAMBDA_LOWEST_COST, allocate } from '../../ai/allocate';
import { checkLease } from '../../ai/compliance';
import CityMap from '../../components/CityMap';
import PlanExplorer from '../../components/PlanExplorer';
import { AiBadge, Badge, Explain, LinkButton, cx } from '../../components/ui';
import { companyById } from '../../data/companies';
import { FACTS } from '../../data/facts';
import { briefSite } from '../../data/sites';
import { stayEnd } from '../../lib/dates';
import { eur } from '../../lib/format';
import { companyInvoice } from '../../lib/money';
import type { Plan } from '../../types';
import { draftForAssignment } from '../../lib/leaseDrafts';
import { useStore } from '../../store';

/** Ops plan review queue: the team checks every AI plan before the client sees it. */
export default function ReviewPage() {
  const navigate = useNavigate();
  const { brief, plan, units, reviewedAt, releasePlan, choosePlan, demoStep, setDemoStep, flex, mode } = useStore();
  const live = mode === 'live';
  const [preview, setPreview] = useState<'A' | 'B' | 'C'>('B');
  // Live mode: HR can ask for plans from one marketplace only (Airbnb, Booking.com, Spotahome).
  const [source, setSource] = useState<string>('all');
  const sources = useMemo(() => [...new Set(units.map((u) => u.source).filter(Boolean))] as string[], [units]);
  const pool = useMemo(() => (source === 'all' ? units : units.filter((u) => u.source === source)), [units, source]);
  const options = useMemo(() => {
    if (!plan) return null;
    const B = source === 'all' ? plan : allocate(brief, pool, { lambda: DEFAULT_LAMBDA });
    return { A: allocate(brief, pool, { lambda: LAMBDA_LOWEST_COST }), B, C: allocate(brief, pool, { lambda: LAMBDA_CLOSEST }) } as Record<'A' | 'B' | 'C', Plan>;
  }, [plan, brief, units, pool, source]);

  if (!plan) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
        <h1 className="text-xl font-semibold text-ink">No plans waiting for review</h1>
        <p className="mt-2 text-stone-600">A plan appears here as soon as a company sends a brief. Our engine builds it; a person checks it before the client sees it.</p>
        <div className="mt-6">
          <LinkButton to="/client/brief">Go to the brief</LinkButton>
        </div>
      </div>
    );
  }

  const site = briefSite(brief);
  const company = companyById(brief.companyId);
  const end = stayEnd(brief.start, brief.months);
  const shown = options![preview];
  const chosen = new Map(shown.assignments.map((a) => [a.unitId, brief.employees.find((e) => e.id === a.employeeId)?.name ?? '']));
  const priceOf = (p: Plan) => Math.round(companyInvoice(p.metrics.monthlyRent, p.metrics.apartments, flex).total / p.metrics.apartments);
  const cp = live ? shown : plan; // live: the checks follow the option the client is looking at
  const planUnits = cp.assignments.map((a) => units.find((u) => u.id === a.unitId)!);
  const leasesOk = cp.assignments.every((a) => checkLease(draftForAssignment(brief, a)).canSign);
  const checks = [
    { ok: cp.unassigned.length === 0, text: `Everyone housed (${cp.assignments.length} of ${brief.employees.length})` },
    live
      ? { ok: true, text: `Real public listings (${source === 'all' ? sources.join(', ') : source}). Settle In verifies each flat before signing` }
      : { ok: planUnits.every((u) => u.status === 'verified'), text: 'Only verified apartments (KYC, Catastro, photos, price)' },
    { ok: cp.assignments.every((a) => a.commuteMin <= brief.maxCommuteMin), text: `Every commute ≤ ${brief.maxCommuteMin} min (max ${Math.round(cp.metrics.maxCommuteMin)} min)` },
    { ok: cp.assignments.every((a) => a.rent <= brief.budgetCaps[brief.employees.find((e) => e.id === a.employeeId)!.role]), text: 'Every apartment within budget' },
    { ok: leasesOk, text: 'Lease drafts pass seasonal-lease rules' },
  ];
  const expiring = planUnits.filter((u) => u.availableTo <= end);

  const release = () => {
    if (live) {
      choosePlan(options![preview]);
      navigate('/client/plan');
      return;
    }
    releasePlan();
    if (demoStep) setDemoStep(3);
    navigate('/client/plan');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">{live ? 'Step 2 · Plan' : 'Step 2 · Plan — Ops review'}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{live ? 'Three plans for your team' : 'Our team checks every plan before the client sees it'}</h1>
        <p className="mt-3 max-w-2xl text-lg text-stone-600">
          {live
            ? `Built in ${plan.computedMs} ms from ${units.length} real flats listed in Madrid. Pick one; in the live service a person checks it with the operators within ${FACTS.kpi.briefToPlanHours} h.`
            : `The AI compared three ways to house the team in ${plan.computedMs} ms. A person reviews the recommended one and releases it.`}
        </p>
      </div>

      {live && (
        <div className="flex flex-wrap items-center gap-2 text-sm" role="radiogroup" aria-label="Listings from" data-testid="source-filter">
          <span className="text-stone-600">Flats from:</span>
          {['all', ...sources].map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={source === s}
              onClick={() => setSource(s)}
              className={cx('rounded-full px-3 py-1.5 font-medium', source === s ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-stone-300 hover:ring-ink')}
            >
              {s === 'all' ? `All (${units.length})` : `${s} (${units.filter((u) => u.source === s).length})`}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Options" data-testid="plan-options">
        {(['A', 'B', 'C'] as const).map((k) => {
          const o = FACTS.options[k];
          const p = options![k];
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={preview === k}
              onClick={() => setPreview(k)}
              data-testid={`option-${k}`}
              className={cx('rounded-2xl border bg-white p-5 text-left transition-colors', preview === k ? 'border-ink ring-2 ring-ink' : 'border-stone-200 hover:border-stone-400')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-stone-500">
                  {k} · {o.label}
                </span>
                {k === 'B' ? <Badge tone="accent">Recommended</Badge> : null}
              </div>
              <div className="num mt-2 text-2xl font-semibold text-ink">
                {eur(priceOf(p))}
                <span className="text-base font-normal text-stone-500"> / apartment / month</span>
              </div>
              <div className="num text-stone-600">{Math.round(p.metrics.avgCommuteMin)} min average commute</div>
            </button>
          );
        })}
      </div>
      <p className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
        <AiBadge /> Options built by the engine (all-in price: rent + markup{flex ? ' + Flex' : ''}). A person reviews before the client sees anything.
        <Explain label="How are the options built?">Same team, same rules, three priorities: A ignores commute and minimises cost, C minimises commute, B balances both (€{DEFAULT_LAMBDA} of value per commute minute).</Explain>
      </p>

      <div className={live ? 'max-w-2xl' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'}>
        <section className="rounded-2xl border border-stone-200 bg-white p-6" data-testid="review-queue">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-stone-500">{live ? `Option ${preview} · checks` : 'Queue · 1 plan'}</div>
              <div className="mt-1 text-lg font-semibold text-ink">
                {live ? brief.companyName : company.name} · {brief.employees.length} engineers · {site.city}
              </div>
              <div className="text-sm text-stone-600">
                {brief.months} months · {plan.metrics.apartments} apartments · {eur(plan.metrics.monthlyRent)} rent / month
              </div>
            </div>
            {live ? null : reviewedAt ? <Badge tone="green">Released</Badge> : <Badge tone="amber">Waiting for review</Badge>}
          </div>

          <ul className="mt-5 space-y-2" aria-label="Automatic checks">
            {checks.map((c) => (
              <li key={c.text} className="flex items-start gap-2 text-sm">
                <span aria-hidden className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white', c.ok ? 'bg-emerald-600' : 'bg-red-600')}>
                  {c.ok ? '✓' : '!'}
                </span>
                <span className="text-ink">{c.text}</span>
                <span className="sr-only">{c.ok ? 'passed' : 'failed'}</span>
              </li>
            ))}
            {expiring.length > 0 && (
              <li className="flex items-start gap-2 text-sm">
                <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-500 text-xs font-bold text-white">i</span>
                <span className="text-stone-700">
                  Note for the account manager: {expiring.length} apartments are free only until the end of the mission — if it is extended, those people will move.
                </span>
              </li>
            )}
          </ul>

          <div className="mt-6 flex items-center gap-2 text-sm text-stone-600">
            Brief → plan target: ≤ {FACTS.kpi.briefToPlanHours} h
            <Explain>The engine builds the plan in milliseconds; the 48-hour target covers the human review and any calls with operators (business plan, November 2026).</Explain>
            <AiBadge />
          </div>

          <button
            type="button"
            onClick={release}
            disabled={!live && !!reviewedAt && !demoStep}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-brand-700 px-6 py-3.5 text-base font-semibold text-white hover:bg-brand-800 disabled:bg-stone-300"
            data-testid="release-plan"
          >
            {live ? `Continue with option ${preview} →` : reviewedAt ? 'Open the plan the client sees →' : 'Release option B to the client →'}
          </button>
        </section>

        {!live && <CityMap city={site.city} chosen={chosen} height={420} showZones={false} site={site} />}
      </div>
      {live && (
        <section aria-label={`Flats in option ${preview}`} className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">
            Option {preview}: the {shown.assignments.length} flats, on the map
          </h2>
          <PlanExplorer brief={brief} site={site} assignments={shown.assignments} units={units} />
        </section>
      )}
    </div>
  );
}
