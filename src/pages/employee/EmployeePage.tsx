import { useEffect, useState, type ReactNode } from 'react';
import { llm } from '../../ai/llm';
import { haversineKm } from '../../ai/geo';
import type { Triage } from '../../ai/triage';
import PhotoThumb from '../../components/PhotoThumb';
import { AiBadge, Badge, Button, Empty, PageHeader, cx, inputCls } from '../../components/ui';
import { companyById } from '../../data/companies';
import { providerById } from '../../data/providers';
import { siteById } from '../../data/sites';
import { formatDate, stayEnd } from '../../lib/dates';
import { ensureDemoPlan, useStore } from '../../store';

type Tab = 'home' | 'checkin' | 'commute' | 'issue';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: 'M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { key: 'checkin', label: 'Check-in', icon: 'M9 12l2 2 4-4M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z' },
  { key: 'commute', label: 'Commute', icon: 'M5 17h14M7 17l1.5-6h7L17 17M8 21v-2M16 21v-2M9 7h6' },
  { key: 'issue', label: 'Report', icon: 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' },
];
const EXAMPLES = ['There is a smell of gas in the kitchen', 'The washing machine does not spin', 'The bathroom tap is dripping'];
const CHECKIN = ['Upload ID (deleted after check)', 'Accept house rules', 'Book key handover slot', 'Inventory photos at arrival', 'Wi-Fi and bin-day info'];

export default function EmployeePage() {
  const { brief, plan, units, incidents, addIncident } = useStore();
  const [employeeId, setEmployeeId] = useState('E07');
  const [tab, setTab] = useState<Tab>('home');
  const [text, setText] = useState('');
  const [triage, setTriage] = useState<Triage | null>(null);
  const [done, setDone] = useState<boolean[]>([true, true, false, false, false]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!plan) {
    return (
      <Empty title="No housing plan yet">
        <Button onClick={() => ensureDemoPlan()}>Generate demo plan</Button>
      </Empty>
    );
  }

  const emp = brief.employees.find((e) => e.id === employeeId) ?? brief.employees[0];
  const a = plan.assignments.find((x) => x.employeeId === emp.id);
  const unit = a && units.find((u) => u.id === a.unitId);
  const site = siteById(brief.siteId);
  const company = companyById(brief.companyId);
  const last = incidents.find((i) => i.employeeId === emp.id);

  const submit = async () => {
    if (!text.trim()) return;
    const t = await llm.triageIssue(text);
    setTriage(t);
    addIncident({ id: `INC-${Date.now().toString().slice(-5)}`, employeeId: emp.id, text, triage: t, createdAt: new Date().toISOString() });
  };

  return (
    <>
      <PageHeader
        eyebrow="Employee app"
        title="What the occupant sees"
        subtitle="A simple mobile app: where I live, how to check in, how long the drive is, and one button to report a problem. The AI first line triages every report 24/7."
        actions={
          <select aria-label="Employee" className={inputCls} value={emp.id} onChange={(e) => setEmployeeId(e.target.value)}>
            {brief.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        }
      />
      <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
        <div className="relative w-[360px] max-w-full rounded-[44px] border-[10px] border-stone-900 bg-stone-900 shadow-2xl" data-testid="phone">
          <div className="absolute top-2 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-stone-900" />
          <div className="flex h-[700px] flex-col overflow-hidden rounded-[34px] bg-stone-50">
            <div className="flex items-center justify-between bg-brand-700 px-5 pt-9 pb-4 text-white">
              <div>
                <div className="text-xs opacity-80">Hi {emp.name.split(' ')[0]} 👋</div>
                <div className="text-base font-semibold">{TABS.find((t) => t.key === tab)!.label}</div>
              </div>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px]">{company.name}</span>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              {!unit ? (
                <p className="text-stone-600">No unit assigned yet.</p>
              ) : tab === 'home' ? (
                <>
                  <PhoneCard>
                    <PhotoThumb hash={unit.photos[0]} size={292} />
                    <div className="mt-2 font-semibold text-stone-900">{unit.title}</div>
                    <div className="text-xs text-stone-500">{unit.address}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {unit.amenities.slice(0, 5).map((x) => (
                        <Badge key={x}>{x}</Badge>
                      ))}
                    </div>
                  </PhoneCard>
                  <PhoneCard>
                    <Row k="Stay" v={`${formatDate(brief.start)} → ${formatDate(stayEnd(brief.start, brief.months))}`} />
                    <Row k="Lease holder" v={company.legalName} />
                    <Row k="Host" v={providerById(unit.providerId).name} />
                    <Row k="Rent" v="Paid by your employer" />
                  </PhoneCard>
                </>
              ) : tab === 'checkin' ? (
                <PhoneCard>
                  <ol className="space-y-2">
                    {CHECKIN.map((c, i) => (
                      <li key={c}>
                        <label className="flex items-center gap-3">
                          <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={done[i]} onChange={() => setDone(done.map((d, j) => (j === i ? !d : d)))} />
                          <span className={cx(done[i] && 'text-stone-400 line-through')}>{c}</span>
                        </label>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 h-1.5 rounded-full bg-stone-100">
                    <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${(done.filter(Boolean).length / CHECKIN.length) * 100}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-stone-500">Key handover by local partner, 30 Nov 2026, 18:00–20:00.</p>
                </PhoneCard>
              ) : tab === 'commute' ? (
                <>
                  <PhoneCard>
                    <div className="text-xs text-stone-500">To {site.operator}</div>
                    <div className="num mt-1 text-3xl font-semibold text-stone-900">{Math.round(a!.commuteMin)} min</div>
                    <div className="text-xs text-stone-500">
                      by car · {(haversineKm(unit, site) * 1.3).toFixed(1)} km road estimate
                    </div>
                  </PhoneCard>
                  <PhoneCard>
                    <Row k="Leave at" v="07:20 for 08:00 shift" />
                    <Row k="Car-pool" v={`${plan.assignments.filter((x) => x.employeeId !== emp.id && units.find((u) => u.id === x.unitId)?.zone === unit.zone).length} colleagues in ${unit.zone}`} />
                    <Row k="Parking" v={unit.amenities.includes('Parking') ? 'Included' : 'Street'} />
                  </PhoneCard>
                  <p className="px-1 text-[11px] text-stone-500">Estimate: straight-line × 1.3 at 50 km/h. Live traffic in phase 2.</p>
                </>
              ) : (
                <>
                  <PhoneCard>
                    <label htmlFor="issue" className="text-xs font-medium text-stone-600">
                      What's wrong?
                    </label>
                    <textarea id="issue" rows={3} className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe the problem…" />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {EXAMPLES.map((x) => (
                        <button key={x} type="button" onClick={() => setText(x)} className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] text-stone-600 hover:border-brand-600">
                          {x}
                        </button>
                      ))}
                    </div>
                    <Button className="mt-3 w-full" onClick={submit} disabled={!text.trim()} data-testid="report-issue">
                      Send report
                    </Button>
                  </PhoneCard>
                  {(triage || last) && <TriageCard t={triage ?? last!.triage} createdAt={last?.createdAt ?? new Date().toISOString()} now={now} />}
                </>
              )}
            </div>
            <nav className="grid grid-cols-4 border-t border-stone-200 bg-white" aria-label="App">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-current={tab === t.key ? 'page' : undefined}
                  onClick={() => setTab(t.key)}
                  className={cx('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', tab === t.key ? 'text-brand-700' : 'text-stone-500')}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={t.icon} />
                  </svg>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="max-w-sm space-y-3 text-sm text-stone-600">
          <h2 className="text-base font-semibold text-stone-900">Behind the screen</h2>
          <p>
            Every report goes to the <strong>AI first line</strong>: it sets urgency, an SLA and a category, answers the occupant immediately and dispatches the right local partner.
          </p>
          <ul className="space-y-1">
            <li>
              <Badge tone="red">Urgent</Badge> on-call person within <strong>2 h</strong> (gas, flooding, no heating or hot water, lock-out)
            </li>
            <li>
              <Badge tone="amber">High</Badge> fixed within <strong>24 h</strong>
            </li>
            <li>
              <Badge>Normal</Badge> within <strong>72 h</strong>
            </li>
          </ul>
          <p className="text-xs text-stone-500">Year-1 target: ≥ 95% of incidents solved within SLA.</p>
        </div>
      </div>
    </>
  );
}

function PhoneCard({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">{children}</div>;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-stone-100 py-1.5 text-xs last:border-0">
      <span className="text-stone-500">{k}</span>
      <span className="text-right font-medium text-stone-800">{v}</span>
    </div>
  );
}

function TriageCard({ t, createdAt, now }: { t: Triage; createdAt: string; now: number }) {
  const deadline = new Date(createdAt).getTime() + t.slaHours * 3_600_000;
  const left = Math.max(0, deadline - now);
  const hh = Math.floor(left / 3_600_000);
  const mm = Math.floor((left % 3_600_000) / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);
  const tone = t.urgency === 'urgent' ? 'red' : t.urgency === 'high' ? 'amber' : 'neutral';
  return (
    <div className={cx('rounded-2xl border p-3 shadow-sm', t.urgency === 'urgent' ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-white')} data-testid="triage-result">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Badge tone={tone}>{t.urgency.toUpperCase()}</Badge>
          <Badge>{t.category}</Badge>
        </span>
        <AiBadge label="AI triage" />
      </div>
      <div className="num mt-2 text-xs text-stone-600">
        SLA {t.slaHours} h · time left{' '}
        <strong className="text-stone-900">
          {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
        </strong>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-stone-800">{t.firstReply}</p>
      <p className="mt-2 text-[11px] text-stone-500">Dispatched to: {t.dispatch}</p>
    </div>
  );
}
