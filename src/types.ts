export type ISODate = string; // YYYY-MM-DD

export type UnitType = 'studio' | '1bed' | '2bed' | '3bed';
export type Role = 'engineer' | 'technician' | 'manager' | 'expat';
// 'public' = a real listing from a public site, not yet checked by Settle In (live mode).
export type VerificationStatus = 'verified' | 'pending' | 'rejected' | 'public';

export interface Site {
  id: string;
  city: string;
  name: string;
  operator: string;
  town: string;
  lat: number;
  lng: number;
}

export interface Provider {
  id: string;
  name: string;
  legalName: string;
  cif: string;
  registryName: string; // name in the companies registry
  contact: string;
  city: string;
  status: VerificationStatus;
  joined: ISODate;
  kycVerified: boolean; // identity + company KYC at the payment provider
}

export interface VerificationCheck {
  id: 'kyc' | 'catastro' | 'photos' | 'price' | 'registration';
  label: string;
  pass: boolean;
  detail: string;
  weight: number;
}

export interface Unit {
  id: string;
  providerId: string;
  title: string;
  type: UnitType;
  sqm: number;
  rent: number; // € / month, furnished, bills included
  zone: string; // neighbourhood or town
  town: string;
  city: string; // demo city (one of FACTS.cities)
  address: string;
  lat: number;
  lng: number;
  amenities: string[];
  availableFrom: ISODate;
  availableTo: ISODate;
  photos: string[]; // perceptual-hash ids of listing photos
  ownerName: string; // owner declared on the listing
  catastroOwner: string; // owner per the Catastro / land registry check
  listingCif: string; // CIF declared on the listing
  registrationNo?: string; // regional rental registration, where the region requires it
  status: VerificationStatus;
  /** Live mode: where the listing was found and its public page. */
  source?: string;
  sourceUrl?: string;
  /** Live mode: the location is the neighbourhood centre, not the exact address. */
  approxLocation?: boolean;
}

export interface Household {
  adults: number;
  children: number;
}

export interface Employee {
  id: string;
  name: string;
  role: Role;
  title: string;
  household: Household;
  nationality?: string;
  start?: ISODate; // joins after the mission start (e.g. +3 engineers from month 3)
}

export interface Company {
  id: string;
  name: string;
  legalName: string;
  cif: string;
  kind: string;
  siteIds: string[];
  contact: string;
}

export interface Brief {
  id: string;
  projectName: string;
  companyId: string;
  siteId: string;
  start: ISODate;
  months: number;
  maxCommuteMin: number;
  budgetCaps: Record<Role, number>;
  minUnitType: Record<Role, UnitType>; // company housing policy per role
  employees: Employee[];
  /** Live mode: the client's own company and project site (otherwise companyId / siteId). */
  companyName?: string;
  site?: Site;
}

export interface Assignment {
  employeeId: string;
  unitId: string;
  rent: number;
  commuteMin: number;
}

export interface Unassigned {
  employeeId: string;
  reason: string;
}

export interface PlanMetrics {
  monthlyRent: number;
  totalRent: number;
  avgCommuteMin: number;
  maxCommuteMin: number;
  apartments: number;
  apartmentMonths: number;
  objective: number;
  budgetUse: Record<Role, { used: number; cap: number; count: number }>;
}

export interface Tradeoff {
  kind: 'cost' | 'commute' | 'rule' | 'excluded' | 'move' | 'info';
  text: string;
}

export interface Plan {
  briefId: string;
  assignments: Assignment[];
  unassigned: Unassigned[];
  metrics: PlanMetrics;
  tradeoffs: Tradeoff[];
  computedMs: number;
  candidatesConsidered: number;
}

export type DiffKind = 'kept' | 'moved' | 'new' | 'removed';

export interface DiffRow {
  employeeId: string;
  kind: DiffKind;
  fromUnitId?: string;
  toUnitId?: string;
  reason: string;
  rentDelta: number;
}

export interface Reallocation {
  plan: Plan;
  diff: DiffRow[];
  moved: number;
  monthlyDelta: number;
  totalDelta: number;
}

export interface Risk {
  id: string;
  title: string;
  impact: string;
  mitigation: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  severity: 1 | 2 | 3 | 4 | 5;
  owner: string;
  trigger: string;
}
