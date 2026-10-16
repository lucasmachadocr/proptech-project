import type { Brief, Employee } from '../types';

// Demo brief: 15 people, 6 months, data-centre campus at Villanueva de Gállego.
export const DEMO_EMPLOYEES: Employee[] = [
  { id: 'E01', name: 'Lukas Brandt', role: 'engineer', title: 'Electrical commissioning engineer', household: { adults: 1, children: 0 }, nationality: 'DE' },
  { id: 'E02', name: 'Aoife Byrne', role: 'engineer', title: 'Mechanical engineer (cooling)', household: { adults: 1, children: 0 }, nationality: 'IE' },
  { id: 'E03', name: 'Marco Bellini', role: 'engineer', title: 'Controls / BMS engineer', household: { adults: 1, children: 0 }, nationality: 'IT' },
  { id: 'E04', name: 'Inés Navarro', role: 'engineer', title: 'Network engineer', household: { adults: 1, children: 0 }, nationality: 'ES' },
  { id: 'E05', name: 'Piotr Nowak', role: 'engineer', title: 'Power systems engineer', household: { adults: 2, children: 0 }, nationality: 'PL' },
  { id: 'E06', name: 'Sofia Lindqvist', role: 'engineer', title: 'QA/QC engineer', household: { adults: 1, children: 0 }, nationality: 'SE' },
  { id: 'E07', name: 'Rui Carvalho', role: 'technician', title: 'Commissioning technician', household: { adults: 1, children: 0 }, nationality: 'PT' },
  { id: 'E08', name: 'Hugo Martin', role: 'technician', title: 'HVAC technician', household: { adults: 1, children: 0 }, nationality: 'FR' },
  { id: 'E09', name: 'Daniel Ortega', role: 'technician', title: 'Fibre technician', household: { adults: 1, children: 0 }, nationality: 'ES' },
  { id: 'E10', name: 'Kasia Wiśniewska', role: 'technician', title: 'Electrical technician', household: { adults: 1, children: 0 }, nationality: 'PL' },
  { id: 'E11', name: 'Ana Ferreira', role: 'manager', title: 'Construction manager', household: { adults: 1, children: 0 }, nationality: 'PT' },
  { id: 'E12', name: 'James Whitfield', role: 'manager', title: 'Commissioning manager', household: { adults: 2, children: 0 }, nationality: 'GB' },
  { id: 'E13', name: 'Elena Ruiz', role: 'manager', title: 'HSE manager', household: { adults: 1, children: 0 }, nationality: 'ES' },
  { id: 'E14', name: 'Erik & Maja Johansson', role: 'expat', title: 'Site director (relocating family)', household: { adults: 2, children: 2 }, nationality: 'SE' },
  { id: 'E15', name: 'Ravi & Priya Menon', role: 'expat', title: 'Design authority lead (relocating family)', household: { adults: 2, children: 1 }, nationality: 'IN' },
];

export const DEMO_BRIEF: Brief = {
  id: 'BR-2026-014',
  projectName: 'Villanueva campus · commissioning wave 1',
  companyId: 'C01',
  siteId: 'S-MSFT',
  start: '2026-12-01',
  months: 6,
  maxCommuteMin: 30,
  budgetCaps: { technician: 1650, engineer: 2000, manager: 2200, expat: 2300 },
  minUnitType: { technician: 'studio', engineer: '1bed', manager: '1bed', expat: '2bed' },
  employees: DEMO_EMPLOYEES,
};

// Change request used in demo step 2: +2 months and +3 engineers.
export const EXTRA_ENGINEERS: Employee[] = [
  { id: 'E16', name: 'Nadia Haddad', role: 'engineer', title: 'Fire-safety engineer', household: { adults: 1, children: 0 }, nationality: 'FR' },
  { id: 'E17', name: 'Tomás Gil', role: 'engineer', title: 'Electrical commissioning engineer', household: { adults: 1, children: 0 }, nationality: 'ES' },
  { id: 'E18', name: 'Oliver Grant', role: 'engineer', title: 'Cooling systems engineer', household: { adults: 1, children: 0 }, nationality: 'GB' },
];

export const ROLE_LABEL = {
  engineer: 'Engineer',
  technician: 'Technician',
  manager: 'Manager',
  expat: 'Expat family',
} as const;
