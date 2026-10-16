// Lease generator: one seasonal lease per unit, client company as tenant, named occupants.
import type { Company, Provider, Unit } from '../types';
import type { LeaseDraft } from './compliance';
import { formatDate } from '../lib/dates';

export interface LeaseDocument {
  title: string;
  sections: { heading: string; body: string }[];
}

export function draftCauseClause(company: Company, projectName: string, siteName: string, occupants: string[]): string {
  return `The Tenant leases the dwelling for a temporary period, exclusively to house ${occupants.join(', ') || '[occupants]'}, employees of ${company.legalName} temporarily displaced to work on the project "${projectName}" at ${siteName}. The cause of the temporary stay is this work assignment, evidenced by the attached employer assignment letter. The dwelling will not be the Tenant's or the occupants' habitual residence.`;
}

export function generateLease(d: LeaseDraft, unit: Unit, company: Company, provider: Provider): LeaseDocument {
  return {
    title: `Seasonal lease agreement · ${unit.id}`,
    sections: [
      { heading: 'Parties', body: `LANDLORD: ${provider.legalName} (CIF ${provider.cif}).\nTENANT: ${company.legalName} (CIF ${company.cif}), acting as employer of the occupants.\nPLATFORM: Settle In acts as intermediary and payment agent through a licensed payment institution.` },
      { heading: '1. Dwelling', body: `${unit.title}, ${unit.address}. ${unit.sqm} m², furnished; utilities, Wi-Fi and fortnightly cleaning included.` },
      { heading: '2. Occupants', body: d.occupants.length ? d.occupants.map((o, i) => `${i + 1}. ${o}`).join('\n') : '[none named]' },
      { heading: '3. Term', body: `From ${formatDate(d.start)} to ${formatDate(d.end)}. Seasonal lease under art. 3 LAU as amended by Royal Decree-Law 29/2026. No tacit renewal.` },
      { heading: '4. Cause of temporary stay', body: d.cause || '[missing]' },
      { heading: '5. Rent and payment', body: `€${unit.rent.toLocaleString('en-GB')} per month, payable monthly through the platform's consolidated project invoice. Rent is held by the licensed payment provider and paid out to the Landlord net of the platform commission.` },
      { heading: '6. Deposit and guarantee', body: `Legal deposit as required by law. Additional guarantee: ${d.guaranteeMonths} month(s) of rent.` },
      { heading: '7. Signatures', body: 'Signed electronically by both parties (qualified e-signature provider).' },
    ],
  };
}

/** Mock e-signature: deterministic short hash of the lease content + timestamp. */
export function mockSign(doc: LeaseDocument, at: Date = new Date()): { signedAt: string; hash: string } {
  const text = JSON.stringify(doc) + at.toISOString();
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return { signedAt: at.toISOString(), hash: (h >>> 0).toString(16).padStart(8, '0').toUpperCase() };
}
