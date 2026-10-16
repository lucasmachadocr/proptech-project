import { Badge, Card, PageHeader, tableCls, tableWrap, td, th } from '../../components/ui';

interface Tool {
  name: string;
  use: string;
  cost: 'Free' | 'Paid' | 'Free tier';
  note: string;
}

const BUILT_WITH: Tool[] = [
  { name: 'Claude Code (Anthropic)', use: 'AI coding assistant used to write this MVP', cost: 'Paid', note: 'Used under a paid Claude subscription. Team reviewed the plan, data and outputs.' },
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
];

const PHASE_2: Tool[] = [
  { name: 'Claude API (Anthropic)', use: 'Plan explanations, issue triage, lease-clause drafting', cost: 'Paid', note: 'Pay per token; called only from a serverless function, never from the browser' },
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
          <Card title="How the “AI” works in phase 1">
            <ul className="list-disc space-y-2 pl-5 text-sm text-stone-600">
              <li>
                <strong className="text-stone-800">Allocation engine</strong>: minimises rent + λ × commute minutes under hard rules (budget, household, availability, commute cap, one household
                per unit). Greedy start + local-search swaps. Deterministic and explainable.
              </li>
              <li>
                <strong className="text-stone-800">Verification</strong>: rule-based document, duplicate-photo, price-outlier and address checks → trust score.
              </li>
              <li>
                <strong className="text-stone-800">Compliance</strong>: encodes the seasonal-lease rules of RDL 29/2026; red blocks signature.
              </li>
              <li>
                <strong className="text-stone-800">Triage</strong>: keyword rules set urgency and SLA.
              </li>
            </ul>
            <p className="mt-3 text-xs text-stone-500">
              Everything runs in the browser: no backend, no API keys, no personal data leaves the device. The code has a clean <code>LlmClient</code> interface so phase 2 can plug Claude in
              through a serverless function.
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
            <p className="mt-1 text-sm text-stone-600">Hosting, build and maps are free. The only paid tool was the AI coding assistant used to build it.</p>
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
