// Single source of numbers for the MVP. Mirrors SETTLE_IN_FACTS.md (checked by facts.test.ts).

export const FACTS = {
  brand: {
    tagline: 'Housing that follows your project',
    terracotta: '#C4573D',
    cream: '#F7EEE7',
    ink: '#2A2320',
  },
  cities: ['Madrid', 'Barcelona', 'Valencia', 'Málaga', 'Zaragoza'] as const,
  pricing: {
    operatorCommission: 0.06,
    markupTiers: [
      { min: 1, max: 9, rate: 0.05 },
      { min: 10, max: 24, rate: 0.04 },
      { min: 25, max: Infinity, rate: 0.03 },
    ],
    flex: 0.02,
    flexRevenue: 0.01,
    flexPool: 0.01,
  },
  terms: {
    billing: 'SEPA B2B direct debit, monthly in advance',
    payout: 'At check-in, then monthly, net of 6%',
  },
  demo: {
    city: 'Madrid',
    people: 20,
    months: 6,
    apartmentMonths: 120,
    rentPerApartmentMonth: 1879.2,
    rentTotal: 225504,
    markupRate: 0.04,
    companyPays: 239034,
    revenue: 24805,
    flexPool: 2255,
    directCostPerApartmentMonth: 36,
    directCost: 4320,
  },
  options: {
    A: { label: 'Lowest cost', pricePerApartmentMonth: 1935, avgCommuteMin: 31 },
    B: { label: 'Balanced', pricePerApartmentMonth: 1992, avgCommuteMin: 22 },
    C: { label: 'Closest', pricePerApartmentMonth: 2140, avgCommuteMin: 12 },
  },
  replan: { people: 3, fromMonth: 3, months: 4, pricePerApartmentMonth: 1992, delta: 23904, apartmentsAfter: 23, moved: 0 },
  kpi: {
    briefToPlanHours: 48,
    opsHoursPerMission: 38.5,
    opsHoursManual: 182,
    opsHoursSaving: 0.79, // 1 − 38.5 / 182
    apartmentsPerAgent: 150,
    breakEvenApartments: 235, // occupied apartments
  },
  lease: { minDays: 31, maxMonths: 12, tenantExitAfterMonths: 1, exitNoticeDays: 10 },
  vatNote: 'VAT excluded on demo totals',
  mvpTool: 'Claude Code (paid)',
} as const;

export type CityName = (typeof FACTS.cities)[number];
