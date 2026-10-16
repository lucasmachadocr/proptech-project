import { draftCauseClause } from '../ai/lease';
import type { LeaseDraft } from '../ai/compliance';
import { companyById } from '../data/companies';
import { siteById } from '../data/sites';
import { stayEnd } from './dates';
import type { Assignment, Brief } from '../types';

/** Default lease for an assignment: cause pre-filled, assignment letter attached. */
export function draftForAssignment(brief: Brief, a: Assignment): LeaseDraft {
  const company = companyById(brief.companyId);
  const site = siteById(brief.siteId);
  const occupant = brief.employees.find((e) => e.id === a.employeeId)!;
  return {
    unitId: a.unitId,
    tenantCompanyId: company.id,
    occupants: [occupant.name],
    start: brief.start,
    end: stayEnd(brief.start, brief.months),
    cause: draftCauseClause(company, brief.projectName, `${site.operator}, ${site.town}`, [occupant.name]),
    assignmentLetter: true,
    guaranteeMonths: 1,
    priorConsecutiveLeases: 0,
  };
}

/** Demo step 4: a lease that breaks several RDL 29/2026 rules. */
export function nonCompliantDraft(brief: Brief, a: Assignment): LeaseDraft {
  const base = draftForAssignment(brief, a);
  return {
    ...base,
    end: stayEnd(brief.start, 13),
    cause: 'Holiday and personal use.',
    assignmentLetter: false,
    guaranteeMonths: 2,
    priorConsecutiveLeases: 2,
  };
}
