// Compliance engine for Spanish seasonal leases (arrendamiento de temporada) under
// Royal Decree-Law 29/2026 (in force 8 Oct 2026). Demo encoding of the rules — not legal advice.
import { addMonths, daysInclusive } from '../lib/dates';
import type { ISODate } from '../types';

export type Light = 'green' | 'amber' | 'red';

export interface LeaseDraft {
  unitId: string;
  tenantCompanyId: string;
  occupants: string[];
  start: ISODate;
  end: ISODate; // last day of the lease
  cause: string; // written cause of temporary work displacement
  assignmentLetter: boolean; // employer assignment letter attached
  guaranteeMonths: number; // additional guarantee on top of the legal deposit
  priorConsecutiveLeases: number; // earlier back-to-back leases, same parties, same unit
}

export interface RuleResult {
  id: 'duration' | 'cause' | 'letter' | 'consecutive' | 'guarantee' | 'occupants';
  label: string;
  light: Light;
  detail: string;
}

export interface ComplianceResult {
  rules: RuleResult[];
  overall: Light;
  canSign: boolean;
}

export const MIN_DAYS_EXCLUSIVE = 31; // must be more than 31 days
export const MAX_MONTHS = 12;
export const MAX_CONSECUTIVE = 2;
export const MAX_GUARANTEE_MONTHS = 1;

const WORK_WORDS = /(work|project|assignment|commissioning|construction|secondment|posting|displacement|contract)/i;

export function checkLease(d: LeaseDraft): ComplianceResult {
  const rules: RuleResult[] = [];
  const days = daysInclusive(d.start, d.end);
  const capEnd = addMonths(d.start, MAX_MONTHS); // end must be before this date
  const nearCapEnd = addMonths(d.start, MAX_MONTHS - 1);
  rules.push(
    days <= MIN_DAYS_EXCLUSIVE
      ? { id: 'duration', label: 'Duration > 31 days and ≤ 12 months', light: 'red', detail: `${days} days — 31 days or less is a short-term (tourist) stay, not a seasonal lease` }
      : d.end >= capEnd
        ? { id: 'duration', label: 'Duration > 31 days and ≤ 12 months', light: 'red', detail: `${days} days — exceeds 12 months; would be reclassified as a habitual-residence lease` }
        : d.end >= nearCapEnd
          ? { id: 'duration', label: 'Duration > 31 days and ≤ 12 months', light: 'amber', detail: `${days} days — within a month of the 12-month cap; no further extension possible` }
          : { id: 'duration', label: 'Duration > 31 days and ≤ 12 months', light: 'green', detail: `${days} days` },
  );

  const cause = d.cause.trim();
  rules.push(
    !cause
      ? { id: 'cause', label: 'Written work-displacement cause', light: 'red', detail: 'Missing — the lease must state a real, provable cause of temporary stay' }
      : cause.length < 40 || !WORK_WORDS.test(cause)
        ? { id: 'cause', label: 'Written work-displacement cause', light: 'amber', detail: 'Too generic — name the project, employer and reason for displacement' }
        : { id: 'cause', label: 'Written work-displacement cause', light: 'green', detail: 'Specific work cause stated' },
  );

  rules.push(
    d.assignmentLetter
      ? { id: 'letter', label: 'Assignment letter attached', light: 'green', detail: 'Employer assignment letter on file' }
      : { id: 'letter', label: 'Assignment letter attached', light: 'red', detail: 'No evidence of the cause — attach the employer assignment letter' },
  );

  const n = d.priorConsecutiveLeases + 1;
  rules.push(
    n > MAX_CONSECUTIVE
      ? { id: 'consecutive', label: 'Max. two consecutive leases (same parties, same unit)', light: 'red', detail: `This would be lease #${n} in a row — not allowed` }
      : n === MAX_CONSECUTIVE
        ? { id: 'consecutive', label: 'Max. two consecutive leases (same parties, same unit)', light: 'amber', detail: 'Second consecutive lease — the last one allowed' }
        : { id: 'consecutive', label: 'Max. two consecutive leases (same parties, same unit)', light: 'green', detail: 'First lease between these parties on this unit' },
  );

  rules.push(
    d.guaranteeMonths > MAX_GUARANTEE_MONTHS
      ? { id: 'guarantee', label: 'Additional guarantee ≤ 1 month', light: 'red', detail: `${d.guaranteeMonths} months requested — capped at 1 month of rent` }
      : { id: 'guarantee', label: 'Additional guarantee ≤ 1 month', light: 'green', detail: `${d.guaranteeMonths} month(s)` },
  );

  rules.push(
    d.occupants.length === 0
      ? { id: 'occupants', label: 'Named occupants', light: 'red', detail: 'Company tenant must name the people who will live in the unit' }
      : { id: 'occupants', label: 'Named occupants', light: 'green', detail: d.occupants.join(', ') },
  );

  const overall: Light = rules.some((r) => r.light === 'red') ? 'red' : rules.some((r) => r.light === 'amber') ? 'amber' : 'green';
  return { rules, overall, canSign: overall !== 'red' };
}
