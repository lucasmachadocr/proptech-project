import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer } from 'react-leaflet';
import { commuteMin } from '../../ai/geo';
import { llm } from '../../ai/llm';
import type { Triage } from '../../ai/triage';
import { LogoMark } from '../../components/Logo';
import PhotoThumb from '../../components/PhotoThumb';
import { AiBadge, Badge, Button, LinkButton, cx } from '../../components/ui';
import { companyById } from '../../data/companies';
import { providerById } from '../../data/providers';
import { siteById } from '../../data/sites';
import { UNIT_TYPE_SHORT } from '../../data/units';
import { formatDate, stayEnd } from '../../lib/dates';
import { useStore } from '../../store';
import type { Site, Unit } from '../../types';

// Employee channel = a WhatsApp-style chat with Settle In (no app to install).
type Msg = { id: number; from: 'si' | 'me'; body: ReactNode; time: string };

const EXAMPLES = ['There is a smell of gas in the kitchen', 'The washing machine does not spin', 'The bathroom tap is dripping'];
const now = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export default function EmployeePage() {
  const { brief, plan, units, addIncident } = useStore();
  const [employeeId, setEmployeeId] = useState('E01');
  const [extra, setExtra] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [extra]);
  useEffect(() => {
    setExtra([]);
  }, [employeeId]);

  if (!plan) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
        <h1 className="text-xl font-semibold text-ink">No one housed yet</h1>
        <p className="mt-2 text-stone-600">Once a plan is approved, each engineer gets a WhatsApp chat with their address, check-in steps and a way to report issues.</p>
        <div className="mt-6">
          <LinkButton to="/client/brief">Start with the brief</LinkButton>
        </div>
      </div>
    );
  }

  const emp = brief.employees.find((e) => e.id === employeeId) ?? brief.employees[0];
  const a = plan.assignments.find((x) => x.employeeId === emp.id);
  const unit = a && units.find((u) => u.id === a.unitId);
  const site = siteById(brief.siteId);
  const company = companyById(brief.companyId);
  const first = emp.name.split(' ')[0];
  let seq = 100 + extra.length;
  const push = (m: Omit<Msg, 'id' | 'time'>) => setExtra((xs) => [...xs, { ...m, id: seq++, time: now() }]);

  const sendIssue = async (t: string) => {
    if (!t.trim()) return;
    push({ from: 'me', body: t });
    setText('');
    const tri = await llm.triageIssue(t);
    addIncident({ id: `INC-${Date.now().toString().slice(-5)}`, employeeId: emp.id, text: t, triage: tri, createdAt: new Date().toISOString() });
    setTimeout(() => push({ from: 'si', body: <TriageReply t={tri} /> }), 400);
  };
  const sendPhoto = () => {
    if (!unit) return;
    const n = photos;
    setPhotos(n + 1);
    push({ from: 'me', body: <PhotoThumb hash={unit.photos[n % unit.photos.length]} size={180} /> });
    setTimeout(() => push({ from: 'si', body: n >= 2 ? 'Thanks — check-in photos complete ✅. They protect your deposit at check-out.' : `Photo ${n + 1} of 3 received 👍` }), 300);
  };

  const welcome: Msg[] = unit
    ? [
        { id: 1, from: 'si', time: '09:00', body: `Hi ${first} 👋 Welcome to Settle In. I'm your housing assistant for the ${company.name} mission in ${site.city}.` },
        {
          id: 2,
          from: 'si',
          time: '09:00',
          body: (
            <div className="space-y-2">
              <div className="font-semibold">🏠 Your home</div>
              <div>
                {UNIT_TYPE_SHORT[unit.type]} · {unit.address}
              </div>
              <div className="text-xs opacity-80">
                {formatDate(brief.start)} → {formatDate(stayEnd(brief.start, brief.months))} · host: {providerById(unit.providerId).name}
              </div>
              <MiniMap site={site} unit={unit} />
              <div className="text-xs">🚗 About {Math.round(commuteMin(site, unit))} min to the site (estimate)</div>
            </div>
          ),
        },
        {
          id: 3,
          from: 'si',
          time: '09:01',
          body: (
            <div className="space-y-1">
              <div className="font-semibold">🔑 Check-in</div>
              <div>1. Keys from our local partner, {formatDate(brief.start)} 18:00–20:00</div>
              <div>2. Send me 3 photos of the flat when you arrive</div>
              <div>3. Wi-Fi: SettleIn-{unit.id} · password on the fridge</div>
              <div className="text-xs opacity-80">House rules: quiet hours 22:00–08:00, no smoking indoors.</div>
            </div>
          ),
        },
        { id: 4, from: 'si', time: '09:01', body: 'Anything wrong in the flat? Just write it here — I answer 24/7 and send the right person.' },
      ]
    : [{ id: 1, from: 'si', time: '09:00', body: 'You are not in the current plan.' }];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <section aria-label="WhatsApp chat" className="mx-auto w-full max-w-[420px]">
        <div className="overflow-hidden rounded-[28px] border border-stone-300 bg-[#efeae2] shadow-xl" data-testid="chat">
          <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-cream">
              <LogoMark className="h-5 w-4" />
            </span>
            <div className="leading-tight">
              <div className="font-semibold">Settle In</div>
              <div className="text-xs opacity-80">online · housing assistant</div>
            </div>
            <span className="ml-auto">
              <AiBadge label="AI" />
            </span>
          </div>
          <div className="h-[520px] space-y-2 overflow-y-auto px-3 py-4">
            {[...welcome, ...extra].map((m) => (
              <Bubble key={m.id} from={m.from} time={m.time}>
                {m.body}
              </Bubble>
            ))}
            <div ref={endRef} />
          </div>
          <div className="space-y-2 bg-[#f0f0f0] p-3">
            <div className="flex flex-wrap gap-1">
              {EXAMPLES.map((x) => (
                <button key={x} type="button" onClick={() => sendIssue(x)} className="rounded-full bg-white px-3 py-1 text-xs text-stone-700 ring-1 ring-stone-200 hover:ring-[#075e54]">
                  {x}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendIssue(text);
              }}
            >
              <button type="button" onClick={sendPhoto} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-lg ring-1 ring-stone-200" aria-label="Send a check-in photo" data-testid="send-photo">
                📷
              </button>
              <label htmlFor="msg" className="sr-only">
                Message
              </label>
              <input id="msg" value={text} onChange={(e) => setText(e.target.value)} placeholder="Report an issue…" className="min-w-0 flex-1 rounded-full bg-white px-4 py-2.5 text-base ring-1 ring-stone-200 focus:ring-[#075e54] focus:outline-none" />
              <button type="submit" disabled={!text.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#075e54] text-white disabled:opacity-40" aria-label="Send" data-testid="report-issue">
                ➤
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase">Employee · WhatsApp</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">No app to install. Just a chat.</h1>
        <p className="text-lg text-stone-600">Each engineer gets a welcome pack, check-in steps and a 24/7 assistant on WhatsApp. Issues are triaged by AI and sent to the right person.</p>
        <label className="block text-sm font-medium text-stone-700">
          See the chat of
          <select className="mt-1 block w-full max-w-xs rounded-lg border border-stone-300 bg-white px-3 py-2 text-base" value={emp.id} onChange={(e) => setEmployeeId(e.target.value)}>
            {brief.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <ul className="space-y-2 text-stone-700">
          <li>
            <Badge tone="red">Urgent</Badge> on-call person within <strong>2 h</strong> — gas, flooding, no heating or hot water, lock-out
          </li>
          <li>
            <Badge tone="amber">High</Badge> fixed within <strong>24 h</strong>
          </li>
          <li>
            <Badge>Normal</Badge> within <strong>72 h</strong>
          </li>
        </ul>
        <Button variant="secondary" onClick={() => setExtra([])}>
          Clear the conversation
        </Button>
      </section>
    </div>
  );
}

function Bubble({ from, time, children }: { from: 'si' | 'me'; time: string; children: ReactNode }) {
  return (
    <div className={cx('flex', from === 'me' ? 'justify-end' : 'justify-start')}>
      <div className={cx('max-w-[85%] rounded-lg px-3 py-2 text-sm leading-snug text-[#111b21] shadow-sm', from === 'me' ? 'rounded-tr-none bg-[#d9fdd3]' : 'rounded-tl-none bg-white')}>
        <div>{children}</div>
        <div className="mt-1 text-right text-[10px] text-stone-500">
          {time}
          {from === 'me' ? ' ✓✓' : ''}
        </div>
      </div>
    </div>
  );
}

function TriageReply({ t }: { t: Triage }) {
  const tone = t.urgency === 'urgent' ? 'red' : t.urgency === 'high' ? 'amber' : 'neutral';
  return (
    <div className="space-y-1" data-testid="triage-result">
      <div className="flex items-center gap-1.5">
        <Badge tone={tone}>{t.urgency.toUpperCase()}</Badge>
        <span className="text-xs text-stone-600">SLA {t.slaHours} h · {t.category}</span>
      </div>
      <div>{t.firstReply}</div>
      <div className="text-xs text-stone-500">Sent to: {t.dispatch}</div>
    </div>
  );
}

function MiniMap({ site, unit }: { site: Site; unit: Unit }) {
  return (
    <div className="h-36 overflow-hidden rounded-md">
      <MapContainer
        bounds={[
          [site.lat, site.lng],
          [unit.lat, unit.lng],
        ]}
        boundsOptions={{ padding: [18, 18] }}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        zoomAnimation={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={[[unit.lat, unit.lng], [site.lat, site.lng]]} pathOptions={{ color: '#c4573d', weight: 3, dashArray: '6 6' }} />
        <CircleMarker center={[unit.lat, unit.lng]} radius={7} pathOptions={{ color: '#c4573d', fillColor: '#c4573d', fillOpacity: 1 }} />
        <CircleMarker center={[site.lat, site.lng]} radius={7} pathOptions={{ color: '#2a2320', fillColor: '#2a2320', fillOpacity: 1 }} />
      </MapContainer>
    </div>
  );
}
