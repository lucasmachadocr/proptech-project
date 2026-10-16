import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView, { type MapUnit } from '../../components/MapView';
import { AiBadge, Badge, Button, Card, Empty, Kpi, LinkButton, PageHeader, inputCls, labelCls, tableCls, tableWrap, td, th } from '../../components/ui';
import { ROLE_LABEL } from '../../data/brief';
import { siteById } from '../../data/sites';
import { formatDate, stayEnd } from '../../lib/dates';
import { eur, signedEur } from '../../lib/format';
import { ensureDemoPlan, useStore } from '../../store';
import type { DiffKind } from '../../types';

const KIND: Record<DiffKind, { tone: 'neutral' | 'amber' | 'accent' | 'red'; label: string }> = {
  kept: { tone: 'neutral', label: 'Kept' },
  moved: { tone: 'amber', label: 'Moved' },
  new: { tone: 'accent', label: 'New' },
  removed: { tone: 'red', label: 'Removed' },
};

export default function ChangePage() {
  const navigate = useNavigate();
  const { brief, plan, change, units, proposeChange, applyChange } = useStore();
  const [extend, setExtend] = useState(2);
  const [add, setAdd] = useState(3);

  const site = siteById(brief.siteId);
  const mapUnits = useMemo<MapUnit[]>(() => {
    if (!change) return [];
    const out: MapUnit[] = [];
    for (const d of change.result.diff) {
      const u = units.find((x) => x.id === d.toUnitId);
      if (!u) continue;
      const name = change.brief.employees.find((e) => e.id === d.employeeId)?.name;
      out.push({ unit: u, state: d.kind === 'kept' ? 'assigned' : d.kind === 'moved' ? 'moved' : 'new', label: name });
    }
    return out;
  }, [change, units]);

  if (!plan) {
    return (
      <Empty title="No approved plan yet">
        <p className="w-full">Changes re-allocate an existing plan.</p>
        <Button onClick={() => ensureDemoPlan()}>Generate demo plan</Button>
      </Empty>
    );
  }

  const r = change?.result;
  const order: DiffKind[] = ['moved', 'new', 'removed', 'kept'];

  return (
    <>
      <PageHeader
        eyebrow="Client · step 3"
        title="Change request → automatic re-allocation"
        subtitle="Projects slip and teams grow. Submit the change; the engine keeps everyone it can in place, moves only those it must, and shows the cost before you approve."
      />

      <Card title="New change request">
        <div className="flex flex-wrap items-end gap-4">
          <Button
            onClick={() => {
              setExtend(2);
              setAdd(3);
              proposeChange(2, 3);
            }}
            data-testid="preset-change"
          >
            Extend 2 months + 3 engineers <AiBadge />
          </Button>
          <span className="text-sm text-stone-400">or</span>
          <label className={labelCls}>
            Extend by (months)
            <input type="number" min={0} max={6} value={extend} onChange={(e) => setExtend(Number(e.target.value))} className={`${inputCls} w-28`} />
          </label>
          <label className={labelCls}>
            Add engineers
            <input type="number" min={0} max={3} value={add} onChange={(e) => setAdd(Number(e.target.value))} className={`${inputCls} w-28`} />
          </label>
          <Button variant="secondary" onClick={() => proposeChange(extend, add)}>
            Re-allocate
          </Button>
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Current plan: {brief.employees.length} people until {formatDate(stayEnd(brief.start, brief.months))}. Each move costs a disruption penalty in the optimiser (€400-equivalent), so the
          engine only moves people when it has to.
        </p>
      </Card>

      {change && r && (
        <div className="mt-6 space-y-6" data-testid="realloc-diff">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Change" value={<span className="text-lg">{change.label}</span>} hint={`New end ${formatDate(stayEnd(change.brief.start, change.brief.months))}`} />
            <Kpi label="People moved" value={r.moved} hint="Units not available for the new dates" ai />
            <Kpi label="New people housed" value={r.diff.filter((d) => d.kind === 'new' && d.toUnitId).length} />
            <Kpi label="Monthly cost delta" value={signedEur(r.monthlyDelta)} hint={`${eur(r.plan.metrics.monthlyRent)} / month`} />
            <Kpi label="Project rent delta" value={signedEur(r.totalDelta)} hint={`${eur(r.plan.metrics.totalRent)} over ${change.brief.months} months`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className={tableWrap}>
              <table className={tableCls}>
                <thead className="bg-stone-50">
                  <tr>
                    <th className={th}>Change</th>
                    <th className={th}>Employee</th>
                    <th className={th}>From → to</th>
                    <th className={th}>Why</th>
                    <th className={`${th} text-right`}>Rent Δ / mo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {[...r.diff]
                    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
                    .map((d) => {
                      const e = change.brief.employees.find((x) => x.id === d.employeeId)!;
                      const from = units.find((u) => u.id === d.fromUnitId);
                      const to = units.find((u) => u.id === d.toUnitId);
                      return (
                        <tr key={d.employeeId} className={d.kind === 'kept' ? 'text-stone-500' : ''}>
                          <td className={td}>
                            <Badge tone={KIND[d.kind].tone}>{KIND[d.kind].label}</Badge>
                          </td>
                          <td className={td}>
                            <div className="font-medium text-stone-900">{e.name}</div>
                            <div className="text-xs text-stone-500">{ROLE_LABEL[e.role]}</div>
                          </td>
                          <td className={td}>
                            {d.kind === 'kept' ? (
                              <span>{to?.title}</span>
                            ) : (
                              <span>
                                {from ? <span className="line-through decoration-stone-400">{from.title}</span> : <span className="text-stone-400">—</span>} → <span className="font-medium text-stone-900">{to?.title ?? 'Unassigned'}</span>
                              </span>
                            )}
                          </td>
                          <td className={`${td} text-xs`}>{d.reason}</td>
                          <td className={`${td} num text-right`}>{d.rentDelta ? signedEur(d.rentDelta) : '—'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <MapView site={site} units={mapUnits} height={420} />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="text-sm text-stone-600">Approving updates the leases (amendments) and next month's invoice.</span>
            <Button
              onClick={() => {
                applyChange();
                navigate('/client/plan');
              }}
            >
              Approve change
            </Button>
          </div>
        </div>
      )}
      {!change && (
        <div className="mt-6">
          <LinkButton to="/client/plan" variant="ghost">
            ← Back to plan
          </LinkButton>
        </div>
      )}
    </>
  );
}
