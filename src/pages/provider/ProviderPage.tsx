import { useMemo, useState } from 'react';
import { verifyUnit } from '../../ai/verify';
import PhotoThumb from '../../components/PhotoThumb';
import { Badge, Card, Kpi, LinkButton, PageHeader, inputCls, tableCls, tableWrap, td, th } from '../../components/ui';
import { PROVIDERS } from '../../data/providers';
import { addMonths, formatDate, stayEnd } from '../../lib/dates';
import { eur, eurCents } from '../../lib/format';
import { landlordCommission, providerPayout } from '../../lib/money';
import { useStore } from '../../store';

const STATUS = { verified: { tone: 'green', label: 'Verified' }, pending: { tone: 'amber', label: 'In verification' }, rejected: { tone: 'red', label: 'Rejected' } } as const;

export default function ProviderPage() {
  const { units, plan, brief } = useStore();
  const [providerId, setProviderId] = useState('P04');
  const provider = PROVIDERS.find((p) => p.id === providerId)!;
  const mine = useMemo(() => units.filter((u) => u.providerId === providerId), [units, providerId]);
  const occupied = new Map((plan?.assignments ?? []).map((a) => [a.unitId, a]));
  const rented = mine.filter((u) => occupied.has(u.id));
  const monthlyRent = rented.reduce((s, u) => s + u.rent, 0);

  return (
    <>
      <PageHeader
        eyebrow="Provider portal"
        title={provider.name}
        subtitle={`${provider.legalName} · CIF ${provider.cif} · ${provider.city}. Professional operators list furnished units once; we fill them with verified corporate tenants and pay out every month.`}
        actions={
          <>
            <label className="text-sm text-stone-600">
              <span className="sr-only">Provider</span>
              <select className={inputCls} value={providerId} onChange={(e) => setProviderId(e.target.value)}>
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <LinkButton to="/provider/onboarding" variant="secondary">
              Onboard a new provider
            </LinkButton>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Listed units" value={mine.length} hint={`${mine.filter((u) => u.status === 'verified').length} verified`} />
        <Kpi label="Occupied by project teams" value={rented.length} hint={plan ? brief.projectName : 'No active plan'} />
        <Kpi label="Monthly payout" value={eurCents(providerPayout(monthlyRent))} hint={`${eur(monthlyRent)} rent − 10% commission`} />
        <Kpi label="Provider status" value={<Badge tone={STATUS[provider.status].tone}>{STATUS[provider.status].label}</Badge>} hint={`Since ${formatDate(provider.joined)}`} />
      </div>

      <h2 className="mb-3 text-base font-semibold text-stone-900">Units</h2>
      <div className={tableWrap}>
        <table className={tableCls}>
          <thead className="bg-stone-50">
            <tr>
              <th className={th}>Unit</th>
              <th className={th}>Photos</th>
              <th className={`${th} text-right`}>Rent</th>
              <th className={th}>Verification</th>
              <th className={`${th} text-right`}>Trust</th>
              <th className={th}>Occupancy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {mine.map((u) => {
              const a = occupied.get(u.id);
              const trust = verifyUnit(u, units).trustScore;
              return (
                <tr key={u.id}>
                  <td className={td}>
                    <div className="font-medium text-stone-900">
                      {u.id} · {u.title}
                    </div>
                    <div className="text-xs text-stone-500">
                      {u.address} · {u.sqm} m²
                    </div>
                  </td>
                  <td className={td}>
                    <div className="flex gap-1">
                      {u.photos.slice(0, 2).map((p) => (
                        <PhotoThumb key={p} hash={p} size={44} />
                      ))}
                    </div>
                  </td>
                  <td className={`${td} num text-right`}>{eur(u.rent)}</td>
                  <td className={td}>
                    <Badge tone={STATUS[u.status].tone}>{STATUS[u.status].label}</Badge>
                  </td>
                  <td className={`${td} num text-right`}>{u.status === 'verified' ? trust : '—'}</td>
                  <td className={td}>
                    {a ? (
                      <span className="text-stone-900">
                        {brief.employees.find((e) => e.id === a.employeeId)?.name}
                        <span className="block text-xs text-stone-500">until {formatDate(stayEnd(brief.start, brief.months))}</span>
                      </span>
                    ) : (
                      <span className="text-stone-500">Available from {formatDate(u.availableFrom)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold text-stone-900">Payouts</h2>
      <Card>
        {rented.length === 0 ? (
          <p className="text-sm text-stone-600">No occupied units yet. Payouts appear once a client approves a plan that uses your units.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-wide text-stone-500 uppercase">
                  <th className="py-2">Payout date</th>
                  <th className="py-2 text-right">Rent collected</th>
                  <th className="py-2 text-right">Commission 10%</th>
                  <th className="py-2 text-right">Paid to you</th>
                </tr>
              </thead>
              <tbody className="num divide-y divide-stone-100">
                {Array.from({ length: brief.months }, (_, i) => {
                  const d = addMonths(brief.start, i).slice(0, 8) + '05';
                  return (
                    <tr key={i}>
                      <td className="py-2">{formatDate(d)}</td>
                      <td className="py-2 text-right">{eurCents(monthlyRent)}</td>
                      <td className="py-2 text-right text-stone-500">−{eurCents(landlordCommission(monthlyRent))}</td>
                      <td className="py-2 text-right font-medium">{eurCents(providerPayout(monthlyRent))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-stone-500">Paid by SEPA from the payment provider's segregated account on the 5th of each month. No chasing tenants, no vacancy between project waves when re-allocated.</p>
      </Card>
    </>
  );
}
