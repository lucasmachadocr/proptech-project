import { describe, expect, it } from 'vitest';
import { checkLease, type LeaseDraft } from './compliance';

const ok: LeaseDraft = {
  unitId: 'U01',
  tenantCompanyId: 'C01',
  occupants: ['Rui Carvalho'],
  start: '2026-12-01',
  end: '2027-05-31',
  cause: 'Temporary work assignment of the occupant to the commissioning project at the Villanueva data-centre campus.',
  assignmentLetter: true,
  guaranteeMonths: 1,
  priorConsecutiveLeases: 0,
};
const rule = (d: LeaseDraft, id: string) => checkLease(d).rules.find((r) => r.id === id)!.light;

describe('compliance (RDL 29/2026)', () => {
  it('a complete 6-month lease is green and can be signed', () => {
    const r = checkLease(ok);
    expect(r.overall).toBe('green');
    expect(r.canSign).toBe(true);
  });

  it('duration boundaries: 31 days red, 32 days ok; 12 months ok, beyond red', () => {
    expect(rule({ ...ok, end: '2026-12-31' }, 'duration')).toBe('red'); // 31 days
    expect(rule({ ...ok, end: '2027-01-01' }, 'duration')).toBe('green'); // 32 days
    expect(rule({ ...ok, end: '2027-11-30' }, 'duration')).toBe('amber'); // exactly 12 months
    expect(rule({ ...ok, end: '2027-12-01' }, 'duration')).toBe('red'); // 12 months + 1 day
    expect(rule({ ...ok, end: '2027-12-31' }, 'duration')).toBe('red'); // 13 months
  });

  it('missing cause or assignment letter is red', () => {
    expect(rule({ ...ok, cause: '' }, 'cause')).toBe('red');
    expect(rule({ ...ok, cause: 'Work' }, 'cause')).toBe('amber');
    expect(rule({ ...ok, assignmentLetter: false }, 'letter')).toBe('red');
  });

  it('third consecutive lease is red, second is amber', () => {
    expect(rule({ ...ok, priorConsecutiveLeases: 1 }, 'consecutive')).toBe('amber');
    expect(rule({ ...ok, priorConsecutiveLeases: 2 }, 'consecutive')).toBe('red');
  });

  it('additional guarantee above 1 month is red', () => {
    expect(rule({ ...ok, guaranteeMonths: 2 }, 'guarantee')).toBe('red');
  });

  it('any red blocks signing', () => {
    const r = checkLease({ ...ok, assignmentLetter: false });
    expect(r.overall).toBe('red');
    expect(r.canSign).toBe(false);
  });
});
