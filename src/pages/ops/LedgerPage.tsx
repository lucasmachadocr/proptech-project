import { Button, Card, Empty, Kpi, PageHeader, tableCls, tableWrap, td, th } from '../../components/ui';
import { companyById } from '../../data/companies';
import { PROVIDERS } from '../../data/providers';
import { addMonths } from '../../lib/dates';
import { eur, eurCents, pct } from '../../lib/format';
import { invoiceTotals, landlordCommission, ledgerSummary, providerPayout } from '../../lib/money';
import { ensureDemoPlan, useStore } from '../../store';

export default function LedgerPage() {
  const { brief, plan, units } = useStore();
  if (!plan) {
    return (
      <Empty title="No plan yet">
        <Button onClick={() => ensureDemoPlan()}>Generate demo plan</Button>
      </Empty>
    );
  }

  const company = companyById(brief.companyId);
  const total = ledgerSummary(plan.metrics.totalRent);
  const inv = invoiceTotals(plan.metrics.totalRent);
  const monthly = ledgerSummary(plan.metrics.monthlyRent);
  const byProvider = PROVIDERS.map((p) => {
    const rent = plan.assignments.filter((a) => units.find((u) => u.id === a.unitId)?.providerId === p.id).reduce((s, a) => s + a.rent, 0);
    return { p, rent, units: plan.assignments.filter((a) => units.find((u) => u.id === a.unitId)?.providerId === p.id).length };
  }).filter((x) => x.rent > 0);

  return (
    <>
      <PageHeader
        eyebrow="Operations · payments ledger"
        title="Money we move vs money we make"
        subtitle={`Project ${brief.projectName} for ${company.name}: ${brief.months} months. Rent never touches our balance sheet — the licensed payment provider holds it in a segregated account and splits each payment.`}
      />

      <div className="grid gap-4 lg:grid-cols-2" data-testid="gmv-vs-revenue">
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-stone-500">Invoiced to the client (GMV, excl. VAT)</div>
          <div className="num mt-1 text-4xl font-semibold tracking-tight text-stone-900" data-testid="gmv">
            {eur(total.gmv)}
          </div>
          <div className="mt-1 text-sm text-stone-500">
            {eur(inv.rent)} rent + {eur(inv.fee)} service fee (8%)
          </div>
        </div>
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 shadow-sm">
          <div className="text-sm font-medium text-brand-800">Our net revenue</div>
          <div className="num mt-1 text-4xl font-semibold tracking-tight text-brand-900" data-testid="revenue">
            {eur(total.revenue)}
          </div>
          <div className="mt-1 text-sm text-brand-800">
            {eur(landlordCommission(plan.metrics.totalRent))} landlord commission (10%) + {eur(inv.fee)} company fee (8%) = {pct(total.takeRate)} take rate
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex justify-between text-xs text-stone-500">
          <span>GMV {eur(total.gmv)}</span>
          <span>Revenue = {pct(total.revenue / total.gmv, 1)} of GMV</span>
        </div>
        <div className="flex h-4 overflow-hidden rounded-full bg-stone-100" aria-hidden>
          <div className="bg-stone-400" style={{ width: `${(total.payouts / total.gmv) * 100}%` }} title="Payouts to providers" />
          <div className="bg-brand-600" style={{ width: `${(total.revenue / total.gmv) * 100}%` }} title="Platform revenue" />
        </div>
        <div className="mt-2 flex gap-4 text-xs text-stone-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-stone-400" /> Payouts to providers {eur(total.payouts)}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-600" /> Platform revenue {eur(total.revenue)}
          </span>
        </div>
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold text-stone-900">Monthly flow of funds</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <Flow step="1" title="Client pays" amount={monthly.collected} note="One invoice: rent + 8% fee + VAT on fee" />
        <Flow step="2" title="Held at payment provider" amount={monthly.heldAtProvider} note="Segregated account (PSD2-licensed)" />
        <Flow step="3" title="Payout to providers" amount={monthly.payouts} note="Rent − 10% commission, on the 5th" />
        <Flow step="4" title="Platform revenue" amount={monthly.revenue} note={`+ ${eurCents(monthly.vatToTreasury)} VAT passed to the tax office`} accent />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Ledger by month">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-wide text-stone-500 uppercase">
                  <th className="py-2">Month</th>
                  <th className="py-2 text-right">Collected</th>
                  <th className="py-2 text-right">Paid out</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="num divide-y divide-stone-100">
                {Array.from({ length: brief.months }, (_, i) => (
                  <tr key={i}>
                    <td className="py-2">{new Date(`${addMonths(brief.start, i)}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</td>
                    <td className="py-2 text-right">{eurCents(monthly.collected)}</td>
                    <td className="py-2 text-right">{eurCents(monthly.payouts)}</td>
                    <td className="py-2 text-right font-medium text-brand-800">{eurCents(monthly.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="num border-t border-stone-200 font-semibold">
                <tr>
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">{eurCents(total.collected)}</td>
                  <td className="py-2 text-right">{eurCents(total.payouts)}</td>
                  <td className="py-2 text-right text-brand-800">{eurCents(total.revenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
        <div>
          <div className={tableWrap}>
            <table className={tableCls}>
              <thead className="bg-stone-50">
                <tr>
                  <th className={th}>Provider</th>
                  <th className={`${th} text-right`}>Units</th>
                  <th className={`${th} text-right`}>Rent / mo</th>
                  <th className={`${th} text-right`}>Payout / mo</th>
                </tr>
              </thead>
              <tbody className="num divide-y divide-stone-100">
                {byProvider.map(({ p, rent, units: n }) => (
                  <tr key={p.id}>
                    <td className={td}>{p.name}</td>
                    <td className={`${td} text-right`}>{n}</td>
                    <td className={`${td} text-right`}>{eur(rent)}</td>
                    <td className={`${td} text-right`}>{eurCents(providerPayout(rent))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Kpi label="Payout accuracy" value="100%" hint="automatic reconciliation (demo)" />
            <Kpi label="DSO target" value="< 35 days" hint="credit policy by client tier" />
          </div>
        </div>
      </div>
    </>
  );
}

function Flow({ step, title, amount, note, accent }: { step: string; title: string; amount: number; note: string; accent?: boolean }) {
  return (
    <div className={`relative rounded-xl border p-4 shadow-sm ${accent ? 'border-brand-200 bg-brand-50' : 'border-stone-200 bg-white'}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-stone-900 text-[11px] text-white">{step}</span>
        {title}
      </div>
      <div className={`num mt-2 text-xl font-semibold ${accent ? 'text-brand-900' : 'text-stone-900'}`}>{eurCents(amount)}</div>
      <div className="mt-1 text-xs text-stone-500">{note}</div>
    </div>
  );
}
