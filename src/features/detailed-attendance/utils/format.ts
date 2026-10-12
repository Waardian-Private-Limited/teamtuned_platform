import { addDays, addMonths, formatClock, formatDate, formatDateTime, formatMonth, formatTime, orgDateOf } from '@/lib/datetime';

export const minutesText = (m: number) => {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h${r ? ` ${r}m` : ''}` : `${r}m`;
};

export const hoursText = (h: number) => `${h % 1 === 0 ? h : h.toFixed(1)}h`;

/** Days with at most two decimals: 18, 18.5, 18.25. */
export const daysText = (n: number) => `${Math.round(n * 100) / 100}`;

/**
 * Instants arrive in UTC and are shown in the organization's time zone, 12-hour (see lib/datetime). `tz` is the
 * response's own zone when it sends one; without it the organization's is used, never the browser's.
 */
export const timeText = (iso: string | null, tz?: string | null) => formatTime(iso, tz);

/** The calendar date of an instant in the organization's timezone (YYYY-MM-DD). */
export const localDateOf = (iso: string, tz?: string | null) => orgDateOf(iso, tz);

/** "10:30 AM" for a clock time (HH:MM) as the person reads it. */
export const clockText = (hhmm: string | null) => formatClock(hhmm);

export const dayText = (date: string) => formatDate(date, 'weekday');

export const longDayText = (date: string) => formatDate(date, 'long');

export const dateTimeText = (iso: string, tz?: string | null) => formatDateTime(iso, tz);

/** A check-in time, with "(next day)" when it falls after midnight of the work date. */
export const punchTimeText = (iso: string, workDate: string, tz?: string | null) => `${timeText(iso, tz)}${localDateOf(iso, tz) > workDate ? ' (next day)' : ''}`;

export const monthText = (month: string) => formatMonth(month);

export const shiftDate = (date: string, days: number) => addDays(date, days);

export const shiftMonth = (month: string, delta: number) => addMonths(month, delta);

export const monthOf = (date: string) => date.slice(0, 7);

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

export const unitsText = (units: number) => (units === 1 ? 'Full day' : units === 0.5 ? 'Half day' : units === 0 ? 'No pay' : `${daysText(units)} day`);

const LEAVE_PART: Record<string, string> = { full: 'full day', first_half: 'first half', second_half: 'second half', hours: 'part of the day' };

/** "Casual leave, second half, paid": the leave, the part of the day it covers, and pay. */
export const leaveText = (leave: { name: string; units: number; isPaid: boolean; session: string | null }) =>
  `${leave.name}, ${LEAVE_PART[leave.session ?? ''] ?? (leave.units === 0.5 ? 'half day' : 'full day')}, ${leave.isPaid ? 'paid' : 'unpaid'}`;
