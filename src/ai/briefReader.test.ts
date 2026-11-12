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

// 15 requests written the way HR people really write them. `null` = the request does not say it:
// the reader must leave the field empty ("missing — please fill"), never invent a value.
const CASES: { text: string; want: Record<string, unknown> }[] = [
  {
    text: 'We need housing for 12 technicians in Valencia starting 15 January 2027 for 4 months. Max 25 minutes commute, budget 1,600 EUR per flat.',
    want: { people: 12, city: 'Valencia', start: '2027-01-15', months: 4, maxCommuteMin: 25, budget: 1600 },
  },
  {
    text: 'Team of eight engineers, Zaragoza, from 01/03/2027, 3 months. No budget yet.',
    want: { people: 8, city: 'Zaragoza', start: '2027-03-01', months: 3, maxCommuteMin: null, budget: null },
  },
  {
    text: 'Could you find apartments for fifteen people near Barcelona? They arrive on March 2nd 2027 and stay for 10 weeks.',
    want: { people: 15, city: 'Barcelona', start: '2027-03-02', months: 2, maxCommuteMin: null, budget: null },
  },
  {
    text: 'Hola! 6 specialists to Málaga TechPark, 2027-02-01, for half a year, up to €1.8k per month, commute under 40 min.',
    want: { people: 6, city: 'Málaga', start: '2027-02-01', months: 6, maxCommuteMin: 40, budget: 1800 },
  },
  {
    text: 'Twenty-five engineers in Madrid for 1 year from 1st of April 2027, max one hour travel, €2,000/month each.',
    want: { people: 25, city: 'Madrid', start: '2027-04-01', months: 12, maxCommuteMin: 60, budget: 2000 },
  },
  {
    text: 'We are sending 3 managers to Zaragoza on 10.01.2027 for 2 months.',
    want: { people: 3, city: 'Zaragoza', start: '2027-01-10', months: 2, maxCommuteMin: null, budget: null },
  },
  {
    text: 'Need 4 flats for our auditors in Barcelona, 3 weeks in January.',
    want: { people: 4, city: 'Barcelona', start: null, months: null, maxCommuteMin: null, budget: null },
  },
  {
    text: 'Project at the Valencia port: 18 workers, starting next spring.',
    want: { people: 18, city: 'Valencia', start: null, months: null, maxCommuteMin: null, budget: null },
  },
  {
    text: 'We would like 10 apartments in Madrid (San Fernando) for our team from 5 Jan 2027 till 5 July 2027.',
    want: { people: 10, city: 'Madrid', start: '2027-01-05', months: 6, maxCommuteMin: null, budget: null },
  },
  {
    text: 'Lisbon project, 20 engineers, 6 months.',
    want: { people: 20, city: null, start: null, months: 6, maxCommuteMin: null, budget: null },
  },
  {
    text: 'Budget is 1900 euros per apartment monthly; 9 technicians; Zaragoza Plaza logistics hub; from 1 Feb 2027; for 5 months; 20 min max commute.',
    want: { people: 9, city: 'Zaragoza', start: '2027-02-01', months: 5, maxCommuteMin: 20, budget: 1900 },
  },
  {
    text: 'Hi team, could you house a crew of thirty in Málaga starting 2 March 2027 for nine months? Ideally less than half an hour from the site.',
    want: { people: 30, city: 'Málaga', start: '2027-03-02', months: 9, maxCommuteMin: 30, budget: null },
  },
  {
    text: 'We need 7 engineers housed in Barcelona from December 1, 2026 for 6 months; budget around 2.5k € per unit.',
    want: { people: 7, city: 'Barcelona', start: '2026-12-01', months: 6, maxCommuteMin: null, budget: 2500 },
  },
  {
    text: 'need housing for 14 engineers madrid 3 months from 2027-01-10 commute 30 mins budget 2100',
    want: { people: 14, city: 'Madrid', start: '2027-01-10', months: 3, maxCommuteMin: 30, budget: 2100 },
  },
  {
    text: 'A group of seventeen engineers goes to Madrid from 1 March 2027 for 8 weeks, budget €1,500 max per flat, 45 minutes maximum.',
    want: { people: 17, city: 'Madrid', start: '2027-03-01', months: 2, maxCommuteMin: 45, budget: 1500 },
  },
];

describe('15 free-text requests (rule parser)', () => {
  it.each(CASES.map((c, i) => [i + 1, c] as const))('request %i', (_, c) => {
    expect(byKey(readBriefWithRules(c.text))).toEqual(c.want);
  });
});

describe('never invents a value', () => {
  it('model answers that are unsure or invalid, with nothing for the rules to find, stay empty', async () => {
    const text = 'Lisbon project, 20 engineers.';
    const r = await readBriefWithModel(text, async () => ({ answer: 'Lisbon project', score: 0.9 }));
    const f = Object.fromEntries(r.fields.map((x) => [x.key, x]));
    expect(f.city.value).toBeNull();
    expect(f.start.value).toBeNull();
    expect(f.budget.value).toBeNull();
    expect(f.people.value).toBe(20);
  });
});

// Answers the real DistilBERT gave in the browser on the 15 requests (12 Nov 2026), replayed here.
describe('real model mistakes are caught by the validators', () => {
  const real = (answers: Partial<Record<keyof typeof QUESTIONS, [string, number]>>): QaFn => async (q) => {
    const key = (Object.keys(QUESTIONS) as (keyof typeof QUESTIONS)[]).find((k) => QUESTIONS[k].question === q)!;
    const a = answers[key];
    return a ? { answer: a[0], score: a[1] } : { answer: '', score: 0 };
  };
  it('a stay length or a head-count is not a commute', async () => {
    const r = await readBriefWithModel('Lisbon project, 20 engineers, 6 months.', real({ maxCommuteMin: ['6 months', 0.97] }));
    expect(byKey(r).maxCommuteMin).toBeNull();
    expect(toMinutes('18 workers')).toBeNull();
    expect(toMinutes('10 weeks')).toBeNull();
  });
  it('tokenizer spaces are joined back', () => {
    expect(toPeople('Twenty - five')).toBe(25);
    expect(toBudget('2. 5k € per unit')).toBe(2500);
  });
  it('the end of a date range is not the start date', async () => {
    const text = 'We would like 10 apartments in Madrid (San Fernando) for our team from 5 Jan 2027 till 5 July 2027.';
    const r = await readBriefWithModel(text, real({ start: ['5 July 2027', 0.61] }));
    expect(r.fields.find((f) => f.key === 'start')).toMatchObject({ value: '2027-01-05', by: 'rules' });
  });
});
