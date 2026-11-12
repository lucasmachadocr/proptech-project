import { describe, expect, it } from 'vitest';
import { FACTS } from '../data/facts';
import { companyInvoice, directCost, markupRate, moneySplit, operatorPayout } from './money';

const D = FACTS.demo;

describe('pricing v11', () => {
  it('markup tiers by apartments: 5% (1–9), 4% (10–24), 3% (25+)', () => {
    expect(markupRate(1)).toBe(0.05);
    expect(markupRate(9)).toBe(0.05);
    expect(markupRate(10)).toBe(0.04);
    expect(markupRate(24)).toBe(0.04);
    expect(markupRate(25)).toBe(0.03);
    expect(markupRate(120)).toBe(0.03);
  });

  it('demo case: company pays €239,034 (rent + 4% markup + 2% Flex)', () => {
    const inv = companyInvoice(D.rentTotal, D.people, true);
    expect(inv.markupRate).toBe(D.markupRate);
    expect(Math.round(inv.total)).toBe(D.companyPays);
    expect(inv.flex).toBeCloseTo(D.rentTotal * 0.02, 2);
  });

  it('demo case: Settle In revenue €24,805; Flex pool €2,255 kept out of revenue', () => {
    const s = moneySplit(D.rentTotal, D.people, true);
    expect(Math.round(s.revenue)).toBe(D.revenue);
    expect(Math.round(s.flexPool)).toBe(D.flexPool);
    expect(s.revenue).toBeCloseTo(s.operatorCommission + s.markup + s.flexRevenue, 2);
  });

  it('money balances: company pays = operator payout + revenue + Flex pool', () => {
    const s = moneySplit(D.rentTotal, D.people, true);
    expect(s.operatorPayout + s.revenue + s.flexPool).toBeCloseTo(s.companyPays, 2);
  });

  it('operator payout is rent − 6%', () => {
    expect(operatorPayout(1000)).toBe(940);
  });

  it('direct cost about €32 per apartment-month → €3,849 for the demo', () => {
    expect(directCost(D.apartmentMonths)).toBe(D.directCost);
  });

  it('without Flex the company pays rent + markup only', () => {
    const inv = companyInvoice(10_000, 5, false);
    expect(inv.total).toBe(10_500);
  });
});
