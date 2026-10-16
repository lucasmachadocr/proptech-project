import { useState } from 'react';
import { APP_NAME } from '../../config';
import { Button, Card, Empty, Kpi, PageHeader, inputCls, labelCls } from '../../components/ui';
import { COMPANIES } from '../../data/companies';
import { PROVIDERS } from '../../data/providers';
import { addMonths, formatDate, stayEnd } from '../../lib/dates';
import { eur, eurCents } from '../../lib/format';
import { invoiceTotals } from '../../lib/money';
import { ensureDemoPlan, useStore } from '../../store';

export default function InvoicePage() {
  const { brief, plan, units } = useStore();
  const [month, setMonth] = useState(0);

  if (!plan) {
    return (
      <Empty title="No plan yet">
        <Button onClick={() => ensureDemoPlan()}>Generate demo plan</Button>
      </Empty>
    );
  }

  const company = COMPANIES.find((c) => c.id === brief.companyId)!;
  const periodStart = addMonths(brief.start, month);
  const monthly = invoiceTotals(plan.metrics.monthlyRent);
  const project = invoiceTotals(plan.metrics.totalRent);
  const label = new Date(`${periodStart}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const number = `SI-${periodStart.slice(0, 7).replace('-', '')}-${brief.id.slice(-3)}`;

  return (
    <>
      <PageHeader
        eyebrow="Client · step 4"
        title="One invoice per project, every month"
        subtitle="Instead of fifteen landlords and fifteen invoices, the client receives one consolidated invoice. Rent is collected by a licensed payment provider and paid out to each landlord."
        actions={
          <label className={labelCls}>
            <span className="sr-only">Billing month</span>
            <select className={inputCls} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: brief.months }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(`${addMonths(brief.start, i)}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="This month" value={eurCents(monthly.total)} hint="incl. VAT on the fee" />
        <Kpi label="Project rent" value={eur(project.rent)} hint={`${brief.months} months`} />
        <Kpi label="Project invoiced (excl. VAT)" value={eur(project.invoicedExclVat)} hint="rent + 8% fee" />
        <Kpi label="Landlords paid through us" value={new Set(plan.assignments.map((a) => units.find((u) => u.id === a.unitId)?.providerId)).size} hint="one payment run per month" />
      </div>

      <Card className="mx-auto max-w-4xl" title={`Invoice ${number}`} actions={<Button variant="secondary" size="sm" onClick={() => window.print()}>Print</Button>}>
        <div className="grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Billed to</div>
            <div className="mt-1 font-medium text-stone-900">{company.legalName}</div>
            <div className="text-stone-600">CIF {company.cif}</div>
            <div className="text-stone-600">{company.contact}</div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs font-semibold tracking-wide text-stone-500 uppercase">From</div>
            <div className="mt-1 font-medium text-stone-900">{APP_NAME} S.L. (demo)</div>
            <div className="text-stone-600">Project: {brief.projectName}</div>
            <div className="text-stone-600">
              Period: {formatDate(periodStart)} – {formatDate(stayEnd(periodStart, 1))} · {label}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs font-semibold tracking-wide text-stone-500 uppercase">
                <th className="py-2 pr-3">Unit</th>
                <th className="py-2 pr-3">Occupant</th>
                <th className="py-2 pr-3">Landlord</th>
                <th className="py-2 text-right">Rent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {plan.assignments.map((a) => {
                const u = units.find((x) => x.id === a.unitId)!;
                return (
                  <tr key={a.unitId}>
                    <td className="py-2 pr-3">
                      {u.id} · {u.title}
                    </td>
                    <td className="py-2 pr-3 text-stone-600">{brief.employees.find((e) => e.id === a.employeeId)?.name}</td>
                    <td className="py-2 pr-3 text-stone-600">{PROVIDERS.find((p) => p.id === u.providerId)?.name}</td>
                    <td className="num py-2 text-right">{eurCents(a.rent)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <dl className="num mt-4 ml-auto max-w-sm space-y-1.5 border-t border-stone-200 pt-4 text-sm" data-testid="invoice-totals">
          <Row label={`Rent (${plan.assignments.length} units) · VAT-exempt`} value={eurCents(monthly.rent)} />
          <Row label="Service fee 8%" value={eurCents(monthly.fee)} />
          <Row label="VAT 21% on the fee" value={eurCents(monthly.vatOnFee)} />
          <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold text-stone-900">
            <dt>Total due</dt>
            <dd>{eurCents(monthly.total)}</dd>
          </div>
        </dl>
        <p className="mt-6 text-xs text-stone-500">
          Residential rent is exempt from VAT (art. 20.1.23 Spanish VAT Act); VAT applies to our service fee only. Payment by SEPA transfer to the segregated account of our licensed payment
          provider within 30 days. Landlords are paid rent minus a 10% commission on the 5th of each month.
        </p>
      </Card>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-stone-700">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
