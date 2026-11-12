import { useEffect } from 'react';
import { AiBadge, Explain, LinkButton } from '../../components/ui';
import { companyById } from '../../data/companies';
import { FACTS } from '../../data/facts';
import { eur, pct } from '../../lib/format';
import { moneySplit } from '../../lib/money';
import { ensureDemoPlan, useStore } from '../../store';

const K = FACTS.kpi;

/** Step 6: what the mission meant for the company and for Settle In, in three numbers. */
export default function SummaryPage() {
  const { brief, plan, flex } = useStore();
  useEffect(() => {
    if (!plan) ensureDemoPlan();
  }, [plan]);
  if (!plan) return null;

  const m = plan.metrics;
  const s = moneySplit(m.totalRent, m.apartments, flex);
  const company = companyById(brief.companyId);

  return (
    <div className="mx-auto max-w-4xl space-y-8" data-testid="mission-summary">
      <div>
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">Step 6 · Mission summary</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          {m.apartments} engineers housed for {brief.months} months
        </h1>
        <p className="mt-2 text-lg text-stone-600">
          {company.name} · {brief.projectName}. One brief, one plan, one invoice.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile
          label="Settle In revenue"
          value={eur(s.revenue)}
          sub={`on ${eur(s.companyPays)} paid by the company`}
          explain={`Operator commission ${pct(FACTS.pricing.operatorCommission)} + company markup ${pct(s.markup / m.totalRent)}${flex ? ` + our ${pct(FACTS.pricing.flexRevenue)} of Flex` : ''}. Rent passes through to the operators.`}
          testId="summary-revenue"
        />
        <Tile
          label="Ops hours for the mission"
          value={`${K.opsHoursPerMission} h`}
          sub={`vs ${K.opsHoursManual} h done by hand (−${pct(K.opsHoursSaving)})`}
          explain="Operations work for this mission with Settle In, against organising the same housing manually (financial model)."
          ai
          testId="summary-ops"
        />
        <Tile
          label="Invoices for the company"
          value="1"
          sub={`instead of ${m.apartments} landlords and ${m.apartments} contracts`}
          explain={`One monthly invoice, ${FACTS.terms.billing}.`}
          testId="summary-invoices"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <LinkButton to="/ops/ledger">See where the money goes</LinkButton>
        <LinkButton to="/share" variant="secondary">
          Try it on your phone
        </LinkButton>
      </div>
    </div>
  );
}

function Tile({ label, value, sub, explain, ai, testId }: { label: string; value: string; sub: string; explain: string; ai?: boolean; testId: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6" data-testid={testId}>
      <div className="flex items-center justify-between gap-2 text-sm text-stone-600">
        <span className="flex items-center gap-1.5">
          {label}
          <Explain>{explain}</Explain>
        </span>
        {ai && <AiBadge />}
      </div>
      <div className="num mt-2 text-4xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-sm text-stone-600">{sub}</div>
    </div>
  );
}
