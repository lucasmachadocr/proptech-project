import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiBadge, Badge, Button, Card, PageHeader, inputCls, labelCls, tableCls, tableWrap, td, th } from '../../components/ui';
import { DEMO_EMPLOYEES, ROLE_LABEL } from '../../data/brief';
import { COMPANIES } from '../../data/companies';
import { SITES } from '../../data/sites';
import { eur } from '../../lib/format';
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

export default function BriefPage() {
  const navigate = useNavigate();
  const { brief, setBrief, runAllocation } = useStore();
  const [draft, setDraft] = useState<Brief>(brief);
  const [csvNote, setCsvNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const company = COMPANIES.find((c) => c.id === draft.companyId)!;

  const update = <K extends keyof Brief>(k: K, v: Brief[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const onFile = (f?: File) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const team = parseTeamCsv(String(reader.result));
      update('employees', team);
      setCsvNote(`${team.length} people imported from ${f.name}`);
    };
    reader.readAsText(f);
  };

  const generate = () => {
    setBrief(draft);
    runAllocation();
    navigate('/client/plan');
  };

  return (
    <>
      <PageHeader
        eyebrow="Client · step 1"
        title="Submit one brief for the whole team"
        subtitle="Tell us where the project is, how long it runs and who is coming. The allocation engine turns it into one housing plan for everyone, in seconds."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card title="Project">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`${labelCls} sm:col-span-2`}>
              Client company
              <select className={inputCls} value={draft.companyId} onChange={(e) => update('companyId', e.target.value)}>
                {COMPANIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.kind}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${labelCls} sm:col-span-2`}>
              Project name
              <input className={inputCls} value={draft.projectName} onChange={(e) => update('projectName', e.target.value)} />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>
              Site
              <select className={inputCls} value={draft.siteId} onChange={(e) => update('siteId', e.target.value)}>
                {SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.operator} — {s.town}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Start date
              <input type="date" className={inputCls} value={draft.start} onChange={(e) => update('start', e.target.value)} />
            </label>
            <label className={labelCls}>
              Duration (months)
              <input type="number" min={2} max={12} className={inputCls} value={draft.months} onChange={(e) => update('months', Math.max(2, Math.min(12, Number(e.target.value))))} />
            </label>
            <label className={labelCls}>
              Max commute (min, one way)
              <input type="number" min={10} max={60} className={inputCls} value={draft.maxCommuteMin} onChange={(e) => update('maxCommuteMin', Number(e.target.value))} />
            </label>
            <div className="text-sm text-stone-600 sm:self-end sm:pb-2">
              Ends <strong className="text-stone-900">{formatDate(stayEnd(draft.start, draft.months))}</strong>
            </div>
          </div>
          <h3 className="mt-6 mb-2 text-sm font-semibold text-stone-900">Budget cap per role (€ / month)</h3>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((r) => (
              <label key={r} className={labelCls}>
                {ROLE_LABEL[r]}
                <input
                  type="number"
                  step={50}
                  className={`${inputCls} num`}
                  value={draft.budgetCaps[r]}
                  onChange={(e) => update('budgetCaps', { ...draft.budgetCaps, [r]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-stone-500">
            Housing policy: technicians studio or 1-bed; engineers and managers at least a 1-bed; families get a bedroom per child pair. One household per unit — no shared bedrooms.
          </p>
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              Team <Badge>{draft.employees.length} people</Badge>
            </span>
          }
          actions={
            <>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Upload team CSV" onChange={(e) => onFile(e.target.files?.[0])} />
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                Upload CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  update('employees', DEMO_EMPLOYEES);
                  setCsvNote('Demo team loaded');
                }}
              >
                Use demo team
              </Button>
            </>
          }
        >
          {csvNote && <p className="mb-3 text-sm text-brand-800">{csvNote}</p>}
          <div className={tableWrap}>
            <table className={tableCls}>
              <thead className="bg-stone-50">
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Role</th>
                  <th className={th}>Household</th>
                  <th className={`${th} text-right`}>Budget cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {draft.employees.map((e) => (
                  <tr key={e.id}>
                    <td className={td}>
                      <div className="font-medium text-stone-900">{e.name}</div>
                      <div className="text-xs text-stone-500">{e.title}</div>
                    </td>
                    <td className={td}>{ROLE_LABEL[e.role]}</td>
                    <td className={td}>
                      {e.household.adults} adult{e.household.adults > 1 ? 's' : ''}
                      {e.household.children > 0 && `, ${e.household.children} child${e.household.children > 1 ? 'ren' : ''}`}
                    </td>
                    <td className={`${td} num text-right`}>{eur(draft.budgetCaps[e.role])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-stone-500">
            CSV columns: <code>name,role,title,adults,children</code> ·{' '}
            <a className="text-brand-800 underline" href={`${import.meta.env.BASE_URL}demo-team.csv`} download>
              download a sample
            </a>
          </p>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
        <div className="text-sm text-brand-900">
          <span className="font-semibold">{company.name}</span> · {draft.employees.length} people · {draft.months} months · ≤ {draft.maxCommuteMin} min commute
        </div>
        <Button onClick={generate} disabled={draft.employees.length === 0} data-testid="generate-plan">
          Generate housing plan <AiBadge />
        </Button>
      </div>
    </>
  );
}
