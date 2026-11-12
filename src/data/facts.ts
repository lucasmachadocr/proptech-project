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
    directCostPerApartmentMonth: 32.95, // financial model v3: support, ops time, verification, insurance, platform
    directCost: 3954,
    contribution: 20851, // €174 per apartment-month, 84% of revenue
    hotelPerEngineerMonth: 3408, // 3-star hotel, 15% long-stay discount
    companyPaysHotel: 408934,
    savingVsHotel: 0.42,
    hrHoursByHand: 500, // HR time to house a team of 20 the traditional way (25 h per person)
  },
  options: {
    A: { label: 'Lowest cost', pricePerApartmentMonth: 1935, avgCommuteMin: 31 },
    B: { label: 'Balanced', pricePerApartmentMonth: 1992, avgCommuteMin: 22 },
    C: { label: 'Closest', pricePerApartmentMonth: 2140, avgCommuteMin: 12 },
  },
  // Re-plan of the deck: the team drops to 15 from month 4. Five flats are released with Flex (30 days' notice).
  replan: { people: 5, fromMonth: 4, months: 3, pricePerApartmentMonth: 1992, delta: -29880, apartmentsAfter: 15, moved: 0, noticeMonthsWithoutFlex: 2, deltaWithoutFlex: -9960 },
  kpi: {
    briefToPlanHours: 48,
    opsHoursAtLaunch: 39, // reference mission (20 people, 6 months), financial model v3
    opsHoursPerMission: 39, // same mission from month 12
    opsHoursManual: 182,
    opsHoursSaving: 0.79, // 1 − 39 / 182
    apartmentsPerAgent: 300, // WhatsApp AI assistant first, one agent for exceptions (150 without AI)
    breakEvenApartments: 166, // occupied at the same time, Madrid alone (€28,500 fixed ÷ €171 contribution)
    breakEvenApartmentsYear3: 277, // with the five cities open
    occupiedApartmentsYear3: 256, // monthly average in year 3 (2029)
    breakEvenMonth: 'Aug 2029',
    occupiedByYear: [40, 119, 256, 443], // monthly average, 2027–2030
  },
  // Financial model v3 (Alix, Nov 2026).
  finance: {
    preSeed: 900000,
    cashNeedBase: 657808,
    lowestCash: 242192,
    fixedCostsPerMonth: 28500,
    year1Revenue: 70561,
    year1Ebitda: -295906,
    cac: 7240,
  },
  expansionNext: 'Europe · Year 5',
  lease: { minDays: 31, maxMonths: 12, tenantExitAfterMonths: 1, exitNoticeDays: 10 },
  vatNote: 'VAT excluded on demo totals',
  mvpTool: 'Claude Code (paid)',
} as const;

export type CityName = (typeof FACTS.cities)[number];
