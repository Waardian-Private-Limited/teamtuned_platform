import { useSyncExternalStore } from 'react';

/**
 * The one place dates and times are read and shown.
 * - Instants arrive from the server in UTC (ISO with Z) and are shown in the ORGANIZATION's time zone, in
 *   12-hour form ("9:05 AM"), wherever the screen is opened.
 * - Calendar dates ('yyyy-MM-dd': a leave day, a work date) are plain dates: parsed as UTC midnight and formatted
 *   with timeZone 'UTC', so they never shift a day.
 * Every function takes an optional `tz` (an IANA name, e.g. from a response's own `timezone`) that overrides the
 * organization's.
 */

export const DEFAULT_TZ = 'Asia/Kolkata';
const LOCALE = 'en-IN';
const DAY_MS = 86400000;

let orgTimezone = DEFAULT_TZ;
const listeners = new Set<() => void>();

/** Set once the session is known (and on logout, with nothing). */
export function setOrgTimezone(tz: string | null | undefined) {
  const next = isValidTz(tz) ? (tz as string) : DEFAULT_TZ;
  if (next === orgTimezone) return;
  orgTimezone = next;
  listeners.forEach((l) => l());
}

export const getOrgTimezone = () => orgTimezone;

/** The organization's time zone as a hook, so a screen re-renders if it changes. */
export function useOrgTimezone(): string {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, getOrgTimezone, () => DEFAULT_TZ);
}

function isValidTz(tz: string | null | undefined) {
  if (!tz) return false;
  try { new Intl.DateTimeFormat(LOCALE, { timeZone: tz }); return true; } catch { return false; }
}

const zone = (tz?: string | null) => (isValidTz(tz) ? (tz as string) : orgTimezone);
const ms = (iso: string | number | Date) => (iso instanceof Date ? iso.getTime() : typeof iso === 'number' ? iso : Date.parse(iso));
const valid = (v: number) => Number.isFinite(v);

/* ------------------------------- instants -------------------------------- */

/** "9:05 AM" */
export function formatTime(iso: string | number | Date | null | undefined, tz?: string | null): string {
  if (iso === null || iso === undefined || iso === '') return '—';
  const t = ms(iso);
  if (!valid(t)) return '—';
  return new Date(t).toLocaleTimeString(LOCALE, { timeZone: zone(tz), hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\b(am|pm)\b/, (m) => m.toUpperCase());
}

/** "11 Oct 2026, 9:05 AM" */
export function formatDateTime(iso: string | number | Date | null | undefined, tz?: string | null): string {
  if (iso === null || iso === undefined || iso === '') return '—';
  const t = ms(iso);
  if (!valid(t)) return '—';
  const date = new Date(t).toLocaleDateString(LOCALE, { timeZone: zone(tz), day: 'numeric', month: 'short', year: 'numeric' });
  return `${date}, ${formatTime(t, tz)}`;
}

/** "11 Oct, 9:05 AM" */
export function formatDayTime(iso: string | number | Date | null | undefined, tz?: string | null): string {
  if (iso === null || iso === undefined || iso === '') return '—';
  const t = ms(iso);
  if (!valid(t)) return '—';
  const date = new Date(t).toLocaleDateString(LOCALE, { timeZone: zone(tz), day: 'numeric', month: 'short' });
  return `${date}, ${formatTime(t, tz)}`;
}

/** The calendar date of an instant in the organization's zone, 'yyyy-MM-dd'. */
export function orgDateOf(iso: string | number | Date, tz?: string | null): string {
  return new Date(ms(iso)).toLocaleDateString('en-CA', { timeZone: zone(tz), year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** Today in the organization, 'yyyy-MM-dd'. */
export function orgToday(tz?: string | null): string {
  return orgDateOf(Date.now(), tz);
}

/** This month in the organization, 'yyyy-MM'. */
export const orgMonth = (tz?: string | null) => orgToday(tz).slice(0, 7);

/** Minutes since midnight now, in the organization. */
export function orgNowMinutes(tz?: string | null): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone(tz), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  return get('hour') * 60 + get('minute');
}

/** Milliseconds a zone is ahead of UTC at an instant. */
function zoneOffsetMs(t: number, tz?: string | null): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone(tz), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - Math.floor(t / 1000) * 1000;
}

/** A date and clock time read in the organization's zone ('yyyy-MM-dd', 'HH:mm') as an ISO instant, or null when either is invalid. */
export function orgWallToIso(date: string, time: string, tz?: string | null): string | null {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  if (![y, mo, d, h, mi].every(Number.isFinite)) return null;
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let result = guess - zoneOffsetMs(guess, tz);
  const second = guess - zoneOffsetMs(result, tz);
  if (second !== result) result = second;
  return Number.isFinite(result) ? new Date(result).toISOString() : null;
}

/** An instant as the organization's date and clock time: { date: 'yyyy-MM-dd', time: 'HH:mm' }. */
export function orgWallOf(iso: string | number | Date, tz?: string | null): { date: string; time: string } {
  const t = ms(iso);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone(tz), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t));
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return { date: orgDateOf(t, tz), time: `${get('hour')}:${get('minute')}` };
}

/* ------------------------------ plain dates ------------------------------ */

const utcMidnight = (date: string) => new Date(`${date.slice(0, 10)}T00:00:00Z`);

type DateStyle = 'short' | 'medium' | 'long' | 'weekday';
const STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: 'numeric', month: 'short' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  weekday: { weekday: 'short', day: 'numeric', month: 'short' },
};

/** A 'yyyy-MM-dd' date as people read it, never shifted by a zone. */
export function formatDate(date: string | null | undefined, style: DateStyle = 'medium'): string {
  if (!date) return '—';
  const d = utcMidnight(date);
  return valid(d.getTime()) ? d.toLocaleDateString(LOCALE, { ...STYLES[style], timeZone: 'UTC' }) : '—';
}

/** 'yyyy-MM' as "October 2026". */
export function formatMonth(month: string): string {
  const d = utcMidnight(`${month}-01`);
  return valid(d.getTime()) ? d.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '—';
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, n: number): string {
  return fmt(new Date(utcMidnight(date).getTime() + n * DAY_MS));
}

/** Whole days from `from` to `to`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcMidnight(to).getTime() - utcMidnight(from).getTime()) / DAY_MS);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** First and last date of a month ('yyyy-MM'). */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  return { from: `${month}-01`, to: fmt(new Date(Date.UTC(y, m, 0))) };
}

/* ------------------------------ wall clock ------------------------------- */

/** A clock time ('HH:MM', 'HH:MM:SS') or minutes after midnight as "9:05 AM". */
export function formatClock(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  let minutes: number;
  if (typeof value === 'number') minutes = value;
  else {
    const [h, m] = value.split(':').map(Number);
    if (!Number.isFinite(h)) return '—';
    minutes = h * 60 + (m || 0);
  }
  const day = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(day / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(day % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}
