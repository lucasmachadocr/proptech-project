// Brief reader: turns the request an HR manager writes in plain English into the fields of a brief.
//
// Two engines, always labelled in the UI:
//  1. "model": an open-source language model (DistilBERT fine-tuned on SQuAD, about 65 MB, Apache-2.0)
//     that runs in the visitor's browser through transformers.js. We ask it one question per field
//     ("How many people need housing?") and it answers with a span of the text and a confidence score.
//     No API key, no server: the text never leaves the device.
//  2. "rules": a deterministic parser. It is the fallback when the model cannot be downloaded
//     (offline, blocked network) or when the model's answer cannot be turned into a valid value.
//
// The same normalisers ("twenty" → 20, "six months" → 6, "12 January 2027" → 2027-01-12) are applied
// to both, so a field is only accepted when it is a valid value for the brief.
import { FACTS } from '../data/facts';
import { SITES } from '../data/sites';

export const MODEL_ID = 'Xenova/distilbert-base-cased-distilled-squad';
export const MODEL_LABEL = 'DistilBERT (SQuAD), open source, in the browser';
/** Below this confidence the model's answer is not trusted and the rule parser decides. */
export const MIN_SCORE = 0.15;

export type FieldKey = 'people' | 'city' | 'start' | 'months' | 'maxCommuteMin' | 'budget';
export type Engine = 'model' | 'rules';

export interface FieldReading {
  key: FieldKey;
  label: string;
  /** Normalised value: number, ISO date or city name. null = not found. */
  value: number | string | null;
  /** The words of the request the value was read from. */
  evidence: string;
  /** Model confidence 0–1 (rules: 1 when found). */
  score: number;
  by: Engine;
}

export interface BriefReading {
  engine: Engine;
  fields: FieldReading[];
  ms: number;
  /** Why the model was not used, when engine = 'rules'. */
  note?: string;
}

/** Minimal shape of the transformers.js question-answering pipeline (lets tests pass a stub). */
export type QaFn = (question: string, context: string) => Promise<{ answer: string; score: number }>;

export const QUESTIONS: Record<FieldKey, { label: string; question: string }> = {
  people: { label: 'People to house', question: 'How many people need housing?' },
  city: { label: 'City', question: 'In which city is the project site?' },
  start: { label: 'Start date', question: 'On what date does the stay start?' },
  months: { label: 'Length of stay', question: 'For how long do they stay?' },
  maxCommuteMin: { label: 'Maximum commute', question: 'What is the maximum travel time to the site?' },
  budget: { label: 'Budget per apartment', question: 'What is the budget per apartment per month?' },
};
const KEYS = Object.keys(QUESTIONS) as FieldKey[];

export const SAMPLE_REQUEST =
  'Hi, we have been awarded the fit-out of a data-centre campus in San Fernando de Henares, Madrid. ' +
  'We need to house twenty commissioning engineers from 1 December 2026 for six months, one apartment each. ' +
  'Nobody should travel more than 35 minutes to the site, and our budget is €2,200 per apartment per month. ' +
  'The dates may still move by two weeks. Thanks, Marta (Head of Mobility, Iberia Grid Engineering)';

// ── Normalisers ───────────────────────────────────────────────────────────
const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};
// Longest words first, so "seventeen" is not read as "seven".
const NUM_WORD = Object.keys(WORDS).sort((a, b) => b.length - a.length).join('|');
const NUM = `(?:\\d[\\d.,]*|\\b(?:${NUM_WORD})(?:[- ](?:${NUM_WORD}))?\\b)`;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_RE = MONTHS.map((m) => `${m}|${m.slice(0, 3)}`).join('|');

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** "twenty", "twenty-three", "20", "2,200", "2.200", "2k" → number. */
export function toNumber(raw: string): number | null {
  // The model's tokenizer adds spaces: "Twenty - five", "2. 5k". Join them back first.
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/(\d)([.,])\s+(\d)/g, '$1$2$3');
  const k = s.match(/(\d+(?:[.,]\d+)?)\s*k\b/);
  if (k) return Math.round(Number(k[1].replace(',', '.')) * 1000);
  const d = s.match(/\d[\d.,]*/);
  if (d) {
    let t = d[0].replace(/[.,]$/, '');
    // A dot or comma followed by exactly three digits is a thousands separator (2,200 or 2.200).
    t = t.replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.');
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  const w = s.match(new RegExp(`\\b(${NUM_WORD})(?:[- ](${NUM_WORD}))?\\b`));
  if (!w) return null;
  const a = WORDS[w[1]];
  const b = w[2] ? WORDS[w[2]] : 0;
  return a >= 20 && b > 0 && b < 10 ? a + b : a;
}

export function toPeople(raw: string): number | null {
  const n = toNumber(raw);
  return n !== null && Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
}

/** "six months", "26 weeks", "half a year", "a year" → whole months (2–12 in the MVP). */
export function toMonths(raw: string): number | null {
  const s = raw.toLowerCase();
  let m: number | null = null;
  if (/half a year/.test(s)) m = 6;
  else if (/\b(a|one) year\b/.test(s)) m = 12;
  else {
    const n = toNumber(s);
    if (n === null) return null;
    if (/week/.test(s)) m = Math.round(n / 4.345);
    else if (/year/.test(s)) m = n * 12;
    else if (/month/.test(s) || /^\s*\S+\s*$/.test(s)) m = n;
  }
  return m !== null && m >= 2 && m <= 12 ? Math.round(m) : null;
}

/** "12 January 2027", "January 12th", "2027-01-12", "12/01/2027" (day first) → ISO date. */
export function toIsoDate(raw: string, today = new Date()): string | null {
  const s = raw.toLowerCase();
  const iso = s.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  const out = (y: number, mo: number, d: number) => {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  if (iso) return out(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dmy = s.match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/);
  if (dmy) return out(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  const a = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?: of)? (${MONTH_RE})\\w*,?(?: (20\\d{2}))?`));
  const b = s.match(new RegExp(`\\b(${MONTH_RE})\\w* (\\d{1,2})(?:st|nd|rd|th)?,?(?: (20\\d{2}))?`));
  const pick = a ? { d: a[1], m: a[2], y: a[3] } : b ? { d: b[2], m: b[1], y: b[3] } : null;
  if (!pick) return null;
  const mo = MONTHS.findIndex((x) => x.startsWith(pick.m.slice(0, 3))) + 1;
  let y = pick.y ? Number(pick.y) : today.getFullYear();
  // No year written: take the next occurrence of that date.
  if (!pick.y && new Date(y, mo - 1, Number(pick.d)) < today) y += 1;
  return out(y, mo, Number(pick.d));
}

/** City of the MVP named in the text, by city, site town or site name. */
export function toCity(raw: string): string | null {
  const s = strip(raw);
  for (const c of FACTS.cities) if (s.includes(strip(c))) return c;
  for (const site of SITES) if (s.includes(strip(site.town))) return site.city;
  return null;
}

export function toMinutes(raw: string): number | null {
  const s = raw.toLowerCase();
  if (/half an hour/.test(s)) return 30;
  // A commute needs a time unit: "10 weeks", "6 months" or "18 workers" are not commutes.
  if (!/\b(min|mins|minutes?|hours?|hr|hrs|h)\b/.test(s)) return null;
  const n = toNumber(s);
  if (n === null) return null;
  const min = /hour/.test(s) && !/min/.test(s) ? n * 60 : n;
  return min >= 5 && min <= 90 ? Math.round(min) : null;
}

export function toBudget(raw: string): number | null {
  const n = toNumber(raw);
  return n !== null && n >= 500 && n <= 6000 ? Math.round(n) : null;
}

const NORMALISE: Record<FieldKey, (raw: string) => number | string | null> = {
  people: toPeople,
  city: toCity,
  start: (r) => toIsoDate(r),
  months: toMonths,
  maxCommuteMin: toMinutes,
  budget: toBudget,
};

// ── Engine 2: rules ───────────────────────────────────────────────────────
const PEOPLE_NOUNS = 'engineers?|technicians?|people|persons|employees|staff|workers|colleagues|specialists?|managers?|consultants?|auditors?|analysts?|developers?|experts?|inspectors?|operators?';
const DATE = `(?:\\d{1,2}(?:st|nd|rd|th)?(?: of)? (?:${MONTH_RE})\\w*|(?:${MONTH_RE})\\w* \\d{1,2}(?:st|nd|rd|th)?)(?:,? 20\\d{2})?|20\\d{2}-\\d{2}-\\d{2}|\\d{1,2}[/.]\\d{1,2}[/.]20\\d{2}`;
const RULES: Record<FieldKey, RegExp[]> = {
  people: [
    new RegExp(`(${NUM})\\s+(?:[a-z-]+\\s+){0,3}(?:${PEOPLE_NOUNS})\\b`, 'gi'),
    new RegExp(`(?:team|crew|group) of (${NUM})`, 'gi'),
    // Policy is one apartment per person, so "10 apartments" also gives the head-count.
    new RegExp(`(${NUM})\\s+(?:furnished\\s+)?(?:apartments|flats|units)\\b`, 'gi'),
  ],
  city: [/[^.]*\b(?:in|at|near|to)\b[^.]*/i],
  start: [new RegExp(`(?:from|starting|start(?:s|ing)? on|as of|arriv\\w+ on|on)\\s+(?:the\\s+)?(${DATE})`, 'gi'), new RegExp(`(${DATE})`, 'gi')],
  months: [new RegExp(`for\\s+(?:about\\s+|around\\s+)?(half a year|a year|${NUM}\\s+(?:months?|weeks?|years?))`, 'gi'), new RegExp(`(${NUM}[- ](?:months?|weeks?))`, 'gi')],
  maxCommuteMin: [new RegExp(`(half an hour|${NUM}\\s*(?:minutes?|mins?|min\\b|hours?))`, 'gi')],
  budget: [
    new RegExp(`(?:budget|cap|up to|maximum|max\\.?)[^.€\\d]*(€\\s*${NUM}k?|${NUM}k?\\s*(?:€|eur\\w*))`, 'gi'),
    new RegExp(`(€\\s*${NUM}k?|${NUM}k?\\s*(?:€|euros?))`, 'gi'),
    // "budget 2100": a number right after the word budget, without a currency sign.
    new RegExp(`budget\\D{0,20}?(${NUM}k?)`, 'gi'),
  ],
};

function ruleField(key: FieldKey, text: string): FieldReading {
  const base = { key, label: QUESTIONS[key].label, by: 'rules' as const };
  if (key === 'city') {
    const value = toCity(text);
    if (!value) return { ...base, value: null, evidence: '', score: 0 };
    const hit = [value, ...SITES.filter((s) => s.city === value).map((s) => s.town)].find((n) => strip(text).includes(strip(n))) ?? value;
    return { ...base, value, evidence: hit, score: 1 };
  }
  for (const re of RULES[key]) {
    // Try every match in order: the first one that gives a valid value wins.
    const all = re.global ? [...text.matchAll(re)] : [text.match(re)];
    for (const m of all) {
      const raw = m?.[1] ?? '';
      const value = raw ? NORMALISE[key](raw) : null;
      if (value !== null) return { ...base, value, evidence: raw.trim(), score: 1 };
    }
  }
  if (key === 'months') {
    // "from 5 Jan 2027 till 5 July 2027": the length is the gap between the two dates.
    const range = text.match(new RegExp(`(${DATE})\\s*(?:to|till|until|through|-|–)\\s*(${DATE})`, 'i'));
    const a = range && toIsoDate(range[1]);
    const b = range && toIsoDate(range[2]);
    if (a && b) {
      const m = Math.round((Date.parse(b) - Date.parse(a)) / (30.44 * 864e5));
      if (m >= 2 && m <= 12) return { ...base, value: m, evidence: range![0].trim(), score: 1 };
    }
  }
  return { ...base, value: null, evidence: '', score: 0 };
}

export function readBriefWithRules(text: string, note?: string): BriefReading {
  const t0 = Date.now();
  return { engine: 'rules', fields: KEYS.map((k) => ruleField(k, text)), ms: Date.now() - t0, note };
}

// ── Engine 1: language model ──────────────────────────────────────────────
/** Ask the model one question per field; keep an answer only if it is confident and valid. */
export async function readBriefWithModel(text: string, qa: QaFn): Promise<BriefReading> {
  const t0 = Date.now();
  const fields: FieldReading[] = [];
  for (const key of KEYS) {
    const { answer, score } = await qa(QUESTIONS[key].question, text);
    // For the city the model points at the place; the sentence around it may name the city itself.
    let value = score >= MIN_SCORE ? (NORMALISE[key](answer) ?? (key === 'city' ? toCity(sentenceOf(text, answer)) : null)) : null;
    // "from 5 Jan till 5 July": a date that follows "till/until/to" is the end of the stay, not its start.
    if (key === 'start' && value !== null && endsARange(text, answer)) value = null;
    fields.push(value !== null ? { key, label: QUESTIONS[key].label, value, evidence: answer.trim(), score, by: 'model' } : ruleField(key, text));
  }
  return { engine: 'model', fields, ms: Date.now() - t0 };
}

function endsARange(text: string, span: string) {
  const i = text.indexOf(span.trim());
  return i > 0 && /(?:till|until|to|through|-|–)\s*$/i.test(text.slice(Math.max(0, i - 10), i));
}

function sentenceOf(text: string, span: string) {
  return text.split(/(?<=[.!?])\s+/).find((s) => s.includes(span)) ?? span;
}

// ── Loading the model in the browser ──────────────────────────────────────
export interface LoadProgress {
  /** 0–1 while the weights download; 1 once ready. */
  ratio: number;
}

let cached: Promise<QaFn> | null = null;

/** Downloads the model once (the browser caches it) and returns the question-answering function. */
export function loadBriefModel(onProgress?: (p: LoadProgress) => void): Promise<QaFn> {
  cached ??= (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    // Keep the weights in the browser's Cache Storage: the next visit loads them from disk, offline too.
    env.useBrowserCache = true;
    env.allowLocalModels = false;
    const qa = await pipeline('question-answering', MODEL_ID, {
      dtype: 'q8',
      progress_callback: (e: { status?: string; file?: string; progress?: number }) => {
        if (e.status === 'progress' && e.file?.endsWith('.onnx') && typeof e.progress === 'number') onProgress?.({ ratio: e.progress / 100 });
      },
    });
    onProgress?.({ ratio: 1 });
    return async (question: string, context: string) => {
      const r = await qa(question, context);
      const one = Array.isArray(r) ? r[0] : r;
      return { answer: one.answer, score: one.score };
    };
  })();
  // A failed download must not be cached: the next click tries again.
  cached.catch(() => (cached = null));
  return cached;
}

/** Model first; rule parser if the model cannot be loaded. The result says which engine answered. */
export async function readBrief(text: string, onProgress?: (p: LoadProgress) => void): Promise<BriefReading> {
  try {
    const qa = await loadBriefModel(onProgress);
    return await readBriefWithModel(text, qa);
  } catch {
    return readBriefWithRules(text, 'The language model could not be downloaded, so the rule-based parser read the request.');
  }
}
