// Live-mode pieces of the brief: project location search, quick-pick numbers, a budget that shows
// per flat / per month / whole project side by side, and personal requirements (executive, family, closer).
import { useState } from 'react';
import { cx, inputCls } from '../../components/ui';
import { MADRID_PROJECT_SITES } from '../../data/sites';
import { stayEnd, formatDate } from '../../lib/dates';
import { eur } from '../../lib/format';
import type { Brief, Employee, Site } from '../../types';

// ── Quick-pick number: chips for the usual values, or type any number ─────
export function NumberPick({ label, value, options, unit, min, max, onChange, testId, missing }: { label: string; value: number; options: number[]; unit: string; min: number; max: number; onChange: (n: number) => void; testId: string; missing?: boolean }) {
  return (
    <div className={cx('rounded-2xl border bg-white p-4', missing ? 'border-amber-300 bg-amber-50' : 'border-stone-200')}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-stone-500">{label}</span>
        {missing && <span className="rounded-full bg-amber-100 px-2 text-xs font-semibold text-amber-800">missing — please fill</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onChange(o)} aria-pressed={value === o} className={cx('num rounded-full px-3 py-1 text-sm font-semibold', value === o ? 'bg-ink text-white' : 'bg-stone-100 text-ink hover:bg-stone-200')}>
            {o}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-sm text-stone-600">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
            className="num w-20 rounded-lg border border-stone-300 px-2 py-1 text-right text-base font-semibold text-ink"
            aria-label={`${label} (type a number)`}
            data-testid={testId}
          />
          {unit}
        </label>
      </div>
    </div>
  );
}

// ── Project location: search an address in Madrid, pick a known area, or click the map ──
export function ProjectLocation({ site, onSite }: { site?: Site; onSite: (s: Site) => void }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const find = async () => {
    if (q.trim().length < 3) return;
    setBusy(true);
    setErr('');
    try {
      // OpenStreetMap Nominatim, limited to the Madrid region.
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&viewbox=-4.1,40.75,-3.3,40.1&bounded=1&q=${encodeURIComponent(q)}`;
      const r = (await (await fetch(url, { headers: { Accept: 'application/json' } })).json()) as { lat: string; lon: string; display_name: string }[];
      if (!r.length) setErr('No place found in the Madrid region. Try a street, a town or a business park.');
      else {
        const name = r[0].display_name.split(',').slice(0, 2).join(',').trim();
        onSite({ id: 'L-ADDR', city: 'Madrid', name, operator: 'Project site', town: name, lat: +(+r[0].lat).toFixed(5), lng: +(+r[0].lon).toFixed(5) });
      }
    } catch {
      setErr('The address search is offline. Pick an area below or click the map.');
    }
    setBusy(false);
  };
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-stone-700">Project location</span>
      <div className="flex gap-2">
        <input className={`${inputCls} mt-0`} placeholder="Address, town or business park in the Madrid region" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && find()} data-testid="live-address" />
        <button type="button" onClick={find} disabled={busy} className="shrink-0 rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:bg-stone-400" data-testid="live-find">
          {busy ? '…' : 'Find'}
        </button>
      </div>
      {err && <p className="text-xs text-amber-700">{err}</p>}
      <div className="flex flex-wrap gap-1.5" data-testid="live-site">
        {MADRID_PROJECT_SITES.map((s) => (
          <button key={s.id} type="button" onClick={() => onSite(s)} aria-pressed={site?.id === s.id} className={cx('rounded-full px-3 py-1 text-xs font-medium', site?.id === s.id ? 'bg-ink text-white' : 'bg-stone-100 text-ink hover:bg-stone-200')}>
            {s.name}
          </button>
        ))}
      </div>
      <p className="text-xs text-stone-500" data-testid="live-site-now">
        Site: <strong className="text-ink">{site?.name ?? '—'}</strong>
        {site ? ` (${site.lat.toFixed(4)}, ${site.lng.toFixed(4)})` : ''} · or click the map to place it exactly.
      </p>
    </div>
  );
}

// ── Budget: per flat per month ↔ whole team per month ↔ whole project ──────
export function BudgetLinked({ brief, perFlat, onPerFlat }: { brief: Brief; perFlat: number; onPerFlat: (n: number) => void }) {
  const n = Math.max(1, brief.employees.length);
  const months = brief.months;
  const field = (label: string, value: number, toPerFlat: (v: number) => number, testId: string) => (
    <label className="block text-xs text-stone-500">
      {label}
      <div className="mt-1 flex items-center rounded-lg border border-stone-300 bg-white px-2">
        <span className="text-sm text-stone-500">€</span>
        <input type="number" step={50} value={Math.round(value)} onChange={(e) => onPerFlat(Math.max(300, Math.round(toPerFlat(Number(e.target.value) || 0))))} className="num w-full py-1.5 pl-1 text-right text-base font-semibold text-ink outline-none" data-testid={testId} />
      </div>
    </label>
  );
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4" data-testid="budget-linked">
      <div className="text-sm text-stone-500">Budget (rent, before our fees)</div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {field('Per flat / month', perFlat, (v) => v, 'budget-flat')}
        {field(`Team / month (${n})`, perFlat * n, (v) => v / n, 'budget-month')}
        {field(`Project (${months} mo)`, perFlat * n * months, (v) => v / (n * months), 'budget-project')}
      </div>
      <p className="mt-2 text-xs text-stone-500">Change any one; the others follow. Each flat stays under the per-flat amount, unless a requirement below says otherwise.</p>
    </div>
  );
}

// ── Personal requirements ─────────────────────────────────────────────────
export type Need = { kind: 'executive' | 'family' | 'closer'; count: number; budget: number; minutes: number };
const NEED_LABEL = { executive: 'Executive: a better flat', family: 'Family: 2 bedrooms', closer: 'Closer to the site' } as const;

export function applyNeeds(team: Employee[], needs: Need[]): Employee[] {
  const out = team.map((e) => ({ ...e }));
  let i = 0;
  for (const n of needs)
    for (let k = 0; k < n.count && i < out.length; k++, i++) {
      const e = out[i];
      if (n.kind === 'executive') Object.assign(e, { name: `Executive ${i + 1}`, title: 'Executive', need: 'Executive', budgetCap: n.budget, household: { adults: 2, children: 0 } });
      if (n.kind === 'family') Object.assign(e, { name: `${e.name} (family)`, need: 'Family', budgetCap: n.budget, household: { adults: 2, children: 1 } });
      if (n.kind === 'closer') Object.assign(e, { name: `${e.name} (near site)`, need: 'Closer', maxCommuteMin: n.minutes });
    }
  return out;
}

export function Requirements({ needs, onChange, max }: { needs: Need[]; onChange: (n: Need[]) => void; max: number }) {
  const used = needs.reduce((s, n) => s + n.count, 0);
  const add = (kind: Need['kind']) => onChange([...needs, { kind, count: 1, budget: kind === 'closer' ? 0 : kind === 'family' ? 3200 : 3000, minutes: 15 }]);
  const set = (i: number, patch: Partial<Need>) => onChange(needs.map((n, k) => (k === i ? { ...n, ...patch } : n)));
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4" data-testid="requirements">
      <div className="text-sm text-stone-500">Special requirements</div>
      <ul className="mt-2 space-y-2">
        {needs.map((n, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 p-2 text-sm">
            <span className="font-semibold text-ink">{NEED_LABEL[n.kind]}</span>
            <label className="flex items-center gap-1 text-stone-600">
              people
              <input type="number" min={1} max={max} value={n.count} onChange={(e) => set(i, { count: Math.max(1, Math.min(max, Number(e.target.value) || 1)) })} className="num w-14 rounded border border-stone-300 px-1 text-right" />
            </label>
            {n.kind !== 'closer' ? (
              <label className="flex items-center gap-1 text-stone-600">
                up to €
                <input type="number" step={100} value={n.budget} onChange={(e) => set(i, { budget: Number(e.target.value) || 0 })} className="num w-20 rounded border border-stone-300 px-1 text-right" />
                /mo
              </label>
            ) : (
              <label className="flex items-center gap-1 text-stone-600">
                max
                <input type="number" min={5} max={60} value={n.minutes} onChange={(e) => set(i, { minutes: Number(e.target.value) || 15 })} className="num w-14 rounded border border-stone-300 px-1 text-right" />
                min
              </label>
            )}
            <button type="button" onClick={() => onChange(needs.filter((_, k) => k !== i))} className="ml-auto rounded px-2 text-stone-500 hover:bg-stone-200" aria-label="Remove">
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(['executive', 'family', 'closer'] as const).map((k) => (
          <button key={k} type="button" disabled={used >= max} onClick={() => add(k)} className="rounded-full px-3 py-1 text-xs font-medium ring-1 ring-stone-300 hover:ring-ink disabled:opacity-40" data-testid={`add-${k}`}>
            + {NEED_LABEL[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StayDates({ brief, onStart }: { brief: Brief; onStart: (iso: string) => void }) {
  return (
    <label className="block text-sm text-stone-500">
      Start date
      <input type="date" className={inputCls} value={brief.start} onChange={(e) => e.target.value && onStart(e.target.value)} data-testid="live-start" />
      <span className="mt-1 block text-xs">Until {formatDate(stayEnd(brief.start, brief.months))}</span>
    </label>
  );
}

export const money = eur;
