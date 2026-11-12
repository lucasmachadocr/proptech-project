import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView, { type MapUnit } from '../../components/MapView';
import { AiBadge, Badge, Kpi, LinkButton, inputCls, labelCls } from '../../components/ui';
import { briefSite } from '../../data/sites';
import { UNIT_TYPE_SHORT } from '../../data/units';
import { startStep } from '../../demo/steps';
import { formatDate, stayEnd } from '../../lib/dates';
import { eur, pct, signedEur } from '../../lib/format';
import { markupRate, missionPricePerApartmentMonth, replanCost, tierLabel } from '../../lib/money';
import { FACTS } from '../../data/facts';
import { useStore } from '../../store';

export default function ChangePage() {
  const navigate = useNavigate();
  const { brief, plan, approvedAt, change, units, proposeChange, applyChange, flex, demoStep } = useStore();
  const R = FACTS.replan;
  const [add, setAdd] = useState<number>(-R.people);
  const [fromMonth, setFromMonth] = useState<number>(R.fromMonth);
  const site = briefSite(brief);

  const mapUnits = useMemo<MapUnit[]>(() => {
    if (!change) return [];
    return change.result.diff
      .filter((d) => d.toUnitId)
      .map((d) => {
        const e = change.brief.employees.find((x) => x.id === d.employeeId);
        return {
          unit: units.find((x) => x.id === d.toUnitId)!,
          // released flats are shown in grey, without a commute line
          state: e?.end ? 'free' : d.kind === 'kept' ? 'assigned' : d.kind === 'moved' ? 'moved' : 'new',
          label: e?.end ? `${e.name} · released` : e?.name,
        } as MapUnit;
      });
  }, [change, units]);

  if (!plan || !approvedAt) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
        <h1 className="text-xl font-semibold text-ink">Approve a plan first</h1>
        <p className="mt-2 text-stone-600">Changes re-plan an approved mission: longer dates, more or fewer people.</p>
        <div className="mt-6">
          <LinkButton to="/client/plan">Go to the plan</LinkButton>
        </div>
      </div>
    );
  }

  const r = change?.result;
  const changed = r?.diff.filter((d) => d.kind !== 'kept') ?? [];
  const kept = r?.diff.filter((d) => d.kind === 'kept').length ?? 0;
  const price = missionPricePerApartmentMonth(plan.metrics.totalRent, plan.metrics.apartments, plan.metrics.apartmentMonths, flex);
  const newPeople = changed.filter((d) => d.kind === 'new' && d.toUnitId).length;
  const joinMonths = change ? brief.months - change.fromMonth + 1 + change.extendMonths : 0;
  // Team shrinks: people leave at the start of `fromMonth`; their flats are released (with Flex: 30 days' notice).
  const released = change && change.addEngineers < 0 ? change.brief.employees.filter((e) => e.end && !brief.employees.find((x) => x.id === e.id)?.end) : [];
  const shrink = released.length > 0;
  const cost = !change ? 0 : shrink ? -replanCost(price, released.length, joinMonths) : replanCost(price, newPeople, joinMonths) + replanCost(price, plan.metrics.apartments, change.extendMonths);
  const costWithoutFlex = shrink ? -replanCost(price, released.length, Math.max(0, joinMonths - R.noticeMonthsWithoutFlex)) : 0;
  const after = shrink ? plan.metrics.apartments - released.length : (r?.plan.metrics.apartments ?? 0);
  const team = brief.employees.length;
  const canShrink = team > R.people + 1;
  const next = () => navigate(demoStep ? startStep(5) : '/client/invoice');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">Step 4 · Re-plan</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">The project changed? The plan follows.</h1>
        <p className="mt-2 text-lg text-stone-600">Current mission: {team} engineers until {formatDate(stayEnd(brief.start, brief.months))}.{canShrink ? ` From month ${R.fromMonth}, the team drops to ${team - R.people}.` : ''}</p>
      </div>

      {!change ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          {canShrink && (
            <button type="button" onClick={() => proposeChange(-R.people, R.fromMonth)} className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-6 py-3.5 text-lg font-semibold text-white hover:bg-brand-800" data-testid="preset-change">
              Team drops to {team - R.people} from month {R.fromMonth} <AiBadge />
            </button>
          )}
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-medium text-stone-600">Try another change</summary>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <label className={labelCls}>
                People joining (+) or leaving (−)
                <input type="number" min={-(team - 1)} max={3} value={add} onChange={(e) => setAdd(Number(e.target.value) || 0)} className={`${inputCls} w-28`} data-testid="change-people" />
              </label>
              <label className={labelCls}>
                From month
                <input type="number" min={1} max={brief.months} value={fromMonth} onChange={(e) => setFromMonth(Number(e.target.value))} className={`${inputCls} w-28`} />
              </label>
              <button type="button" disabled={add === 0} onClick={() => proposeChange(add, fromMonth)} className="rounded-full px-5 py-2.5 font-medium ring-1 ring-stone-300 hover:ring-ink disabled:opacity-40">
                Re-plan
              </button>
            </div>
          </details>
        </div>
      ) : (
        <div className="space-y-6" data-testid="realloc-diff">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi label="People who move" value={r!.moved} hint={shrink ? `${kept - released.length} people keep their flat` : `${kept} people stay where they are`} ai explain="Someone moves only if their apartment is not free for the new dates. Here nobody does: the mission keeps its dates." testId="kpi-moved" />
            <Kpi
              label="Apartments after the change"
              value={after}
              hint={`Still ${pct(markupRate(after))} markup (${tierLabel(after)})`}
              explain="The markup tier depends on the number of apartments in the mission: 5% for 1–9, 4% for 10–24, 3% for 25+."
            />
            {shrink ? (
              <Kpi
                label="Saving before you approve"
                value={signedEur(cost)}
                hint={`${released.length} × ${eur(price)} × ${joinMonths} months · with Flex`}
                explain={`With Flex, each flat is released with 30 days' notice, so the company stops paying from month ${change.fromMonth}. Without Flex, each early release costs ${R.noticeMonthsWithoutFlex} months of notice: ${signedEur(costWithoutFlex)} only.`}
                testId="kpi-replan-cost"
              />
            ) : (
              <Kpi
                label="Cost before you approve"
                value={signedEur(cost)}
                hint={`${newPeople} × ${eur(price)} × ${joinMonths} months`}
                explain={`New people are priced at the mission's average apartment-month (${eur(price)}: rent + markup${flex ? ' + Flex' : ''}), for the months they stay.`}
                testId="kpi-replan-cost"
              />
            )}
          </div>

          {shrink && (
            <p className="text-sm text-stone-600" data-testid="without-flex">
              Without Flex, the same change would save only {eur(-costWithoutFlex)}: {R.noticeMonthsWithoutFlex} months of notice per flat.
            </p>
          )}
          <ul className="grid gap-3 md:grid-cols-2" aria-label="What changes">
            {released.map((e) => {
              const a = plan.assignments.find((x) => x.employeeId === e.id);
              const u = units.find((x) => x.id === a?.unitId);
              return (
                <li key={e.id} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4">
                  <Badge tone="amber">Released</Badge>
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{e.name}</div>
                    <div className="text-sm text-stone-600">{u ? `${UNIT_TYPE_SHORT[u.type]} in ${u.zone}` : ''}</div>
                    <div className="text-xs text-stone-500">Leaves at the start of month {change.fromMonth}; flat released with 30 days&apos; notice (Flex)</div>
                  </div>
                </li>
              );
            })}
            {changed.map((d) => {
              const e = change.brief.employees.find((x) => x.id === d.employeeId)!;
              const from = units.find((u) => u.id === d.fromUnitId);
              const to = units.find((u) => u.id === d.toUnitId);
              return (
                <li key={d.employeeId} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4">
                  <Badge tone={d.kind === 'moved' ? 'blue' : 'accent'}>{d.kind === 'moved' ? 'Moves' : 'New'}</Badge>
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{e.name}</div>
                    <div className="text-sm text-stone-600">
                      {from ? `${from.zone} → ` : ''}
                      {to ? `${UNIT_TYPE_SHORT[to.type]} in ${to.zone}` : 'No apartment found'}
                    </div>
                    <div className="text-xs text-stone-500">{d.reason}</div>
                  </div>
                </li>
              );
            })}
          </ul>

          <MapView site={site} units={mapUnits} height={380} />

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={() => applyChange()} className="rounded-full px-5 py-2.5 font-medium ring-1 ring-stone-300 hover:ring-ink">
              Approve the change
            </button>
            <button type="button" onClick={next} className="rounded-full bg-brand-700 px-6 py-3 font-semibold text-white hover:bg-brand-800" data-testid="change-next">
              Next: the invoice →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
