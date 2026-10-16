import type { Company } from '../types';

// Fictional client companies (demo data).
export const COMPANIES: Company[] = [
  {
    id: 'C01',
    name: 'Cierzo Data Centres',
    legalName: 'Cierzo Data Centres Iberia S.L.',
    cif: 'B88123456',
    kind: 'Data-centre owner',
    siteIds: ['S-MSFT', 'S-AWS'],
    contact: 'Marta Lafuente · Head of Mobility',
  },
  {
    id: 'C02',
    name: 'Ebro Cell Manufacturing JV',
    legalName: 'Ebro Cell Manufacturing JV S.L.',
    cif: 'B99654321',
    kind: 'Gigafactory joint venture',
    siteIds: ['S-GIGA'],
    contact: 'Thomas Weber · HR Projects',
  },
];

export const companyById = (id: string) => COMPANIES.find((c) => c.id === id)!;
