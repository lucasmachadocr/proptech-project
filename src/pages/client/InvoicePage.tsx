import { useState, type ReactNode } from 'react';
import { APP_NAME } from '../../config';
import { Explain, LinkButton, ToConfirm, cx } from '../../components/ui';
import { companyById } from '../../data/companies';
import { FACTS } from '../../data/facts';
import { addMonths, formatDate, stayEnd } from '../../lib/dates';
import { eur, pct } from '../../lib/format';
import { companyInvoice, tierLabel } from '../../lib/money';
import { useStore } from '../../store';

export default function InvoicePage() {
  const { brief, plan, approvedAt, flex } = useStore();
  const [view, setView] = useState<'mission' | 'month'>('mission');

  if (!plan || !approvedAt) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
        <h1 className="text-xl font-semibold text-ink">No invoice yet</h1>
        <p className="mt-2 text-stone-600">The first invoice is issued once the plan is approved.</p>
        <div className="mt-6">
          <LinkButton to="/client/plan">Go to the plan</LinkButton>
        </div>
      </div>
    );
  }

  const company = companyById(brief.companyId);
  const m = plan.metrics;
  const rent = view === 'mission' ? m.totalRent : m.monthlyRent;
  const inv = companyInvoice(rent, m.apartments, flex);
  const period = view === 'mission' ? `${formatDate(brief.start)} – ${formatDate(stayEnd(brief.start, brief.months))}` : `${formatDate(brief.start)} – ${formatDate(stayEnd(addMonths(brief.start, 0), 1))}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">Step 5 · Invoice</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">One invoice for the whole team</h1>
        <p className="mt-2 text-lg text-stone-600">
          {m.apartments} apartments, {brief.months} months, one line per cost — not {m.apartments} landlords and {m.apartments} invoices.
        </p>
      </div>

      <div role="tablist" aria-label="Invoice period" className="inline-flex rounded-full bg-white p-1 ring-1 ring-stone-200">
        {(['mission', 'month'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cx('rounded-full px-4 py-1.5 text-sm font-medium', view === v ? 'bg-ink text-white' : 'text-stone-600')}>
            {v === 'mission' ? 'Whole mission' : 'One month'}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8" data-testid="invoice">
        <div className="flex flex-wrap justify-between gap-4 text-sm">
          <div>
            <div className="text-stone-500">Billed to</div>
            <div className="font-semibold text-ink">{company.legalName}</div>
          </div>
          <div className="sm:text-right">
            <div className="text-stone-500">From {APP_NAME} · {period}</div>
            <div className="font-semibold text-ink">{brief.projectName}</div>
          </div>
        </div>

        <dl className="num mt-8 space-y-4 text-base" data-testid="invoice-totals">
          <Line label={`Rent · ${m.apartments} apartments × ${view === 'mission' ? `${brief.months} months` : '1 month'}`} value={eur(inv.rent)} explain="The monthly rents agreed with each operator, passed through at cost." />
          <Line
            label={`Settle In markup · ${pct(inv.markupRate)}`}
            value={eur(inv.markup)}
            explain={`Our fee to the company: ${pct(inv.markupRate)} of rent for missions of ${tierLabel(m.apartments)} (5% for 1–9, 4% for 10–24, 3% for 25+).`}
            testId="line-markup"
          />
          {flex && (
            <Line
              label={`Flex · ${pct(FACTS.pricing.flex)}`}
              value={eur(inv.flex)}
              explain={`Optional add-on, ${pct(FACTS.pricing.flex)} of rent: ${pct(FACTS.pricing.flexRevenue)} is Settle In revenue and ${pct(FACTS.pricing.flexPool)} goes to an operator pool.`}
              testId="line-flex"
            />
          )}
          <div className="flex items-baseline justify-between border-t border-stone-200 pt-4 text-xl font-semibold text-ink">
            <dt>Total</dt>
            <dd data-testid="invoice-total">{eur(inv.total)}</dd>
          </div>
        </dl>

        <ul className="mt-8 space-y-1 text-sm text-stone-600">
          <li>• Payment: {FACTS.terms.billing}.</li>
          <li>• Operators are paid {FACTS.terms.payout.toLowerCase()}.</li>
          <li>
            • VAT not shown on demo totals <ToConfirm />
          </li>
        </ul>
      </section>

      <p className="text-sm text-stone-600">
        Where does this money go? <a href="#/ops/ledger" className="font-medium text-ink underline underline-offset-4">See the payouts ledger in the Ops console →</a>
      </p>
    </div>
  );
}

function Line({ label, value, explain, testId }: { label: string; value: string; explain: ReactNode; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4" data-testid={testId}>
      <dt className="flex items-center gap-2 text-stone-700">
        {label}
        <Explain>{explain}</Explain>
      </dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
