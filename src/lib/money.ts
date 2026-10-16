import { COMPANY_FEE_RATE, LANDLORD_COMMISSION_RATE, VAT_RATE } from '../config';

const cents = (n: number) => Math.round(n * 100) / 100;

export interface InvoiceTotals {
  rent: number; // residential rent: VAT-exempt (art. 20.1.23 LIVA)
  fee: number; // 8% company service fee
  vatOnFee: number; // 21% VAT on the fee only
  invoicedExclVat: number; // rent + fee = what we report as GMV
  total: number; // amount the client pays
}

export function invoiceTotals(rent: number): InvoiceTotals {
  const fee = cents(rent * COMPANY_FEE_RATE);
  const vatOnFee = cents(fee * VAT_RATE);
  return { rent: cents(rent), fee, vatOnFee, invoicedExclVat: cents(rent + fee), total: cents(rent + fee + vatOnFee) };
}

export const landlordCommission = (rent: number) => cents(rent * LANDLORD_COMMISSION_RATE);
export const providerPayout = (rent: number) => cents(rent - landlordCommission(rent));

/** Platform net revenue = 10% landlord commission + 8% company fee (18% take rate). */
export const platformRevenue = (rent: number) => cents(landlordCommission(rent) + rent * COMPANY_FEE_RATE);

export interface LedgerSummary {
  collected: number; // from the client, incl. VAT on the fee
  heldAtProvider: number; // segregated at the licensed payment provider until payout
  payouts: number; // to housing providers
  revenue: number; // platform net revenue
  vatToTreasury: number;
  gmv: number;
  takeRate: number;
}

export function ledgerSummary(rent: number): LedgerSummary {
  const inv = invoiceTotals(rent);
  const payouts = providerPayout(rent);
  const revenue = platformRevenue(rent);
  return {
    collected: inv.total,
    heldAtProvider: inv.total,
    payouts,
    revenue,
    vatToTreasury: inv.vatOnFee,
    gmv: inv.invoicedExclVat,
    takeRate: revenue / rent,
  };
}
