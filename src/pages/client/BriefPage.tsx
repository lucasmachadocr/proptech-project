import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CityMap, { CityChips } from '../../components/CityMap';
import { AiBadge, inputCls, labelCls } from '../../components/ui';
import { MODEL_LABEL, SAMPLE_REQUEST, readBrief, type BriefReading } from '../../ai/briefReader';
import { DEMO_EMPLOYEES } from '../../data/brief';
import { COMPANIES } from '../../data/companies';
import { siteById, siteForCity } from '../../data/sites';
import { eur, pct } from '../../lib/format';
import { formatDate, stayEnd } from '../../lib/dates';
import { useStore } from '../../store';
import type { Brief, Employee, Role } from '../../types';

const ROLES: Role[] = ['engineer', 'technician', 'manager', 'expat'];

export function parseTeamCsv(text: string): Employee[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const idx = (k: string) => header.indexOf(k);
  return lines.slice(1).map((line, i) => {
    const c = line.split(',').map((x) => x.trim());
    const role = (c[idx('role')]?.toLowerCase() ?? 'engineer') as Role;
    return {
      id: `E${String(i + 1).padStart(2, '0')}`,
      name: c[idx('name')] || `Employee ${i + 1}`,
      role: ROLES.includes(role) ? role : 'engineer',
      title: c[idx('title')] || '',
      household: { adults: Number(c[idx('adults')]) || 1, children: Number(c[idx('children')]) || 0 },
    };
  });
}

/** Team list for a head-count read from the request: demo names first, then numbered placeholders. */
export function teamOf(n: number): Employee[] {
  return Array.from({ length: n }, (_, i) => DEMO_EMPLOYEES[i] ?? { id: `E${String(i + 1).padStart(2, '0')}`, name: `Engineer ${i + 1}`, role: 'engineer' as Role, title: 'Engineer', household: { adults: 1, children: 0 } });
}

const shown = (r: BriefReading['fields'][number]) =>
  r.value === null ? 'not stated' : r.key === 'start' ? formatDate(String(r.value)) : r.key === 'months' ? `${r.value} months` : r.key === 'maxCommuteMin' ? `${r.value} min` : r.key === 'budget' ? `${eur(Number(r.value))}/mo` : String(r.value);

export default function BriefPage() {
  const navigate = useNavigate();
  const { brief, setBrief, runAllocation, demoStep, setDemoStep } = useStore();
  const [draft, setDraft] = useState<Brief>(brief);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const company = COMPANIES.find((c) => c.id === draft.companyId)!;
  const city = siteById(draft.siteId).city;
  const update = <K extends keyof Brief>(k: K, v: Brief[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const [request, setRequest] = useState('');
  const [reading, setReading] = useState<BriefReading | null>(null);
  const [load, setLoad] = useState<number | null>(null);

  const read = async () => {
    setReading(null);
    setLoad(0);
    const r = await readBrief(request, (p) => setLoad(p.ratio));
    setLoad(null);
    setReading(r);
    const v = Object.fromEntries(r.fields.map((f) => [f.key, f.value]));
    setDraft((d) => ({
      ...d,
      employees: typeof v.people === 'number' ? teamOf(v.people) : d.employees,
      siteId: typeof v.city === 'string' ? siteForCity(v.city as Parameters<typeof siteForCity>[0]).id : d.siteId,
      start: typeof v.start === 'string' ? v.start : d.start,
      months: typeof v.months === 'number' ? v.months : d.months,
      maxCommuteMin: typeof v.maxCommuteMin === 'number' ? v.maxCommuteMin : d.maxCommuteMin,
      budgetCaps: typeof v.budget === 'number' ? { ...d.budgetCaps, engineer: v.budget, technician: v.budget } : d.budgetCaps,
    }));
  };

  const onFile = (f?: File) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => update('employees', parseTeamCsv(String(reader.result)));
    reader.readAsText(f);
  };

  const build = () => {
    setBusy(true);
    // Short, honest progress state: the engine itself runs in a few milliseconds.
    setTimeout(() => {
      setBrief(draft);
      runAllocation();
      if (demoStep) setDemoStep(2);
      navigate('/ops/review');
    }, 500);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section>
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">Step 1 · Brief</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">One brief for the whole team</h1>
        <p className="mt-3 text-lg text-stone-600">Tell us who is coming, where and for how long. We do the rest.</p>


        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5" data-testid="brief-reader">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Paste the request as HR wrote it</h2>
            <button type="button" className="text-sm text-stone-600 underline" onClick={() => setRequest(SAMPLE_REQUEST)} data-testid="brief-sample">
              Use a sample email
            </button>
          </div>
          <textarea
            className={`${inputCls} mt-3 h-28 resize-y`}
            aria-label="Housing request in plain text"
            placeholder="We need to house 20 engineers in Madrid from 1 December for six months…"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            data-testid="brief-request"
          />
          <button
            type="button"
            onClick={read}
            disabled={load !== null || request.trim().length < 20}
            className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-brand-700 text-brand-800 hover:bg-brand-50 disabled:text-stone-400 disabled:ring-stone-300"
            data-testid="brief-read"
          >
            {load !== null ? `Loading the language model… ${pct(load)}` : 'Read the request'} <AiBadge title={`Read by a language model that runs in this browser: ${MODEL_LABEL}`} />
          </button>
          {load !== null && <p className="mt-2 text-xs text-stone-500">First use downloads the model (about 65 MB). After that it is cached and works offline.</p>}
          {reading && (
            <div className="mt-4" data-testid="brief-reading">
              <p className="text-xs text-stone-500" data-testid="brief-engine">
                {reading.engine === 'model' ? `Read by ${MODEL_LABEL}, in ${reading.ms} ms. Nothing left this device.` : reading.note}
              </p>
              <table className="mt-2 w-full text-sm">
                <thead className="text-left text-xs text-stone-500">
                  <tr>
                    <th className="py-1 font-medium">Field</th>
                    <th className="py-1 font-medium">Value</th>
                    <th className="py-1 font-medium">Read from</th>
                    <th className="py-1 text-right font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {reading.fields.map((f) => (
                    <tr key={f.key}>
                      <td className="py-1.5 text-stone-600">{f.label}</td>
                      <td className="py-1.5 font-semibold text-ink">{shown(f)}</td>
                      <td className="py-1.5 text-stone-500">{f.evidence ? `“${f.evidence}”` : ''}</td>
                      <td className="num py-1.5 text-right text-stone-600">{f.value === null ? '' : f.by === 'model' ? pct(f.score) : 'rule'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-stone-500">The fields below are filled in. Check them, then build the plan. A person approves every plan.</p>
            </div>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4" data-testid="brief-summary">
          <Fact label="Who" value={`${draft.employees.length} engineers`} />
          <Fact label="Where" value={siteById(draft.siteId).town} />
          <Fact label="How long" value={`${draft.months} months`} sub={`${formatDate(draft.start)} → ${formatDate(stayEnd(draft.start, draft.months))}`} />
          <Fact label="Budget" value={`≤ ${eur(draft.budgetCaps.engineer)}/mo`} sub={`per apartment · ≤ ${draft.maxCommuteMin} min commute`} />
        </dl>

        <button
          type="button"
          onClick={build}
          disabled={busy || draft.employees.length === 0}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-6 py-4 text-lg font-semibold text-white hover:bg-brand-800 disabled:bg-stone-300 sm:w-auto"
          data-testid="generate-plan"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden /> Matching {draft.employees.length} people…
            </>
          ) : (
            <>
              Build the plan <AiBadge />
            </>
          )}
        </button>

        <details className="mt-8 rounded-2xl border border-stone-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Edit the brief</summary>
          <div className="mt-4 space-y-4">
            <div>
              <div className={labelCls}>City</div>
              <div className="mt-2">
                <CityChips city={city} onChange={(c) => update('siteId', siteForCity(c).id)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className={labelCls}>
                Start
                <input type="date" className={inputCls} value={draft.start} onChange={(e) => update('start', e.target.value)} />
              </label>
              <label className={labelCls}>
                Months
                <input type="number" min={2} max={12} className={inputCls} value={draft.months} onChange={(e) => update('months', Math.max(2, Math.min(12, Number(e.target.value))))} />
              </label>
              <label className={labelCls}>
                Max commute (min)
                <input type="number" min={10} max={60} className={inputCls} value={draft.maxCommuteMin} onChange={(e) => update('maxCommuteMin', Number(e.target.value))} />
              </label>
            </div>
            <label className={labelCls}>
              Budget per apartment (€ / month)
              <input type="number" step={50} className={`${inputCls} num`} value={draft.budgetCaps.engineer} onChange={(e) => update('budgetCaps', { ...draft.budgetCaps, engineer: Number(e.target.value), technician: Number(e.target.value) })} />
            </label>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Upload team CSV" onChange={(e) => onFile(e.target.files?.[0])} />
              <button type="button" className="rounded-full px-4 py-2 font-medium ring-1 ring-stone-300 hover:ring-ink" onClick={() => fileRef.current?.click()}>
                Upload team CSV
              </button>
              <button type="button" className="rounded-full px-4 py-2 font-medium ring-1 ring-stone-300 hover:ring-ink" onClick={() => update('employees', DEMO_EMPLOYEES)}>
                Use demo team (20)
              </button>
              <a className="text-stone-600 underline" href={`${import.meta.env.BASE_URL}demo-team.csv`} download>
                CSV sample
              </a>
            </div>
            <p className="text-xs text-stone-500">Company: {company.name}. Policy: one apartment (1-bed or larger) per engineer.</p>
          </div>
        </details>
      </section>

      <section aria-label="Map of the city">
        <CityMap city={city} height={460} />
      </section>
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-ink">{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-stone-500">{sub}</dd>}
    </div>
  );
}
