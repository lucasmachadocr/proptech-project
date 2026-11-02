import { useNavigate } from 'react-router-dom';
import { checkLease } from '../../ai/compliance';
import CityMap from '../../components/CityMap';
import { AiBadge, Badge, Explain, LinkButton, cx } from '../../components/ui';
import { companyById } from '../../data/companies';
import { FACTS } from '../../data/facts';
import { siteById } from '../../data/sites';
import { stayEnd } from '../../lib/dates';
import { eur } from '../../lib/format';
import { draftForAssignment } from '../../lib/leaseDrafts';
import { useStore } from '../../store';

/** Ops plan review queue: the team checks every AI plan before the client sees it. */
export default function ReviewPage() {
  const navigate = useNavigate();
  const { brief, plan, units, reviewedAt, releasePlan, demoStep, setDemoStep } = useStore();

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

  const site = siteById(brief.siteId);
  const company = companyById(brief.companyId);
  const end = stayEnd(brief.start, brief.months);
  const chosen = new Map(plan.assignments.map((a) => [a.unitId, brief.employees.find((e) => e.id === a.employeeId)?.name ?? '']));
  const planUnits = plan.assignments.map((a) => units.find((u) => u.id === a.unitId)!);
  const leasesOk = plan.assignments.every((a) => checkLease(draftForAssignment(brief, a)).canSign);
  const checks = [
    { ok: plan.unassigned.length === 0, text: `Everyone housed (${plan.assignments.length} of ${brief.employees.length})` },
    { ok: planUnits.every((u) => u.status === 'verified'), text: 'Only verified apartments (KYC, Catastro, photos, price)' },
    { ok: plan.assignments.every((a) => a.commuteMin <= brief.maxCommuteMin), text: `Every commute ≤ ${brief.maxCommuteMin} min (max ${Math.round(plan.metrics.maxCommuteMin)} min)` },
    { ok: plan.assignments.every((a) => a.rent <= brief.budgetCaps[brief.employees.find((e) => e.id === a.employeeId)!.role]), text: 'Every apartment within budget' },
    { ok: leasesOk, text: 'Lease drafts pass seasonal-lease rules' },
  ];
  const expiring = planUnits.filter((u) => u.availableTo <= end);

  const release = () => {
    releasePlan();
    if (demoStep) setDemoStep(3);
    navigate('/client/plan');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">Step 2 · Plan — Ops review</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Our team checks every plan before the client sees it</h1>
        <p className="mt-3 max-w-2xl text-lg text-stone-600">The AI did the matching in {plan.computedMs} ms. A person reviews the checks below and releases the plan.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-stone-200 bg-white p-6" data-testid="review-queue">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-stone-500">Queue · 1 plan</div>
              <div className="mt-1 text-lg font-semibold text-ink">
                {company.name} · {brief.employees.length} engineers · {site.city}
              </div>
              <div className="text-sm text-stone-600">
                {brief.months} months · {plan.metrics.apartments} apartments · {eur(plan.metrics.monthlyRent)} rent / month
              </div>
            </div>
            {reviewedAt ? <Badge tone="green">Released</Badge> : <Badge tone="amber">Waiting for review</Badge>}
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
            <Explain>The engine builds the plan in milliseconds; the 48-hour target covers the human review and any calls with operators (business plan v11).</Explain>
            <AiBadge />
          </div>

          <button
            type="button"
            onClick={release}
            disabled={!!reviewedAt && !demoStep}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-brand-700 px-6 py-3.5 text-base font-semibold text-white hover:bg-brand-800 disabled:bg-stone-300"
            data-testid="release-plan"
          >
            {reviewedAt ? 'Open the plan the client sees →' : 'Release plan to the client →'}
          </button>
        </section>

        <CityMap city={site.city} chosen={chosen} height={420} showZones={false} />
      </div>
    </div>
  );
}
