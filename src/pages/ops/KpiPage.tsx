import { AiBadge, Badge, Card, PageHeader } from '../../components/ui';
import { useStore } from '../../store';

interface KpiDef {
  name: string;
  why: string;
  target: string;
  actual: string;
  progress: number; // 0..1 share of target achieved (1 = on target)
  ok: boolean;
  ai?: boolean;
}

export default function KpiPage() {
  const { plan, incidents } = useStore();
  const urgentLive = incidents.length;
  // Illustrative pilot figures; incidents include those reported in this demo session.
  const slaTotal = 26 + urgentLive;
  const slaMet = 25 + urgentLive;
  const kpis: KpiDef[] = [
    { name: 'Time from brief to approved plan', why: 'Proves the AI advantage over manual search', target: '< 48 h', actual: plan ? `${plan.computedMs} ms engine + 6 h review` : '6 h (pilot avg)', progress: 1, ok: true, ai: true },
    { name: 'Unit verification time', why: 'Speed of supply growth', target: '< 3 days / unit', actual: '1.8 days', progress: 1, ok: true, ai: true },
    { name: 'Occupied units per operations FTE', why: 'Scalability of the team', target: '≥ 150', actual: '150 (15 units · 0.1 FTE)', progress: 1, ok: true },
    { name: 'Incidents solved within SLA', why: 'Service quality for occupants', target: '≥ 95%', actual: `${((slaMet / slaTotal) * 100).toFixed(1)}% (${slaMet}/${slaTotal})`, progress: Math.min(1, slaMet / slaTotal / 0.95), ok: slaMet / slaTotal >= 0.95, ai: true },
    { name: 'Days sales outstanding (DSO)', why: 'Cash and credit risk', target: '< 35 days', actual: '31 days', progress: 1, ok: true },
    { name: 'Payout accuracy', why: 'Provider trust', target: '≥ 99.5%', actual: '99.8%', progress: 1, ok: true },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Operations · KPI dashboard"
        title="Operating KPIs reported to investors"
        subtitle="Year-1 targets from the operations plan (Section 5.8). Actuals shown are illustrative pilot figures for the demo."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.name}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-stone-900">{k.name}</h2>
              <div className="flex shrink-0 gap-1">
                {k.ai && <AiBadge />}
                <Badge tone={k.ok ? 'green' : 'amber'}>{k.ok ? 'On target' : 'Watch'}</Badge>
              </div>
            </div>
            <p className="mt-1 text-xs text-stone-500">{k.why}</p>
            <div className="num mt-4 text-2xl font-semibold tracking-tight text-stone-900">{k.actual}</div>
            <div className="mt-1 text-xs text-stone-500">Target {k.target}</div>
            <div className="mt-3 h-1.5 rounded-full bg-stone-100" aria-hidden>
              <div className={`h-1.5 rounded-full ${k.ok ? 'bg-teal-600' : 'bg-amber-500'}`} style={{ width: `${k.progress * 100}%` }} />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
