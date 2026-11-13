import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { llm } from '../../ai/llm';
import PlanExplorer from '../../components/PlanExplorer';
import { AiBadge, Badge, Explain, Kpi, LinkButton } from '../../components/ui';
import { FACTS } from '../../data/facts';
import { providerById } from '../../data/providers';
import { briefSite } from '../../data/sites';
import { UNIT_TYPE_SHORT } from '../../data/units';
import { startStep } from '../../demo/steps';
import { eur, pct } from '../../lib/format';
import { companyInvoice, tierLabel } from '../../lib/money';
import { useStore } from '../../store';

export default function PlanPage() {
  const navigate = useNavigate();
  const { brief, plan, units, reviewedAt, approvedAt, approvePlan, flex, setFlex, demoStep, mode } = useStore();
  const live = mode === 'live';
  const [summary, setSummary] = useState('');
  const [showList, setShowList] = useState(false);
  const [agreed, setAgreed] = useState(false); // live: the Sign step

  useEffect(() => {
    if (plan) llm.explainPlan(plan, brief).then(setSummary);
  }, [plan, brief]);

  if (!plan || !reviewedAt) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
        <h1 className="text-xl font-semibold text-ink">{plan ? 'Your plan is with our team' : 'No plan yet'}</h1>
        <p className="mt-2 text-stone-600">
          {plan ? `We check every plan before you see it — target under ${FACTS.kpi.briefToPlanHours} hours.` : 'Send a brief and we will come back with one plan for the whole team.'}
        </p>
        <div className="mt-6">
          <LinkButton to={plan ? '/ops/review' : '/client/brief'}>{plan ? 'See the Ops review' : 'Go to the brief'}</LinkButton>
        </div>
      </div>
    );
  }

  const site = briefSite(brief);
  const m = plan.metrics;
  const inv = companyInvoice(m.monthlyRent, m.apartments, flex);
  const missionTotal = companyInvoice(m.totalRent, m.apartments, flex).total;

  const approve = () => {
    approvePlan();
  };
  const next = () => navigate(demoStep ? startStep(4) : '/client/change');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">Step 3 · Approve</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            {m.apartments} apartments near the {site.city} site
          </h1>
          <p className="mt-2 text-lg text-stone-600">{summary}</p>
        </div>
        {approvedAt ? (
          <div className="flex items-center gap-3">
            <Badge tone="green">{live ? '✓ Approved and signed' : '✓ Approved'}</Badge>
            <button type="button" onClick={next} className="rounded-full bg-brand-700 px-6 py-3 font-semibold text-white hover:bg-brand-800" data-testid="plan-next">
              Next: the project changes →
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2">
            {live && (
              <label className="flex max-w-sm items-start gap-2 text-sm text-stone-700" data-testid="sign-agreement">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-700" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>
                  I accept the Settle In framework agreement. One seasonal lease per flat is then signed online by both sides.
                </span>
              </label>
            )}
            <button type="button" onClick={approve} disabled={live && !agreed} className="rounded-full bg-brand-700 px-8 py-3.5 text-lg font-semibold text-white hover:bg-brand-800 disabled:bg-stone-300" data-testid="approve-plan">
              {live ? 'Approve and sign' : 'Approve the plan'}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3" data-testid="plan-kpis">
        <Kpi
          label="You pay per month"
          value={eur(inv.total)}
          hint={`${eur(missionTotal)} for ${brief.months} months`}
          explain={
            <>
              Rent {eur(inv.rent)} + markup {pct(inv.markupRate)} ({tierLabel(m.apartments)}) {eur(inv.markup)}
              {flex ? ` + Flex ${pct(FACTS.pricing.flex)} ${eur(inv.flex)}` : ''}. VAT not shown.
            </>
          }
          testId="kpi-pay"
        />
        <Kpi label="Average commute" value={`${m.avgCommuteMin} min`} hint={`Longest ${Math.round(m.maxCommuteMin)} min · limit ${brief.maxCommuteMin} min`} explain="Straight-line distance × 1.3 road factor at 50 km/h, from each apartment to the work site." />
        <Kpi label="Team housed" value={`${plan.assignments.length} / ${brief.employees.length}`} hint={live ? 'One flat each · public listings, verified before signing' : 'One apartment each, all verified'} ai explain="Our engine compared every person with every verified apartment and picked the lowest total of rent plus commute time, within your budget and commute limit." />
      </div>

      <label className="flex w-fit items-center gap-3 rounded-full bg-white px-4 py-2 text-sm ring-1 ring-stone-200">
        <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={flex} onChange={(e) => setFlex(e.target.checked)} data-testid="flex-toggle" />
        <span>
          <strong>Flex</strong> (+{pct(FACTS.pricing.flex)}) included
        </span>
        <Explain label="What is Flex?">An optional add-on of {pct(FACTS.pricing.flex)} of rent, shown as its own line on the invoice. Half is Settle In revenue, half goes to an operator pool.</Explain>
      </label>

      <PlanExplorer brief={brief} site={site} assignments={plan.assignments} units={units} />

      <div className="flex flex-wrap gap-3">
{!live && (
        <button type="button" onClick={() => setShowList(!showList)} className="rounded-full px-4 py-2 text-sm font-medium ring-1 ring-stone-300 hover:ring-ink" aria-expanded={showList}>
          {showList ? 'Hide the list' : 'Show who lives where'}
        </button>
        )}
        <details className="rounded-2xl text-sm">
          <summary className="cursor-pointer rounded-full px-4 py-2 font-medium ring-1 ring-stone-300 hover:ring-ink">
            Why this plan? <AiBadge />
          </summary>
          <ul className="mt-3 max-w-3xl space-y-2 text-stone-700" data-testid="tradeoffs">
            {plan.tradeoffs.map((t, i) => (
              <li key={i}>• {t.text}</li>
            ))}
          </ul>
        </details>
      </div>

      {showList && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="plan-list">
          {plan.assignments.map((a) => {
            const e = brief.employees.find((x) => x.id === a.employeeId)!;
            const u = units.find((x) => x.id === a.unitId)!;
            return (
              <li key={a.unitId} className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="font-semibold text-ink">{e.name}</div>
                <div className="text-sm text-stone-600">
                  {UNIT_TYPE_SHORT[u.type]} · {u.zone} · {Math.round(a.commuteMin)} min
                </div>
                <div className="num mt-1 text-sm text-stone-500">
                  {eur(a.rent)}/mo · {u.source ?? providerById(u.providerId).name}
                  {u.approxLocation ? ' · approx. location' : ''}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
