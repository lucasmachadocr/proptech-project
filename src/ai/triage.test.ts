import { describe, expect, it } from 'vitest';
import { triageIssue } from './triage';

describe('triage', () => {
  it('gas smell is urgent with a 2 h SLA', () => {
    const t = triageIssue('There is a strong smell of gas in the kitchen');
    expect(t.urgency).toBe('urgent');
    expect(t.slaHours).toBe(2);
    expect(t.category).toBe('gas');
  });

  it('no hot water and lock-outs are urgent', () => {
    expect(triageIssue('No hot water since this morning').urgency).toBe('urgent');
    expect(triageIssue("I'm locked out of the flat").urgency).toBe('urgent');
  });

  it('a broken washing machine is high (24 h)', () => {
    const t = triageIssue('The washing machine does not spin');
    expect(t.urgency).toBe('high');
    expect(t.slaHours).toBe(24);
  });

  it('a dripping tap is normal (72 h)', () => {
    const t = triageIssue('The bathroom tap is dripping');
    expect(t.urgency).toBe('normal');
    expect(t.slaHours).toBe(72);
  });
});
