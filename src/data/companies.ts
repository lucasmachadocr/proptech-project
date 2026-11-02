import type { Company } from '../types';

// Fictional client companies (demo data).
export const COMPANIES: Company[] = [
  {
    id: 'C01',
    name: 'Iberia Grid Engineering',
    legalName: 'Iberia Grid Engineering S.L.',
    cif: 'B88123456',
    kind: 'Engineering contractor',
    siteIds: ['S-MAD', 'S-ZAZ'],
    contact: 'Marta Lafuente · Head of Mobility',
  },
  {
    id: 'C02',
    name: 'Levante Battery Systems',
    legalName: 'Levante Battery Systems S.L.',
    cif: 'B99654321',
    kind: 'Industrial manufacturer',
    siteIds: ['S-VLC', 'S-BCN', 'S-AGP'],
    contact: 'Thomas Weber · HR Projects',
  },
];

export const companyById = (id: string) => COMPANIES.find((c) => c.id === id)!;
