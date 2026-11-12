import { Link } from 'react-router-dom';
import { AiBadge, Explain } from '../../components/ui';
import { pct } from '../../lib/format';
import { FACTS } from '../../data/facts';
import { useStore } from '../../store';

const K = FACTS.kpi;

export default function KpiPage() {
  const plan = useStore((s) => s.plan);
  const occupied = plan?.metrics.apartments ?? 0;
  const be = K.breakEvenApartments;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">Ops · KPIs</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Operating targets from the business plan</h1>
        <p className="mt-2 text-lg text-stone-600">What we report to investors every month.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="kpi-strip">
        <Tile label="Brief → plan" value={`≤ ${K.briefToPlanHours} h`} sub="Target, including human review" ai explain="The engine matches in milliseconds; the target covers the Ops review and operator confirmations." />
        <Tile
          label="Ops hours per mission"
          value={`${K.opsHoursPerMission} h`}
          sub={
            <>
              vs {K.opsHoursManual} h done by hand (−{pct(K.opsHoursSaving)})
            </>
          }
          ai
          explain={`Hours of operations work for the reference mission (20 people, 6 months): ${K.opsHoursAtLaunch} h at launch, ${K.opsHoursPerMission} h from month 12, against ${K.opsHoursManual} h when the same housing is organised by hand (financial model).`}
          bar={K.opsHoursPerMission / K.opsHoursManual}
        />
        <Tile label="Apartments per support agent" value={`1 : ${K.apartmentsPerAgent}`} sub="AI first line + one agent" ai explain="Each support agent covers 150 occupied apartments; the AI assistant answers and triages first." />
        <Tile
          label="Occupancy vs break-even"
          value={`${occupied} / ${be}`}
          sub={
            <>
              occupied apartments needed at year-1 economics; reached in year 3 ({K.occupiedApartmentsYear3} occupied vs {K.breakEvenApartmentsYear3} needed)
            </>
          }
          explain={`Apartments occupied in approved missions in this demo, against the ${be} occupied apartments that would cover fixed costs at year-1 economics (Madrid only, most missions at the 0% launch markup). In year 3 the plan has ${K.occupiedApartmentsYear3} apartments occupied on average and needs ${K.breakEvenApartmentsYear3}: the first year with positive EBITDA (financial model).`}
          bar={occupied / be}
        />
      </div>

      <p className="text-sm text-stone-600">
        Risks behind these targets: <Link to="/ops/risks" className="font-medium text-ink underline underline-offset-4">risk register →</Link>
      </p>
    </div>
  );
}

function Tile({ label, value, sub, explain, ai, bar }: { label: string; value: string; sub: React.ReactNode; explain: string; ai?: boolean; bar?: number }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2 text-sm text-stone-600">
        <span className="flex items-center gap-1.5">
          {label}
          <Explain>{explain}</Explain>
        </span>
        {ai && <AiBadge />}
      </div>
      <div className="num mt-2 text-3xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-sm text-stone-600">{sub}</div>
      {bar !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-stone-100" aria-hidden>
          <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${Math.min(100, Math.max(2, bar * 100))}%` }} />
        </div>
      )}
    </div>
  );
}
