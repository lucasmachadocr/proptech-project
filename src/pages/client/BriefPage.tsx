import { Suspense, lazy, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CityChips } from '../../components/CityMap';
const BriefMap3D = lazy(() => import('../../components/BriefMap3D'));
import { AiBadge, inputCls, labelCls } from '../../components/ui';
import { MODEL_LABEL, SAMPLE_REQUEST, readBrief, type BriefReading, type FieldKey } from '../../ai/briefReader';
import { DEMO_EMPLOYEES, genericTeam } from '../../data/brief';
import { COMPANIES } from '../../data/companies';
import { siteForCity, briefSite } from '../../data/sites';
import { eur, pct } from '../../lib/format';
import { formatDate, stayEnd } from '../../lib/dates';
import { useStore } from '../../store';
import { BudgetLinked, NumberPick, ProjectLocation, Requirements, StayDates, applyNeeds, type Need } from './LiveBrief';
import { SPEECH_MODEL_LABEL, loadSpeechModel, startRecording, toMono16k } from '../../ai/speech';
import { FACTS } from '../../data/facts';
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
  r.value === null ? '—' : r.key === 'start' ? formatDate(String(r.value)) : r.key === 'months' ? `${r.value} months` : r.key === 'maxCommuteMin' ? `${r.value} min` : r.key === 'budget' ? `${eur(Number(r.value))}/mo` : String(r.value);

export default function BriefPage() {
  const navigate = useNavigate();
  const { brief, setBrief, runAllocation, demoStep, setDemoStep, mode } = useStore();
  const live = mode === 'live';
  const units = useStore((s) => s.units);
  const team = (n: number) => (live ? genericTeam(n) : teamOf(n));
  const [draft, setDraft] = useState<Brief>(brief);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const company = COMPANIES.find((c) => c.id === draft.companyId)!;
  const city = briefSite(draft).city;
  const update = <K extends keyof Brief>(k: K, v: Brief[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const [request, setRequest] = useState('');
  const [reading, setReading] = useState<BriefReading | null>(null);
  const [load, setLoad] = useState<number | null>(null);
  // Fields the request did not state. They are never filled with a guess: the user fills them in.
  const [missing, setMissing] = useState<Set<FieldKey>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const fill = (...keys: FieldKey[]) =>
    setMissing((m) => {
      const n = new Set(m);
      keys.forEach((k) => n.delete(k));
      return n;
    });
  const isMissing = (...keys: FieldKey[]) => keys.some((k) => missing.has(k));

  const [needs, setNeeds] = useState<Need[]>([]);
  // Voice message: record, transcribe in the browser (Whisper), then read like a typed request.
  const [voice, setVoice] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [voiceNote, setVoiceNote] = useState('');
  const recorder = useRef<{ stop: () => Promise<Blob> } | null>(null);
  const toggleVoice = async () => {
    if (voice === 'recording' && recorder.current) {
      setVoice('transcribing');
      try {
        const audio = await toMono16k(await recorder.current.stop());
        const asr = await loadSpeechModel((r) => setVoiceNote(`Loading the speech model… ${pct(r)}`));
        setVoiceNote('Transcribing…');
        const text = await asr(audio);
        setRequest(text);
        setVoiceNote(`Transcribed by ${SPEECH_MODEL_LABEL}.`);
        if (text.length >= 20) await read(text);
      } catch {
        setVoiceNote('The voice message could not be transcribed. Please type the request.');
      }
      recorder.current = null;
      setVoice('idle');
      return;
    }
    try {
      recorder.current = await startRecording();
      setVoice('recording');
      setVoiceNote('Recording… tap again to send.');
    } catch {
      setVoiceNote('No microphone access. Please type the request.');
    }
  };

  const read = async (text: string = request) => {
    setReading(null);
    setLoad(0);
    const r = await readBrief(text, (p) => setLoad(p.ratio));
    setLoad(null);
    setReading(r);
    const gaps = new Set(r.fields.filter((f) => f.value === null).map((f) => f.key));
    setMissing(gaps);
    if (gaps.size > 0) setEditOpen(true);
    const v = Object.fromEntries(r.fields.map((f) => [f.key, f.value]));
    setDraft((d) => ({
      ...d,
      employees: typeof v.people === 'number' ? team(v.people) : d.employees,
      // Live mode: Madrid is the only open city, so the site the client chose stays.
      siteId: !live && typeof v.city === 'string' ? siteForCity(v.city as Parameters<typeof siteForCity>[0]).id : d.siteId,
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
      setBrief(live ? { ...draft, employees: applyNeeds(genericTeam(draft.employees.length), needs) } : draft);
      runAllocation();
      if (demoStep) setDemoStep(2);
      navigate('/ops/review');
    }, 500);
  };
  const pickSite = (lat: number, lng: number) => update('site', { id: 'L-PIN', city: 'Madrid', name: 'Your project site (map point)', operator: 'Project site', town: 'your map point', lat, lng });
  const needsCompany = live && !draft.companyName?.trim();

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section>
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">Step 1 · Brief</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">One brief for the whole team</h1>
        <p className="mt-3 text-lg text-stone-600">Tell us who is coming, where and for how long. We do the rest.</p>

        {live && (
          <div className="mt-6 space-y-4 rounded-2xl border border-stone-200 bg-white p-5" data-testid="live-project">
            <h2 className="text-sm font-semibold text-ink">Your project in {FACTS.cities[0]}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>
                Company
                <input className={inputCls} placeholder="Your company" value={draft.companyName ?? ''} onChange={(e) => update('companyName', e.target.value)} data-testid="live-company" />
              </label>
              <label className={labelCls}>
                Project
                <input className={inputCls} placeholder="e.g. Data-centre fit-out" value={draft.projectName} onChange={(e) => update('projectName', e.target.value)} data-testid="live-projectname" />
              </label>
            </div>
            <ProjectLocation site={draft.site} onSite={(st) => update('site', st)} />
          </div>
        )}


        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5" data-testid="brief-reader">
          {live && (
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800" aria-hidden>
                HR
              </span>
              <div className="text-sm">
                <div className="font-semibold text-ink">{draft.companyName ? `${draft.companyName} · HR` : 'You · HR'}</div>
                <div className="text-stone-500">Write the request, paste an email, or send a voice message.</div>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">{live ? 'Your request' : 'Paste the request as HR wrote it'}</h2>
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
            onClick={() => read()}
            disabled={load !== null || request.trim().length < 20}
            className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-brand-700 text-brand-800 hover:bg-brand-50 disabled:text-stone-400 disabled:ring-stone-300"
            data-testid="brief-read"
          >
            {load !== null ? `Loading the language model… ${pct(load)}` : 'Read the request'} <AiBadge title={`Read by a language model that runs in this browser: ${MODEL_LABEL}`} />
          </button>
          {live && (
            <button
              type="button"
              onClick={toggleVoice}
              disabled={voice === 'transcribing'}
              className={`mt-3 ml-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${voice === 'recording' ? 'bg-brand-700 text-white ring-brand-700' : 'text-ink ring-stone-300 hover:ring-ink'} disabled:opacity-50`}
              data-testid="brief-voice"
              aria-pressed={voice === 'recording'}
            >
              {voice === 'recording' ? '■ Stop and send' : voice === 'transcribing' ? 'Transcribing…' : '🎙 Voice message'}
              <AiBadge title={`Transcribed in this browser by ${SPEECH_MODEL_LABEL}`} />
            </button>
          )}
          {voiceNote && <p className="mt-2 text-xs text-stone-500" data-testid="voice-note">{voiceNote}</p>}
          {load !== null && <p className="mt-2 text-xs text-stone-500">First use downloads the model (about 65 MB). After that it is cached and works offline.</p>}
          {reading && (
            <div className="mt-4" data-testid="brief-reading">
              <p className="text-xs text-stone-500" data-testid="brief-engine">
                {reading.engine === 'model' ? `Read by ${MODEL_LABEL}, in ${reading.ms} ms. Nothing left this device.` : reading.note}
              </p>
              <table className="mt-2 w-full table-fixed text-sm">
                <thead className="text-left text-xs text-stone-500">
                  <tr>
                    <th className="py-1 font-medium">Field</th>
                    <th className="py-1 font-medium">Value</th>
                    <th className="py-1 font-medium">Read from</th>
                    <th className="py-1 text-right font-medium">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {reading.fields.map((f) => (
                    <tr key={f.key}>
                      <td className="py-1.5 text-stone-600">{f.label}</td>
                      <td className={f.value === null ? 'py-1.5 font-semibold text-amber-700' : 'py-1.5 font-semibold text-ink'}>{shown(f)}</td>
                      <td className="py-1.5 break-words text-stone-500">{f.evidence ? `“${f.evidence}”` : ''}</td>
                      <td className="py-1.5 text-right">
                        <SourceTag f={f} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-stone-500" data-testid="brief-gaps">
                {missing.size === 0 ? 'The fields below are filled in. Check them, then build the plan. A person approves every plan.' : `The request does not say everything: please fill the ${missing.size} missing field${missing.size > 1 ? 's' : ''} below. We never guess.`}
              </p>
            </div>
          )}
        </div>

        {live && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2" data-testid="brief-summary">
            <NumberPick label="Who · engineers" value={draft.employees.length} options={[5, 10, 20, 30]} unit="people" min={1} max={100} missing={isMissing('people')} onChange={(n) => (update('employees', genericTeam(n)), fill('people'))} testId="live-people" />
            <NumberPick label="How long · months" value={draft.months} options={[3, 6, 9, 12]} unit="months" min={2} max={12} missing={isMissing('months')} onChange={(n) => (update('months', n), fill('months'))} testId="live-months" />
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <StayDates brief={draft} onStart={(d) => (update('start', d), fill('start'))} />
            </div>
            <NumberPick label="Max commute to the site" value={draft.maxCommuteMin} options={[20, 30, 45]} unit="min" min={10} max={60} missing={isMissing('maxCommuteMin')} onChange={(n) => (update('maxCommuteMin', n), fill('maxCommuteMin'))} testId="live-commute" />
            <div className="sm:col-span-2">
              <BudgetLinked brief={draft} perFlat={draft.budgetCaps.engineer} onPerFlat={(v) => (update('budgetCaps', { ...draft.budgetCaps, engineer: v, technician: v }), fill('budget'))} />
            </div>
            <div className="sm:col-span-2">
              <Requirements needs={needs} onChange={setNeeds} max={draft.employees.length} />
            </div>
          </div>
        )}
        {!live && (
        <dl className="mt-6 grid grid-cols-2 gap-4" data-testid="brief-summary">
          <Fact label="Who" missing={isMissing('people')} value={`${draft.employees.length} engineers`} />
          <Fact label="Where" missing={isMissing('city')} value={briefSite(draft).town} />
          <Fact label="How long" missing={isMissing('months', 'start')} value={`${draft.months} months`} sub={`${formatDate(draft.start)} → ${formatDate(stayEnd(draft.start, draft.months))}`} />
          <Fact label="Budget" missing={isMissing('budget', 'maxCommuteMin')} value={`≤ ${eur(draft.budgetCaps.engineer)}/mo`} sub={`per apartment · ≤ ${draft.maxCommuteMin} min commute`} />
        </dl>
        )}

        <button
          type="button"
          onClick={build}
          disabled={busy || draft.employees.length === 0 || missing.size > 0 || needsCompany}
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

        {needsCompany && <p className="mt-2 text-sm text-stone-500">Add your company name above to build the plan.</p>}

        {!live && (
        <details className="mt-8 rounded-2xl border border-stone-200 bg-white p-5" open={editOpen} onToggle={(e) => setEditOpen((e.target as HTMLDetailsElement).open)} data-testid="brief-edit">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Edit the brief</summary>
          <div className="mt-4 space-y-4">
            <div>
              <div className={labelCls}>City</div>
              <div className="mt-2">
                <CityChips
                  launchOnly={live}
                  city={city}
                  onChange={(c) => {
                    update('siteId', siteForCity(c).id);
                    fill('city');
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <label className={labelCls}>
                <Need on={isMissing('people')}>People</Need>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={inputCls}
                  value={draft.employees.length}
                  onChange={(e) => {
                    update('employees', team(Math.max(1, Math.min(100, Number(e.target.value) || 1))));
                    fill('people');
                  }}
                  onBlur={() => fill('people')}
                  data-testid="edit-people"
                />
              </label>
              <label className={labelCls}>
                <Need on={isMissing('start')}>Start</Need>
                <input
                  type="date"
                  className={inputCls}
                  value={draft.start}
                  onChange={(e) => {
                    update('start', e.target.value);
                    fill('start');
                  }}
                  onBlur={() => fill('start')}
                  data-testid="edit-start"
                />
              </label>
              <label className={labelCls}>
                <Need on={isMissing('months')}>Months</Need>
                <input
                  type="number"
                  min={2}
                  max={12}
                  className={inputCls}
                  value={draft.months}
                  onChange={(e) => {
                    update('months', Math.max(2, Math.min(12, Number(e.target.value))));
                    fill('months');
                  }}
                  onBlur={() => fill('months')}
                  data-testid="edit-months"
                />
              </label>
              <label className={labelCls}>
                <Need on={isMissing('maxCommuteMin')}>Max commute (min)</Need>
                <input
                  type="number"
                  min={10}
                  max={60}
                  className={inputCls}
                  value={draft.maxCommuteMin}
                  onChange={(e) => {
                    update('maxCommuteMin', Number(e.target.value));
                    fill('maxCommuteMin');
                  }}
                  onBlur={() => fill('maxCommuteMin')}
                  data-testid="edit-commute"
                />
              </label>
            </div>
            <label className={labelCls}>
              <Need on={isMissing('budget')}>Budget per apartment (€ / month)</Need>
              <input
                type="number"
                step={50}
                className={`${inputCls} num`}
                value={draft.budgetCaps.engineer}
                onChange={(e) => {
                  update('budgetCaps', { ...draft.budgetCaps, engineer: Number(e.target.value), technician: Number(e.target.value) });
                  fill('budget');
                }}
                onBlur={() => fill('budget')}
                  data-testid="edit-budget"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Upload team CSV" onChange={(e) => onFile(e.target.files?.[0])} />
              <button type="button" className="rounded-full px-4 py-2 font-medium ring-1 ring-stone-300 hover:ring-ink" onClick={() => fileRef.current?.click()}>
                Upload team CSV
              </button>
{!live && (
              <button type="button" className="rounded-full px-4 py-2 font-medium ring-1 ring-stone-300 hover:ring-ink" onClick={() => update('employees', DEMO_EMPLOYEES)}>
                Use demo team (20)
              </button>
              )}
              <a className="text-stone-600 underline" href={`${import.meta.env.BASE_URL}demo-team.csv`} download>
                CSV sample
              </a>
            </div>
            <p className="text-xs text-stone-500">Company: {live ? draft.companyName || '—' : company.name}. Policy: one apartment (1-bed or larger) per engineer.</p>
          </div>
        </details>
        )}
      </section>

      <section aria-label="Map of the city">
        <Suspense fallback={<div className="grid place-items-center rounded-2xl bg-white text-sm text-stone-500 ring-1 ring-stone-200" style={{ height: 460 }}>Loading the 3D map of Madrid…</div>}>
          <BriefMap3D city={city} height={460} site={briefSite(draft)} units={units} onPick={live ? pickSite : undefined} />
        </Suspense>
      </section>
    </div>
  );
}

function Fact({ label, value, sub, missing }: { label: string; value: string; sub?: string; missing?: boolean }) {
  return (
    <div className={missing ? 'rounded-2xl border border-amber-300 bg-amber-50 p-4' : 'rounded-2xl border border-stone-200 bg-white p-4'} data-missing={missing ? 'true' : undefined}>
      <dt className="text-sm text-stone-500">{label}</dt>
      {missing ? (
        <dd className="mt-1 text-base font-semibold text-amber-800">Missing — please fill</dd>
      ) : (
        <>
          <dd className="mt-1 text-xl font-semibold break-words text-ink">{value}</dd>
          {sub && <dd className="mt-0.5 text-xs text-stone-500">{sub}</dd>}
        </>
      )}
    </div>
  );
}

/** Where a field came from: the language model, the rule parser, or nowhere (the user must fill it). */
function SourceTag({ f }: { f: BriefReading['fields'][number] }) {
  if (f.value === null)
    return (
      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800" data-source="missing">
        missing — please fill
      </span>
    );
  if (f.by === 'model')
    return (
      <span className="num inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800" data-source="model" title={`Model confidence ${pct(f.score)}`}>
        read by AI · {pct(f.score)}
      </span>
    );
  return (
    <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700" data-source="rules">
      rules
    </span>
  );
}

function Need({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {children}
      {on && <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-800">missing</span>}
    </span>
  );
}
