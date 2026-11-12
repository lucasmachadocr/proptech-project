// Single source of numbers for the MVP. Mirrors SETTLE_IN_FACTS.md (checked by facts.test.ts).
// Financial figures follow the financial model (Excel, version 2).

export const FACTS = {
  brand: {
    tagline: 'Housing that follows your project',
    terracotta: '#C4573D',
    cream: '#F7EEE7',
    ink: '#2A2320',
  },
  cities: ['Madrid', 'Valencia', 'Zaragoza', 'Barcelona', 'Málaga'] as const,
  // Roll-out in the business plan: Madrid first, then two cities a year.
  rollout: { Madrid: 'Launch city', Valencia: 'Year 2', Zaragoza: 'Year 2', Barcelona: 'Year 3', 'Málaga': 'Year 3' },
  launchOffer: "Launch offer: 0% markup on a company's first mission, in the first year of each city",
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
    directCostPerApartmentMonth: 32.0773,
    directCost: 3849,
    contribution: 20956, // €175 per apartment-month, 84% of revenue
  },
  options: {
    A: { label: 'Lowest cost', pricePerApartmentMonth: 1935, avgCommuteMin: 31 },
    B: { label: 'Balanced', pricePerApartmentMonth: 1992, avgCommuteMin: 22 },
    C: { label: 'Closest', pricePerApartmentMonth: 2140, avgCommuteMin: 12 },
  },
  replan: { people: 3, fromMonth: 3, months: 4, pricePerApartmentMonth: 1992, delta: 23904, apartmentsAfter: 23, moved: 0 },
  kpi: {
    briefToPlanHours: 48,
    opsHoursAtLaunch: 60, // reference mission (20 people, 6 months) in month 1
    opsHoursPerMission: 39, // same mission from month 12
    opsHoursManual: 182,
    opsHoursSaving: 0.79, // 1 − 39 / 182
    apartmentsPerAgent: 150,
    breakEvenApartments: 286, // occupied apartments needed at year-1 economics (Madrid only, pilot pricing)
    breakEvenApartmentsYear3: 284, // needed in year 3; the plan has 308 occupied, so year 3 is the first profitable year
    occupiedApartmentsYear3: 308,
  },
  lease: { minDays: 31, maxMonths: 12, tenantExitAfterMonths: 1, exitNoticeDays: 10 },
  vatNote: 'VAT excluded on demo totals',
  mvpTool: 'Claude Code (paid)',
} as const;

export type CityName = (typeof FACTS.cities)[number];
