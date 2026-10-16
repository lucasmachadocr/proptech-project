import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { llm } from '../../ai/llm';
import MapView, { type MapUnit } from '../../components/MapView';
import { AiBadge, Badge, Button, Card, Empty, Kpi, LinkButton, PageHeader, tableCls, tableWrap, td, th } from '../../components/ui';
import { ROLE_LABEL } from '../../data/brief';
import { COMPANIES } from '../../data/companies';
import { PROVIDERS } from '../../data/providers';
import { siteById } from '../../data/sites';
import { formatDate, stayEnd } from '../../lib/dates';
import { eur, pct } from '../../lib/format';
import { ensureDemoPlan, useStore } from '../../store';
import type { Role, Tradeoff } from '../../types';

const KIND_TONE: Record<Tradeoff['kind'], 'accent' | 'amber' | 'neutral' | 'red' | 'blue'> = {
  cost: 'accent',
  commute: 'amber',
  rule: 'blue',
  excluded: 'red',
  move: 'amber',
  info: 'neutral',
};
const KIND_LABEL: Record<Tradeoff['kind'], string> = { cost: 'Cost', commute: 'Commute', rule: 'Rule', excluded: 'Excluded', move: 'Move', info: 'Method' };

export default function PlanPage() {
  const navigate = useNavigate();
  const { brief, plan, units, approvedAt, approvePlan } = useStore();
  const [summary, setSummary] = useState('');
  const site = siteById(brief.siteId);

  const mapUnits = useMemo<MapUnit[]>(() => {
    if (!plan) return [];
    const assigned = new Map(plan.assignments.map((a) => [a.unitId, a.employeeId]));
    return units
      .filter((u) => u.status === 'verified' && (assigned.has(u.id) || u.town === 'Zaragoza' || ['Villanueva de Gállego', 'Zuera', 'San Juan de Mozarrifar', 'Utebo', 'Casetas', 'La Cartuja Baja'].includes(u.zone)))
      .map((u) => ({ unit: u, state: assigned.has(u.id) ? 'assigned' : 'free', label: assigned.has(u.id) ? brief.employees.find((e) => e.id === assigned.get(u.id))?.name : undefined }));
  }, [plan, units, brief]);

  useEffect(() => {
    if (plan) llm.explainPlan(plan, brief).then(setSummary);
  }, [plan, brief]);

  if (!plan) {
    return (
      <Empty title="No plan yet">
        <p className="w-full">Submit a brief, or load the demo team to see the engine at work.</p>
        <LinkButton to="/client/brief" variant="secondary">
          Go to brief
        </LinkButton>
        <Button
          onClick={() => {
            ensureDemoPlan();
          }}
        >
          Generate demo plan
        </Button>
      </Empty>
    );
  }

  const m = plan.metrics;
  const company = COMPANIES.find((c) => c.id === brief.companyId)!;

  return (
    <>
      <PageHeader
        eyebrow={`Client · ${company.name}`}
        title={brief.projectName}
        subtitle={
          <>
            {brief.employees.length} people · {formatDate(brief.start)} → {formatDate(stayEnd(brief.start, brief.months))} ({brief.months} months) · site: {site.operator}, {site.town}
          </>
        }
        actions={
          approvedAt ? (
            <>
              <Badge tone="green">✓ Approved {new Date(approvedAt).toLocaleDateString('en-GB')}</Badge>
              <LinkButton to="/client/change" variant="secondary">
                Request a change
              </LinkButton>
              <LinkButton to="/client/invoice">View invoice</LinkButton>
            </>
          ) : (
            <>
              <LinkButton to="/client/brief" variant="secondary">
                Edit brief
              </LinkButton>
              <Button onClick={approvePlan} data-testid="approve-plan">
                Approve plan
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="plan-kpis">
        <Kpi label="Monthly rent" value={eur(m.monthlyRent)} hint={`${eur(m.totalRent)} over ${brief.months} months`} />
        <Kpi label="Average commute" value={`${m.avgCommuteMin} min`} hint={`Max ${m.maxCommuteMin} min · cap ${brief.maxCommuteMin} min (estimate)`} />
        <Kpi label="Saving vs hotel" value={eur(m.savingVsHotelMonthly)} hint={`${pct(m.savingVsHotelPct)} per month vs €74/night, incl. our 8% fee`} />
        <Kpi label="Plan computed in" value={<span data-testid="computed-ms">{plan.computedMs < 1000 ? `${plan.computedMs} ms` : `${(plan.computedMs / 1000).toFixed(2)} s`}</span>} hint={`${plan.candidatesConsidered.toLocaleString('en-GB')} person × unit pairs evaluated`} ai />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <MapView site={site} units={mapUnits} height={460} />
        <Card
          title={
            <span className="flex items-center gap-2">
              Why this plan <AiBadge />
            </span>
          }
        >
          {summary && <p className="mb-4 text-sm leading-relaxed text-stone-700">{summary}</p>}
          <ul className="space-y-3" data-testid="tradeoffs">
            {plan.tradeoffs.map((t, i) => (
              <li key={i} className="flex gap-3 text-sm leading-snug text-stone-700">
                <Badge tone={KIND_TONE[t.kind]} className="mt-0.5 h-fit">
                  {KIND_LABEL[t.kind]}
                </Badge>
                <span>{t.text}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">Budget use by role</h3>
          <div className="space-y-2">
            {(Object.keys(m.budgetUse) as Role[])
              .filter((r) => m.budgetUse[r].count > 0)
              .map((r) => {
                const b = m.budgetUse[r];
                const p = b.used / b.cap;
                return (
                  <div key={r} className="text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>
                        {ROLE_LABEL[r]} ×{b.count}
                      </span>
                      <span className="num">
                        {eur(b.used)} / {eur(b.cap)} ({pct(p)})
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-stone-100">
                      <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${Math.min(100, p * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>

      {plan.unassigned.length > 0 && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>{plan.unassigned.length} not housed:</strong>{' '}
          {plan.unassigned.map((u) => `${brief.employees.find((e) => e.id === u.employeeId)?.name} — ${u.reason}`).join(' · ')}
        </div>
      )}

      <h2 className="mt-8 mb-3 text-base font-semibold text-stone-900">Allocation per employee</h2>
      <div className={tableWrap}>
        <table className={tableCls} data-testid="plan-table">
          <thead className="bg-stone-50">
            <tr>
              <th className={th}>Employee</th>
              <th className={th}>Role</th>
              <th className={th}>Home</th>
              <th className={th}>Provider</th>
              <th className={`${th} text-right`}>Rent / mo</th>
              <th className={`${th} text-right`}>vs cap</th>
              <th className={`${th} text-right`}>Commute</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {brief.employees.map((e) => {
              const a = plan.assignments.find((x) => x.employeeId === e.id);
              const u = a && units.find((x) => x.id === a.unitId);
              const prov = u && PROVIDERS.find((p) => p.id === u.providerId);
              return (
                <tr key={e.id} className="hover:bg-stone-50/60">
                  <td className={td}>
                    <div className="font-medium text-stone-900">{e.name}</div>
                    <div className="text-xs text-stone-500">{e.title}</div>
                  </td>
                  <td className={td}>{ROLE_LABEL[e.role]}</td>
                  <td className={td}>
                    {u ? (
                      <>
                        <div className="text-stone-900">{u.title}</div>
                        <div className="text-xs text-stone-500">
                          {u.id} · {u.sqm} m²
                        </div>
                      </>
                    ) : (
                      <Badge tone="red">Unassigned</Badge>
                    )}
                  </td>
                  <td className={`${td} text-stone-600`}>{prov?.name}</td>
                  <td className={`${td} num text-right font-medium`}>{a ? eur(a.rent) : '—'}</td>
                  <td className={`${td} num text-right text-stone-500`}>{a ? pct(a.rent / brief.budgetCaps[e.role]) : '—'}</td>
                  <td className={`${td} num text-right`}>{a ? `${Math.round(a.commuteMin)} min` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-stone-200 bg-stone-50 font-semibold">
            <tr>
              <td className={td} colSpan={4}>
                Total · {plan.assignments.length} households
              </td>
              <td className={`${td} num text-right`}>{eur(m.monthlyRent)}</td>
              <td className={td} />
              <td className={`${td} num text-right`}>{m.avgCommuteMin} min avg</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {!approvedAt && (
        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => {
              approvePlan();
              navigate('/client/change');
            }}
            variant="secondary"
          >
            Approve and continue to changes →
          </Button>
        </div>
      )}
    </>
  );
}
