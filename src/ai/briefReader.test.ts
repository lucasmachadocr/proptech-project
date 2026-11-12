import { describe, expect, it } from 'vitest';
import { MIN_SCORE, QUESTIONS, SAMPLE_REQUEST, readBriefWithModel, readBriefWithRules, toBudget, toCity, toIsoDate, toMinutes, toMonths, toNumber, toPeople, type QaFn } from './briefReader';

const byKey = (r: { fields: { key: string; value: unknown; by: string }[] }) => Object.fromEntries(r.fields.map((f) => [f.key, f.value]));

describe('normalisers', () => {
  it('numbers written as digits or words', () => {
    expect(toNumber('twenty')).toBe(20);
    expect(toNumber('twenty-three engineers')).toBe(23);
    expect(toNumber('€2,200')).toBe(2200);
    expect(toNumber('2.200 €')).toBe(2200);
    expect(toNumber('2k')).toBe(2000);
    expect(toPeople('150 people')).toBeNull();
  });
  it('stay length', () => {
    expect(toMonths('six months')).toBe(6);
    expect(toMonths('26 weeks')).toBe(6);
    expect(toMonths('half a year')).toBe(6);
    expect(toMonths('18 months')).toBeNull(); // outside the 2–12 month product
  });
  it('dates', () => {
    expect(toIsoDate('1 December 2026')).toBe('2026-12-01');
    expect(toIsoDate('January 12th, 2027')).toBe('2027-01-12');
    expect(toIsoDate('12/01/2027')).toBe('2027-01-12');
    expect(toIsoDate('3 March', new Date(2026, 10, 12))).toBe('2027-03-03');
  });
  it('city, commute and budget', () => {
    expect(toCity('a campus in San Fernando de Henares')).toBe('Madrid');
    expect(toCity('Malaga TechPark')).toBe('Málaga');
    expect(toCity('Lisbon')).toBeNull();
    expect(toMinutes('35 minutes')).toBe(35);
    expect(toMinutes('half an hour')).toBe(30);
    expect(toBudget('€2,200 per apartment')).toBe(2200);
  });
});

describe('rule-based parser (fallback engine)', () => {
  it('reads the sample request', () => {
    const r = readBriefWithRules(SAMPLE_REQUEST);
    expect(r.engine).toBe('rules');
    expect(byKey(r)).toEqual({ people: 20, city: 'Madrid', start: '2026-12-01', months: 6, maxCommuteMin: 35, budget: 2200 });
  });
  it('leaves a field empty when the request does not say it', () => {
    const r = readBriefWithRules('We need flats for 8 technicians in Zaragoza.');
    expect(byKey(r)).toMatchObject({ people: 8, city: 'Zaragoza', start: null, months: null, budget: null });
  });
});

describe('language-model reader', () => {
  const answers: Record<string, { answer: string; score: number }> = {
    [QUESTIONS.people.question]: { answer: 'twenty commissioning engineers', score: 0.71 },
    [QUESTIONS.city.question]: { answer: 'San Fernando de Henares, Madrid', score: 0.64 },
    [QUESTIONS.start.question]: { answer: '1 December 2026', score: 0.83 },
    [QUESTIONS.months.question]: { answer: 'six months', score: 0.9 },
    [QUESTIONS.maxCommuteMin.question]: { answer: '35 minutes', score: 0.55 },
    [QUESTIONS.budget.question]: { answer: '€2,200', score: 0.62 },
  };
  const stub = (over: Record<string, { answer: string; score: number }> = {}): QaFn => async (q) => ({ ...answers, ...over })[q];

  it('turns the model answers into brief fields and keeps the evidence and score', async () => {
    const r = await readBriefWithModel(SAMPLE_REQUEST, stub());
    expect(r.engine).toBe('model');
    expect(byKey(r)).toEqual({ people: 20, city: 'Madrid', start: '2026-12-01', months: 6, maxCommuteMin: 35, budget: 2200 });
    expect(r.fields.every((f) => f.by === 'model')).toBe(true);
    expect(r.fields[0]).toMatchObject({ evidence: 'twenty commissioning engineers', score: 0.71 });
  });

  it('does not trust a low-confidence or invalid answer: the rule parser decides that field', async () => {
    const r = await readBriefWithModel(
      SAMPLE_REQUEST,
      stub({
        [QUESTIONS.budget.question]: { answer: 'two weeks', score: 0.4 }, // not a budget
        [QUESTIONS.months.question]: { answer: 'six months', score: MIN_SCORE / 2 }, // too unsure
      }),
    );
    const f = Object.fromEntries(r.fields.map((x) => [x.key, x]));
    expect(f.budget).toMatchObject({ value: 2200, by: 'rules' });
    expect(f.months).toMatchObject({ value: 6, by: 'rules' });
    expect(f.people.by).toBe('model');
  });
});
