import { describe, expect, it } from 'vitest';
import { FRAUD_UNIT_ID, UNITS } from '../data/units';
import { verifyUnit } from './verify';

describe('verification', () => {
  it('rejects the fraudulent listing with all three flags', () => {
    const r = verifyUnit(UNITS.find((u) => u.id === FRAUD_UNIT_ID)!, UNITS);
    expect(r.decision).toBe('reject');
    expect(r.trustScore).toBeLessThan(50);
    expect(r.flags).toEqual(expect.arrayContaining(['Document consistency', 'Duplicate-photo scan', 'Price vs area median']));
    expect(r.priceDeviation).toBeLessThanOrEqual(-0.39);
  });

  it('approves a normal listing', () => {
    const r = verifyUnit(UNITS.find((u) => u.id === 'U23')!, UNITS.filter((u) => u.id !== FRAUD_UNIT_ID));
    expect(r.decision).toBe('approve');
    expect(r.trustScore).toBe(100);
  });

  it('every other seed listing passes', () => {
    const clean = UNITS.filter((u) => u.id !== FRAUD_UNIT_ID);
    for (const u of clean) expect(verifyUnit(u, clean).trustScore, u.id).toBe(100);
  });
});
