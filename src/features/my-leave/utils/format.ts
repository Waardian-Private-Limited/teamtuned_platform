import { daysBetween, formatDate, formatDateTime } from '@/lib/datetime';

/** Days as people say them: "1 day", "2.5 days", "½ day". */
export function daysText(n: number | null | undefined) {
  if (n === null || n === undefined) return '–';
  const v = Math.round(Number(n) * 100) / 100;
  if (v === 0.5) return '½ day';
  return `${v} ${Math.abs(v) === 1 ? 'day' : 'days'}`;
}

/** A plain number of days, for big figures with the unit beside them. */
export const num = (n: number) => String(Math.round(n * 100) / 100);

export const dateText = (iso: string) => formatDate(iso, 'medium');

export const shortDate = (iso: string) => formatDate(iso, 'short');

export const dateTimeText = (iso: string) => formatDateTime(iso);

/** Whole days from `from` to `to` (both yyyy-MM-dd). */
export { daysBetween };

export function minutesText(m: number) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
}
