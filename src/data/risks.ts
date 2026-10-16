import type { Risk } from '../types';

// Deliverable 1 · Section 5.9 — key operational risks.
export const RISKS: Risk[] = [
  { id: 'R1', title: 'Seasonal-lease rules change after the 29 Nov election', impact: 'Leases reclassified as habitual residence (5–7 years of tenant protection)', mitigation: 'Work cause + assignment letter stored with every lease; lawyer-maintained templates; 12-month cap', likelihood: 3, severity: 5, owner: 'Legal (external lawyer)', trigger: 'New decree-law or Congress vote on RDL 29/2026' },
  { id: 'R2', title: 'Client pays late', impact: 'Payouts delayed, providers lost', mitigation: 'Credit policy by tier, credit insurance, prepaid terms for subcontractors', likelihood: 3, severity: 4, owner: 'Finance', trigger: 'DSO > 35 days' },
  { id: 'R3', title: 'Fraudulent or poor listing', impact: 'Safety and reputation', mitigation: 'Verification layer (AI checks), video visit, first-unit inspection, trust score', likelihood: 3, severity: 4, owner: 'Operations & supply', trigger: 'Trust score < 50 or occupant complaint' },
  { id: 'R4', title: 'Provider cancels before arrival', impact: 'Team without housing', mitigation: 'Re-allocation engine; back-up units in each cluster; one-night hotel cover', likelihood: 2, severity: 4, owner: 'Account manager', trigger: 'Cancellation < 14 days before check-in' },
  { id: 'R5', title: 'Data breach', impact: 'GDPR fines, loss of clients', mitigation: 'EU hosting, encryption, role-based access, ID documents deleted after checks', likelihood: 2, severity: 5, owner: 'Product / CTO', trigger: 'Security alert or access anomaly' },
  { id: 'R6', title: 'Projects end or slip', impact: 'Idle supply, cancelled briefs', mitigation: 'Several projects per cluster; contractors bring the next site; flexible provider agreements', likelihood: 3, severity: 3, owner: 'Founders / sales', trigger: 'Client schedule change > 4 weeks' },
];
