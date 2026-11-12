import { Badge, Card, PageHeader, tableCls, tableWrap, td, th } from '../../components/ui';

interface Tool {
  name: string;
  use: string;
  cost: 'Free' | 'Paid' | 'Free tier';
  note: string;
}

const BUILT_WITH: Tool[] = [
  { name: 'Claude Code (Anthropic)', use: 'AI coding assistant used to write this MVP', cost: 'Paid', note: 'Used under a paid Claude subscription. Team reviewed the plan, data and outputs.' },
  { name: 'Claude (Anthropic)', use: 'Research, document review and drafting of the business plan', cost: 'Paid', note: 'Paid Claude subscription' },
  { name: 'transformers.js + DistilBERT (SQuAD)', use: 'Language model that reads the housing request (brief reader). Runs in the browser', cost: 'Free', note: 'Open source (Apache-2.0). Model downloaded from Hugging Face on first use, about 65 MB' },
  { name: 'transformers.js + Whisper (tiny, English)', use: 'Speech model that turns a voice brief into text. Runs in the browser', cost: 'Free', note: 'Open source (MIT). Model downloaded from Hugging Face on first use, about 40 MB' },
  { name: 'MapLibre GL + OpenFreeMap', use: '3D map of the plan: each flat lit up on its real building', cost: 'Free', note: 'Open source (BSD-3); OpenStreetMap data, no API key' },
  { name: 'OpenStreetMap Nominatim', use: 'Finds the project address typed by HR', cost: 'Free', note: 'Fair-use policy; one search per click' },
  { name: 'Vite', use: 'Build tool and dev server', cost: 'Free', note: 'Open source (MIT)' },
  { name: 'React + React DOM', use: 'User interface', cost: 'Free', note: 'Open source (MIT)' },
  { name: 'TypeScript', use: 'Typed JavaScript', cost: 'Free', note: 'Open source (Apache-2.0)' },
  { name: 'Tailwind CSS', use: 'Styling', cost: 'Free', note: 'Open source (MIT)' },
  { name: 'React Router', use: 'Navigation (hash routes for static hosting)', cost: 'Free', note: 'Open source (MIT)' },
  { name: 'Zustand', use: 'App state, saved in the browser (localStorage)', cost: 'Free', note: 'Open source (MIT)' },
  { name: 'Leaflet + React Leaflet', use: 'Interactive map', cost: 'Free', note: 'Open source (BSD-2 / Hippocratic)' },
  { name: 'OpenStreetMap tiles', use: 'Map background', cost: 'Free', note: 'No API key; attribution required; fair-use policy for light demo traffic' },
  { name: 'Inter (Fontsource)', use: 'Typeface, self-hosted', cost: 'Free', note: 'SIL Open Font License' },
  { name: 'Vitest', use: 'Unit tests for the engines', cost: 'Free', note: 'Open source (MIT)' },
  { name: 'Playwright', use: 'End-to-end test of the 5-step demo', cost: 'Free', note: 'Open source (Apache-2.0)' },
  { name: 'GitHub, GitHub Actions, GitHub Pages', use: 'Code hosting, build and public website', cost: 'Free', note: 'Free for public repositories' },
  { name: 'Netlify', use: 'Public website (settle-in-app.netlify.app)', cost: 'Free', note: 'Free plan' },
];

interface AiModule {
  name: string;
  kind: 'Language model' | 'Optimiser' | 'Rules';
  how: string;
  next: string;
}

// One line per AI module, with the technique it really uses today. Shown on this page and in the deck.
export const AI_MODULES: AiModule[] = [
  {
    name: 'Brief reader',
    kind: 'Language model',
    how: 'HR pastes the request as written. An open-source language model (DistilBERT, question answering) reads people, city, start date, length of stay, commute and budget, and shows the words and the confidence behind each field. A rule parser takes over if the model cannot load.',
    next: 'a hosted LLM that also reads attached HR files and team lists.',
  },
  {
    name: 'Voice brief',
    kind: 'Language model',
    how: 'HR can send a voice message instead of typing. An open-source speech model (Whisper tiny) transcribes it in the browser, then the brief reader reads the text. Nothing leaves the device.',
    next: 'any language, and briefs sent from WhatsApp.',
  },
  {
    name: 'Allocation and re-plan engine',
    kind: 'Optimiser',
    how: 'Minimises rent + λ × commute minutes under hard rules (budget, household, availability, commute cap, one household per apartment). Greedy start, then local-search swaps. Produces the three plans and re-plans without moving people already housed.',
    next: 'real travel times from a routing API and weights learned from past missions.',
  },
  {
    name: 'Listing verification',
    kind: 'Rules',
    how: 'Company KYC, Catastro owner match, duplicate-photo hash, price outlier and regional registration checks, combined into a trust score.',
    next: 'image models for photo checks and the KYC provider API.',
  },
  {
    name: 'Lease compliance',
    kind: 'Rules',
    how: 'Encodes the seasonal-lease rules of RDL 29/2026. A red check blocks the signature.',
    next: 'an LLM drafts the cause-of-stay clause; the rules still decide.',
  },
  {
    name: 'Employee issue triage',
    kind: 'Rules',
    how: 'Keyword rules set category, urgency and response time on WhatsApp-style messages.',
    next: 'an LLM assistant that answers first, in the employee’s language.',
  },
];

const PHASE_2: Tool[] = [
  { name: 'Claude API (Anthropic)', use: 'Reading longer briefs and HR files, plan explanations, issue triage in any language, lease-clause drafting', cost: 'Paid', note: 'Pay per token; called only from a serverless function, never from the browser' },
  { name: 'Serverless functions (e.g. Vercel / Cloudflare Workers)', use: 'Hold API keys, call the LLM', cost: 'Free tier', note: 'Free tier sufficient for a pilot' },
  { name: 'Licensed payment provider (e.g. Stripe Connect / Mangopay)', use: 'Collect rent, split payouts, KYC', cost: 'Paid', note: 'Per-transaction fees' },
  { name: 'Qualified e-signature provider', use: 'Lease signature', cost: 'Paid', note: 'Per-envelope pricing' },
  { name: 'Routing API', use: 'Real commute times with traffic', cost: 'Free tier', note: 'Replaces the distance × 1.3 estimate' },
];

export default function AboutTechPage() {
  return (
    <>
      <PageHeader
        eyebrow="About this MVP"
        title="Tools used, and what they cost"
        subtitle="Disclosure required for the course: every tool used to build and run this clickable MVP, and whether it is paid."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <ToolTable title="Phase 1 · built and running today" tools={BUILT_WITH} />
          <ToolTable title="Phase 2 · planned, not used yet" tools={PHASE_2} />
        </div>
        <div className="space-y-6">
          <Card title="How the AI works in this MVP" id="ai">
            <ul className="space-y-3 text-sm text-stone-600">
              {AI_MODULES.map((m) => (
                <li key={m.name}>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-stone-800">{m.name}</strong>
                    <Badge tone={m.kind === 'Language model' ? 'accent' : m.kind === 'Optimiser' ? 'blue' : 'neutral'}>{m.kind}</Badge>
                  </div>
                  <p className="mt-1">{m.how}</p>
                  <p className="mt-0.5 text-xs text-stone-500">In production: {m.next}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-stone-500">
              Everything runs in the browser: no backend, no API keys, no personal data leaves the device. A person approves every plan before the client sees it.
            </p>
          </Card>
          <Card title="Data">
            <p className="text-sm text-stone-600">
              All companies, providers, units, people and figures are fictional demo data. Site locations are approximate public areas. Commute times are estimates (straight-line distance × 1.3
              at 50 km/h). Legal rules are a simplified encoding for an academic project and are not legal advice.
            </p>
          </Card>
          <Card title="Total running cost today">
            <div className="num text-3xl font-semibold text-stone-900">€0 / month</div>
            <p className="mt-1 text-sm text-stone-600">Hosting (Netlify, GitHub Pages), build and maps are free. The paid tools are Claude Code (used to build the MVP) and Claude (used for research and drafting).</p>
          </Card>
        </div>
      </div>
    </>
  );
}

function ToolTable({ title, tools }: { title: string; tools: Tool[] }) {
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-stone-900">{title}</h2>
      <div className={tableWrap}>
        <table className={tableCls}>
          <thead className="bg-stone-50">
            <tr>
              <th className={th}>Tool</th>
              <th className={th}>Used for</th>
              <th className={th}>Cost</th>
              <th className={th}>Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {tools.map((t) => (
              <tr key={t.name}>
                <td className={`${td} font-medium text-stone-900`}>{t.name}</td>
                <td className={`${td} text-stone-600`}>{t.use}</td>
                <td className={td}>
                  <Badge tone={t.cost === 'Paid' ? 'amber' : t.cost === 'Free tier' ? 'blue' : 'green'}>{t.cost}</Badge>
                </td>
                <td className={`${td} text-xs text-stone-500`}>{t.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
