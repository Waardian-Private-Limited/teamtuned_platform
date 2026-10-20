import { daysBetween, formatDate } from '@/lib/datetime';

/** Last day of a contract of `months` months starting on `start` (same rule as the server). */
export function contractEndFor(start: string, months: number): string | null {
  if (!start || !Number.isInteger(months) || months < 1) return null;
  const d = new Date(`${start}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Whole months from `start` to `end` when the term is exactly that long, else null. */
export function contractMonthsFor(start: string, end: string): number | null {
  if (!start || !end || end <= start) return null;
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  const guess = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()) + 1;
  for (const m of [guess - 1, guess]) {
    if (m >= 1 && contractEndFor(start, m) === end) return m;
  }
  return null;
}

/** "Ends in 23 days", "Ends today" or "Ended on 12 Nov 2026". */
export function contractCountdown(end: string, today: string): string {
  const days = daysBetween(today, end);
  if (days < 0) return `Ended on ${formatDate(end, 'medium')}`;
  if (days === 0) return 'Ends today';
  return `Ends in ${days} day${days === 1 ? '' : 's'}`;
}

export const CONTRACT_SOON_DAYS = 30;

/** List-row note, only when the contract ends within the next 30 days or already ended: "Contract ends 12 Nov". */
export function contractNote(end: string | null, today: string): string | null {
  if (!end) return null;
  const days = daysBetween(today, end);
  if (days > CONTRACT_SOON_DAYS) return null;
  return `${days < 0 ? 'Contract ended' : 'Contract ends'} ${formatDate(end, 'short')}`;
}
