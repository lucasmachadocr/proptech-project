// Single source of numbers for the MVP. Mirrors SETTLE_IN_FACTS.md (checked by facts.test.ts).
// `confirm: true` → not in the v11 summary; the UI marks it "to confirm".

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
  kpi: {
    briefToPlanHours: 48,
    opsHoursPerMission: 39,
    opsHoursManual: { value: 182, confirm: true },
    apartmentsPerAgent: 150,
    breakEvenApartments: { value: 235, confirm: true },
  },
  lease: { minDays: 31, maxMonths: 12, month6Exit: true },
  mvpTool: 'Claude Code (paid)',
} as const;

export type CityName = (typeof FACTS.cities)[number];
