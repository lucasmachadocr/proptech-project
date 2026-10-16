// LLM interface. Phase 1 ships a deterministic mock built on the local engines.
//
// Phase 2: implement `HttpLlmClient` that POSTs to a serverless function (e.g. /api/llm on
// Vercel or Cloudflare Workers). The function holds the Anthropic API key server-side and calls
// Claude; the browser never sees a key. Swap the export at the bottom of this file.
//
//   class HttpLlmClient implements LlmClient {
//     async explainPlan(plan, brief) {
//       const r = await fetch('/api/llm', { method: 'POST', body: JSON.stringify({ task: 'explainPlan', plan, brief }) });
//       return (await r.json()).text;
//     }
//     ...
//   }
import type { Brief, Plan } from '../types';
import { triageIssue, type Triage } from './triage';

export interface LlmClient {
  /** Plain-language summary of a housing plan for the client's HR team. */
  explainPlan(plan: Plan, brief: Brief): Promise<string>;
  /** Classify an occupant's issue report: urgency, SLA, category, first reply. */
  triageIssue(text: string): Promise<Triage>;
  /** Draft or improve the lease's cause-of-stay clause. */
  draftLeaseClause(input: { company: string; project: string; site: string; occupants: string[] }): Promise<string>;
}

export class MockLlmClient implements LlmClient {
  async explainPlan(plan: Plan, brief: Brief): Promise<string> {
    const m = plan.metrics;
    return `All ${plan.assignments.length} of ${brief.employees.length} people are housed within ${brief.maxCommuteMin} minutes of the site ` +
      `(average ${m.avgCommuteMin} min) for €${m.monthlyRent.toLocaleString('en-GB')} a month. ` +
      `That is ${Math.round(m.savingVsHotelPct * 100)}% cheaper than hotel nights at €74, including our fee.`;
  }

  async triageIssue(text: string): Promise<Triage> {
    return triageIssue(text);
  }

  async draftLeaseClause(input: { company: string; project: string; site: string; occupants: string[] }): Promise<string> {
    return `Temporary housing for ${input.occupants.join(', ')}, employees of ${input.company} displaced to the "${input.project}" project at ${input.site}.`;
  }
}

export const llm: LlmClient = new MockLlmClient();
