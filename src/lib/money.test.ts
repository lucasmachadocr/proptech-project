import { describe, expect, it } from 'vitest';
import { invoiceTotals, ledgerSummary, platformRevenue, providerPayout } from './money';

describe('money', () => {
  it('€162,000 rent → €174,960 invoiced (excl. VAT) and €29,160 platform revenue', () => {
    const inv = invoiceTotals(162_000);
    expect(inv.fee).toBe(12_960);
    expect(inv.invoicedExclVat).toBe(174_960);
    expect(platformRevenue(162_000)).toBe(29_160);
  });

  it('VAT is 21% of the fee only (residential rent is exempt)', () => {
    const inv = invoiceTotals(27_000);
    expect(inv.fee).toBe(2_160);
    expect(inv.vatOnFee).toBe(453.6);
    expect(inv.total).toBe(29_613.6);
  });

  it('provider payout is rent minus 10%', () => {
    expect(providerPayout(1_800)).toBe(1_620);
  });

  it('ledger balances: collected = payouts + revenue + VAT', () => {
    const l = ledgerSummary(162_000);
    expect(l.gmv).toBe(174_960);
    expect(l.revenue).toBe(29_160);
    expect(l.payouts + l.revenue + l.vatToTreasury).toBeCloseTo(l.collected, 2);
    expect(l.takeRate).toBeCloseTo(0.18, 6);
  });
});
