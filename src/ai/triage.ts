// Incident triage (phase 1 "AI first line"): keyword rules → urgency, SLA and first reply.
export type Urgency = 'urgent' | 'high' | 'normal';
export type Category = 'gas' | 'electrical' | 'plumbing' | 'heating' | 'access' | 'security' | 'appliance' | 'connectivity' | 'other';

export interface Triage {
  urgency: Urgency;
  slaHours: number;
  category: Category;
  matched: string[];
  firstReply: string;
  dispatch: string;
}

export const SLA_HOURS: Record<Urgency, number> = { urgent: 2, high: 24, normal: 72 };

interface Rule {
  re: RegExp;
  urgency: Urgency;
  category: Category;
}

// Order matters: first match decides urgency; urgent rules come first.
const RULES: Rule[] = [
  { re: /\bgas\b|smell of gas|gas smell|carbon monoxide/i, urgency: 'urgent', category: 'gas' },
  { re: /fire|smoke|sparks?|electric shock|burning smell/i, urgency: 'urgent', category: 'electrical' },
  { re: /flood|burst|water everywhere|ceiling (is )?leaking/i, urgency: 'urgent', category: 'plumbing' },
  { re: /no (hot )?water|no heating|heating (is )?(not working|broken|off)/i, urgency: 'urgent', category: 'heating' },
  { re: /no (power|electricity)|power cut|blackout/i, urgency: 'urgent', category: 'electrical' },
  { re: /locked out|lost (my )?keys?|can'?t get in|cannot get in/i, urgency: 'urgent', category: 'access' },
  { re: /break-?in|burglar|intruder|door forced/i, urgency: 'urgent', category: 'security' },
  { re: /drip|dripping|light ?bulb|squeak|paint|scratch|noise|noisy neighbo/i, urgency: 'normal', category: 'other' },
  { re: /leak|toilet|blocked|clogged|drain/i, urgency: 'high', category: 'plumbing' },
  { re: /boiler|radiator|heating|cold/i, urgency: 'high', category: 'heating' },
  { re: /fridge|freezer|washing machine|washer|oven|hob|dishwasher/i, urgency: 'high', category: 'appliance' },
  { re: /wi-?fi|internet|router|connection/i, urgency: 'high', category: 'connectivity' },
  { re: /lock|key|door|window/i, urgency: 'high', category: 'access' },
];

const DISPATCH: Record<Category, string> = {
  gas: 'On-call ops manager + 112 and the gas distributor emergency line — leave the unit, do not use switches',
  electrical: 'On-call ops manager + partner electrician',
  plumbing: 'Partner plumber (Zaragoza area)',
  heating: 'Partner heating technician',
  access: 'Key-holding partner',
  security: 'On-call ops manager; police 091 if in danger',
  appliance: 'Provider maintenance team',
  connectivity: 'Provider ISP ticket + remote router reset',
  other: 'Provider maintenance team (next visit)',
};

export function triageIssue(text: string): Triage {
  const matched: string[] = [];
  let hit: Rule | undefined;
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) {
      matched.push(m[0].toLowerCase());
      hit ??= r;
    }
  }
  const urgency = hit?.urgency ?? 'normal';
  const category = hit?.category ?? 'other';
  const slaHours = SLA_HOURS[urgency];
  const firstReply =
    urgency === 'urgent'
      ? `We've flagged this as URGENT. Someone from our team will call you within ${slaHours} hours — usually much sooner.${category === 'gas' ? ' Please open the windows, leave the unit and do not use any switches.' : ''}`
      : urgency === 'high'
        ? `Thanks — we've logged this as high priority and will fix it within ${slaHours} hours. You'll get the technician's visit time in the app.`
        : `Thanks — logged. We'll schedule a fix within ${slaHours / 24} days and confirm the slot with you.`;
  return { urgency, slaHours, category, matched, firstReply, dispatch: DISPATCH[category] };
}
