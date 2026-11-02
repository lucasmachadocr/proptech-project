// Pricing per business plan v11 (see SETTLE_IN_FACTS.md).
//   operator commission 6% of rent (deducted from payout)
//   company markup by apartments in the mission: 5% (1–9) · 4% (10–24) · 3% (25+)
//   Flex +2% (optional): 1 pt Settle In revenue, 1 pt operator pool (not revenue)
// VAT is not shown on demo totals [CONFIRM].
import { FACTS } from '../data/facts';

const P = FACTS.pricing;
const cents = (n: number) => Math.round(n * 100) / 100;

export function markupRate(apartments: number): number {
  return P.markupTiers.find((t) => apartments >= t.min && apartments <= t.max)!.rate;
}

export function tierLabel(apartments: number): string {
  const t = P.markupTiers.find((x) => apartments >= x.min && apartments <= x.max)!;
  return t.max === Infinity ? `${t.min}+ apartments` : `${t.min}–${t.max} apartments`;
}

export interface CompanyInvoice {
  rent: number;
  markupRate: number;
  markup: number;
  flex: number; // 0 when Flex is off
  total: number; // what the company pays (VAT not shown)
}

export function companyInvoice(rent: number, apartments: number, withFlex = true): CompanyInvoice {
  const rate = markupRate(apartments);
  const markup = cents(rent * rate);
  const flex = withFlex ? cents(rent * P.flex) : 0;
  return { rent: cents(rent), markupRate: rate, markup, flex, total: cents(rent + markup + flex) };
}

export interface Split {
  companyPays: number;
  operatorCommission: number; // 6% of rent
  markup: number;
  flexRevenue: number; // 1 pt
  flexPool: number; // 1 pt → operators, NOT revenue
  revenue: number; // commission + markup + flexRevenue
  operatorPayout: number; // rent − 6% (Flex pool paid on top)
}

export function moneySplit(rent: number, apartments: number, withFlex = true): Split {
  const inv = companyInvoice(rent, apartments, withFlex);
  const operatorCommission = cents(rent * P.operatorCommission);
  const flexRevenue = withFlex ? cents(rent * P.flexRevenue) : 0;
  const flexPool = withFlex ? cents(rent * P.flexPool) : 0;
  return {
    companyPays: inv.total,
    operatorCommission,
    markup: inv.markup,
    flexRevenue,
    flexPool,
    revenue: cents(operatorCommission + inv.markup + flexRevenue),
    operatorPayout: cents(rent - operatorCommission),
  };
}

/** Company price per apartment-month for a mission: (rent + markup + Flex) ÷ apartment-months, rounded to €. */
export function missionPricePerApartmentMonth(totalRent: number, apartments: number, apartmentMonths: number, withFlex = true): number {
  return Math.round(companyInvoice(totalRent, apartments, withFlex).total / apartmentMonths);
}

/** Re-plan cost shown before approval: new people are priced at the mission's average apartment-month. */
export function replanCost(pricePerApartmentMonth: number, people: number, months: number): number {
  return people * pricePerApartmentMonth * months;
}

export const operatorPayout = (rent: number) => cents(rent * (1 - P.operatorCommission));
export const directCost = (apartmentMonths: number) => apartmentMonths * FACTS.demo.directCostPerApartmentMonth;
