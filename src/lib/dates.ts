import type { ISODate } from '../types';

const toDate = (iso: ISODate) => new Date(`${iso}T00:00:00Z`);
const toISO = (d: Date): ISODate => d.toISOString().slice(0, 10);

export function addMonths(iso: ISODate, months: number): ISODate {
  const d = toDate(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return toISO(d);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

/** Last night of a stay that starts on `start` and lasts `months` calendar months. */
export const stayEnd = (start: ISODate, months: number): ISODate => addDays(addMonths(start, months), -1);

/** Inclusive number of days between two dates. */
export const daysInclusive = (from: ISODate, to: ISODate): number =>
  Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000) + 1;

export function formatDate(iso: ISODate): string {
  return toDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
