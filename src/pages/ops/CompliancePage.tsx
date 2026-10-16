import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { checkLease, type LeaseDraft } from '../../ai/compliance';
import { AiBadge, Badge, Button, Card, Empty, Light, PageHeader, cx, inputCls, labelCls } from '../../components/ui';
import { daysInclusive } from '../../lib/dates';
import { draftForAssignment, nonCompliantDraft } from '../../lib/leaseDrafts';
import { ensureDemoPlan, useStore } from '../../store';

type Scenario = 'compliant' | 'noncompliant';

export default function CompliancePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { brief, plan, units } = useStore();
  const scenario = (params.get('scenario') as Scenario) ?? 'compliant';
  const assignment = plan?.assignments.find((a) => a.employeeId === 'E07') ?? plan?.assignments[0];

  const initial = useMemo<LeaseDraft | null>(() => {
    if (!plan || !assignment) return null;
    return scenario === 'noncompliant' ? nonCompliantDraft(brief, assignment) : draftForAssignment(brief, assignment);
  }, [plan, assignment, brief, scenario]);

  const [draft, setDraft] = useState<LeaseDraft | null>(initial);
  useEffect(() => setDraft(initial), [initial]);

  if (!plan || !draft) {
    return (
      <Empty title="No plan yet — leases are generated from an approved plan">
        <Button onClick={() => ensureDemoPlan()}>Generate demo plan</Button>
      </Empty>
    );
  }

  const result = checkLease(draft);
  const reds = result.rules.filter((r) => r.light === 'red').length;
  const unit = units.find((u) => u.id === draft.unitId);
  const set = <K extends keyof LeaseDraft>(k: K, v: LeaseDraft[K]) => setDraft({ ...draft, [k]: v });

  return (
    <>
      <PageHeader
        eyebrow="Operations · compliance engine"
        title="Seasonal-lease compliance check"
        subtitle="Royal Decree-Law 29/2026 (in force since 8 Oct 2026) requires a real, documented cause for every seasonal lease. A lease without one becomes a 5–7-year habitual-residence lease. The engine checks every lease before signature and blocks signing on red."
        actions={
          <div className="inline-flex rounded-lg bg-stone-100 p-1" role="group" aria-label="Scenario">
            {(['compliant', 'noncompliant'] as Scenario[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={scenario === s}
                onClick={() => setParams({ scenario: s })}
                className={cx('rounded-md px-3 py-1.5 text-sm font-medium', scenario === s ? 'bg-white text-brand-800 shadow-sm' : 'text-stone-600')}
              >
                {s === 'compliant' ? 'Standard lease' : 'Non-compliant example'}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="Lease draft">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-sm sm:col-span-2">
              <div className="text-stone-500">Unit</div>
              <div className="font-medium text-stone-900">
                {unit?.id} · {unit?.title}, {unit?.address}
              </div>
            </div>
            <label className={`${labelCls} sm:col-span-2`}>
              Named occupants (comma-separated)
              <input className={inputCls} value={draft.occupants.join(', ')} onChange={(e) => set('occupants', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
            </label>
            <label className={labelCls}>
              Start
              <input type="date" className={inputCls} value={draft.start} onChange={(e) => set('start', e.target.value)} />
            </label>
            <label className={labelCls}>
              End
              <input type="date" className={inputCls} value={draft.end} onChange={(e) => set('end', e.target.value)} />
            </label>
            <div className="-mt-2 text-xs text-stone-500 sm:col-span-2">{daysInclusive(draft.start, draft.end)} days</div>
            <label className={`${labelCls} sm:col-span-2`}>
              <span className="flex items-center justify-between">
                Cause of temporary stay
                <button
                  type="button"
                  className="text-xs font-medium text-brand-800 hover:underline"
                  onClick={() => assignment && set('cause', draftForAssignment(brief, assignment).cause)}
                >
                  Draft from brief <AiBadge />
                </button>
              </span>
              <textarea rows={4} className={inputCls} value={draft.cause} onChange={(e) => set('cause', e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
              <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={draft.assignmentLetter} onChange={(e) => set('assignmentLetter', e.target.checked)} />
              Employer assignment letter attached
            </label>
            <label className={labelCls}>
              Additional guarantee (months)
              <input type="number" min={0} max={6} className={inputCls} value={draft.guaranteeMonths} onChange={(e) => set('guaranteeMonths', Number(e.target.value))} />
            </label>
            <label className={labelCls}>
              Earlier consecutive leases (same parties, same unit)
              <input type="number" min={0} max={5} className={inputCls} value={draft.priorConsecutiveLeases} onChange={(e) => set('priorConsecutiveLeases', Number(e.target.value))} />
            </label>
          </div>
        </Card>

        <div className="space-y-4">
          <Card
            title={
              <span className="flex items-center gap-2">
                Compliance result <AiBadge label="Rules engine" />
              </span>
            }
            actions={<Light light={result.overall} />}
          >
            {!result.canSign && (
              <div className="mb-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white" role="alert">
                ⛔ Signature blocked — {reds} rule{reds > 1 ? 's' : ''} failed
              </div>
            )}
            <ul className="space-y-2" data-testid="compliance-rules">
              {result.rules.map((r) => (
                <li key={r.id} className={cx('flex gap-3 rounded-lg border px-3 py-2.5 text-sm', r.light === 'red' ? 'border-red-200 bg-red-50/60' : r.light === 'amber' ? 'border-amber-200 bg-amber-50/60' : 'border-stone-200')}>
                  <span aria-hidden className={cx('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', r.light === 'red' ? 'bg-red-600' : r.light === 'amber' ? 'bg-amber-500' : 'bg-emerald-600')} />
                  <span className="flex-1">
                    <span className="font-medium text-stone-900">{r.label}</span>
                    <span className="block text-stone-600">{r.detail}</span>
                  </span>
                  <span className="sr-only">{r.light}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
              <Button disabled={!result.canSign} onClick={() => navigate(`/ops/leases?unit=${draft.unitId}`)} data-testid="sign-lease">
                Generate & sign lease
              </Button>
              {result.canSign ? (
                <Badge tone="green">Ready for e-signature</Badge>
              ) : (
                <span className="text-sm font-medium text-red-700" role="status" data-testid="sign-blocked">
                  Signing blocked: fix {reds} red item{reds > 1 ? 's' : ''} first.
                </span>
              )}
            </div>
          </Card>
          <Card title="What the engine encodes">
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
              <li>Duration more than 31 days and at most 12 months per occupant and unit.</li>
              <li>A written cause of temporary work displacement, plus the employer's assignment letter as evidence.</li>
              <li>No more than two consecutive leases between the same parties on the same unit.</li>
              <li>Additional guarantee capped at one month of rent.</li>
              <li>Company as tenant, with the occupants named in the lease.</li>
            </ul>
            <p className="mt-3 text-xs text-stone-500">
              Demo encoding of RDL 29/2026 for an academic project — not legal advice. Rules may change after the 29 Nov 2026 election; templates are maintained by an external lawyer.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
