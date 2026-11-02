import type { Brief, Employee } from '../types';

// Demo case (business plan v11): 20 engineers in Madrid for 6 months, one apartment each.
const NAMES: [string, string, string][] = [
  ['Lukas Brandt', 'Electrical commissioning engineer', 'DE'],
  ['Aoife Byrne', 'Mechanical engineer (cooling)', 'IE'],
  ['Marco Bellini', 'Controls / BMS engineer', 'IT'],
  ['Inés Navarro', 'Network engineer', 'ES'],
  ['Piotr Nowak', 'Power systems engineer', 'PL'],
  ['Sofia Lindqvist', 'QA/QC engineer', 'SE'],
  ['Rui Carvalho', 'Commissioning engineer', 'PT'],
  ['Hugo Martin', 'HVAC engineer', 'FR'],
  ['Daniel Ortega', 'Fibre engineer', 'ES'],
  ['Kasia Wiśniewska', 'Electrical engineer', 'PL'],
  ['Ana Ferreira', 'Site engineer', 'PT'],
  ['James Whitfield', 'Commissioning lead', 'GB'],
  ['Elena Ruiz', 'HSE engineer', 'ES'],
  ['Erik Johansson', 'Project engineer', 'SE'],
  ['Ravi Menon', 'Design engineer', 'IN'],
  ['Chloé Dubois', 'Structural engineer', 'FR'],
  ['Mateo Sánchez', 'Civil engineer', 'ES'],
  ['Anna Keller', 'Automation engineer', 'DE'],
  ['Luca Romano', 'Mechanical engineer', 'IT'],
  ['Sara Pereira', 'Quality engineer', 'PT'],
];

export const DEMO_EMPLOYEES: Employee[] = NAMES.map(([name, title, nationality], i) => ({
  id: `E${String(i + 1).padStart(2, '0')}`,
  name,
  role: 'engineer',
  title,
  household: { adults: 1, children: 0 },
  nationality,
}));

export const DEMO_BRIEF: Brief = {
  id: 'BR-2026-020',
  projectName: 'Madrid data-centre fit-out · engineering team',
  companyId: 'C01',
  siteId: 'S-MAD',
  start: '2026-12-01',
  months: 6,
  maxCommuteMin: 35,
  budgetCaps: { technician: 2200, engineer: 2200, manager: 2400, expat: 2600 },
  minUnitType: { technician: '1bed', engineer: '1bed', manager: '1bed', expat: '2bed' },
  employees: DEMO_EMPLOYEES,
};

// Re-plan used in the demo: +3 engineers from month 3 (no extension).
export const EXTRA_ENGINEERS: Employee[] = [
  { id: 'E21', name: 'Nadia Haddad', role: 'engineer', title: 'Fire-safety engineer', household: { adults: 1, children: 0 }, nationality: 'FR' },
  { id: 'E22', name: 'Tomás Gil', role: 'engineer', title: 'Electrical engineer', household: { adults: 1, children: 0 }, nationality: 'ES' },
  { id: 'E23', name: 'Oliver Grant', role: 'engineer', title: 'Cooling systems engineer', household: { adults: 1, children: 0 }, nationality: 'GB' },
];

export const ROLE_LABEL = {
  engineer: 'Engineer',
  technician: 'Technician',
  manager: 'Manager',
  expat: 'Engineer + family',
} as const;
