import { useEffect, type ReactNode } from 'react';
import { Explain, tableCls, tableWrap, td, th } from '../../components/ui';
import { companyById } from '../../data/companies';
import { FACTS } from '../../data/facts';
import { PROVIDERS } from '../../data/providers';
import { eur, pct } from '../../lib/format';
import { directCost, moneySplit, operatorPayout } from '../../lib/money';
import { ensureDemoPlan, useStore } from '../../store';

/** Payouts ledger: company → payment provider → operators / Settle In revenue / Flex pool (not revenue). */
export default function LedgerPage() {
  const { brief, plan, units, flex } = useStore();
  useEffect(() => {
    if (!plan) ensureDemoPlan();
  }, [plan]);
  if (!plan) return null;

  const m = plan.metrics;
  const s = moneySplit(m.totalRent, m.apartments, flex);
  const cost = directCost(m.apartmentMonths);
  const company = companyById(brief.companyId);
  const P = FACTS.pricing;

  const byOperator = PROVIDERS.map((p) => {
    const mine = plan.assignments.filter((a) => units.find((u) => u.id === a.unitId)?.providerId === p.id);
    return { p, apartments: mine.length, rent: mine.reduce((x, a) => x + a.rent, 0) };
  }).filter((x) => x.apartments > 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">Ops · Payouts ledger</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Where the money goes</h1>
        <p className="mt-2 text-lg text-stone-600">
          {brief.companyName || company.name} · {m.apartments} apartments · {brief.months} months. Rent never sits on our balance sheet: a licensed payment provider holds it and splits each payment.
        </p>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-6" data-testid="ledger-flow">
        <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr_auto_2fr]">
          <Box title="Company pays" value={eur(s.companyPays)} explain={`Rent + ${pct(s.markup / m.totalRent)} markup${flex ? ` + ${pct(P.flex)} Flex` : ''}. ${FACTS.terms.billing}.`} testId="ledger-company" />
          <Arrow />
          <Box title="Payment provider" value="Holds the funds" explain="A licensed payment institution (PSD2) keeps client money segregated and runs the split payout." />
          <Arrow />
          <div className="grid gap-3 sm:grid-cols-3">
            <Box title="Operators" value={eur(s.operatorPayout)} sub={`Rent − ${pct(P.operatorCommission)}`} explain={`Paid ${FACTS.terms.payout.toLowerCase()}.`} testId="ledger-operators" />
            <Box title="Settle In revenue" value={eur(s.revenue)} sub={`${pct(P.operatorCommission)} + ${pct(s.markup / m.totalRent)}${flex ? ` + ${pct(P.flexRevenue)} Flex` : ''}`} explain={`Operator commission ${eur(s.operatorCommission)} + company markup ${eur(s.markup)}${flex ? ` + our half of Flex ${eur(s.flexRevenue)}` : ''}.`} accent testId="ledger-revenue" />
            <Box title="Flex pool" value={eur(s.flexPool)} sub="Not revenue" explain={`${pct(P.flexPool)} of rent goes to a pool for operators. It passes through us and is never booked as revenue.`} testId="ledger-flexpool" muted />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Revenue" value={eur(s.revenue)} explain="Settle In net revenue for this mission." />
        <Stat label="Direct cost" value={eur(cost)} explain={`About €${FACTS.demo.directCostPerApartmentMonth.toFixed(2)} per apartment-month × ${m.apartmentMonths} apartment-months (support, verification, check-in, e-signature, AI and platform, payments, credit insurance; financial model).`} />
        <Stat label="Contribution" value={eur(s.revenue - cost)} explain="Revenue minus direct cost, before fixed costs." />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Payouts by operator</h2>
        <div className={tableWrap}>
          <table className={tableCls}>
            <thead className="bg-stone-50">
              <tr>
                <th className={th}>Operator</th>
                <th className={`${th} text-right`}>Apartments</th>
                <th className={`${th} text-right`}>Rent / month</th>
                <th className={`${th} text-right`}>Paid at check-in</th>
                <th className={`${th} text-right`}>Then monthly</th>
              </tr>
            </thead>
            <tbody className="num divide-y divide-stone-100">
              {byOperator.map(({ p, apartments, rent }) => (
                <tr key={p.id}>
                  <td className={td}>{p.name}</td>
                  <td className={`${td} text-right`}>{apartments}</td>
                  <td className={`${td} text-right`}>{eur(rent)}</td>
                  <td className={`${td} text-right`}>{eur(operatorPayout(rent))}</td>
                  <td className={`${td} text-right`}>{eur(operatorPayout(rent))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-stone-500">Flex pool is distributed separately to operators and is not included above.</p>
      </section>
    </div>
  );
}

function Box({ title, value, sub, explain, accent, muted, testId }: { title: string; value: string; sub?: string; explain: ReactNode; accent?: boolean; muted?: boolean; testId?: string }) {
  return (
    <div className={`rounded-xl p-4 ${accent ? 'bg-brand-50 ring-1 ring-brand-200' : muted ? 'bg-stone-50 ring-1 ring-stone-200 ring-dashed' : 'bg-white ring-1 ring-stone-200'}`} data-testid={testId}>
      <div className="flex items-center gap-1.5 text-sm text-stone-600">
        {title}
        <Explain>{explain}</Explain>
      </div>
      <div className={`num mt-1 text-xl font-semibold ${accent ? 'text-brand-800' : 'text-ink'}`}>{value}</div>
      {sub && <div className="text-xs text-stone-500">{sub}</div>}
    </div>
  );
}

function Arrow() {
  return (
    <div aria-hidden className="text-center text-2xl text-stone-300 lg:text-3xl">
      <span className="lg:hidden">↓</span>
      <span className="hidden lg:inline">→</span>
    </div>
  );
}

function Stat({ label, value, explain }: { label: string; value: string; explain: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-center gap-1.5 text-sm text-stone-600">
        {label}
        <Explain>{explain}</Explain>
      </div>
      <div className="num mt-1 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}
