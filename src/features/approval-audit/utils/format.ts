import type { RangePreset } from '../types/audit.dto';

/** A duration in minutes as the two largest units: 45m, 5h 20m, 3d 4h. */
export function durationText(m: number | null | undefined): string {
  if (m === null || m === undefined) return '—';
  if (m < 60) return `${Math.max(0, Math.round(m))}m`;
  if (m < 1440) {
    const h = Math.floor(m / 60);
    const r = Math.round(m % 60);
    return r ? `${h}h ${r}m` : `${h}h`;
  }
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return h ? `${d}d ${h}h` : `${d}d`;
}

export const pctText = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v % 1 === 0 ? v : v.toFixed(1)}%`);

const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const toStr = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, n: number): string {
  const d = toDate(date);
  d.setUTCDate(d.getUTCDate() + n);
  return toStr(d);
}

/** The first and last date of a preset period that ends today (org time). */
export function presetRange(preset: Exclude<RangePreset, 'custom'>, today: string): { from: string; to: string } {
  if (preset === '7d') return { from: addDays(today, -6), to: today };
  if (preset === '30d') return { from: addDays(today, -29), to: today };
  const y = today.slice(0, 4);
  if (preset === 'year') return { from: `${y}-01-01`, to: today };
  const q = Math.floor((Number(today.slice(5, 7)) - 1) / 3);
  return { from: `${y}-${String(q * 3 + 1).padStart(2, '0')}-01`, to: today };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "5 Oct", or "Oct 2026" for a month bucket. */
export function shortDate(date: string, unit: 'day' | 'week' | 'month' = 'day'): string {
  const m = MONTHS[Number(date.slice(5, 7)) - 1];
  if (unit === 'month') return `${m} ${date.slice(2, 4)}`;
  return `${Number(date.slice(8, 10))} ${m}`;
}

export function rangeText(from: string, to: string): string {
  const year = (d: string) => d.slice(0, 4);
  const day = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
  return year(from) === year(to) ? `${day(from)} – ${day(to)} ${year(to)}` : `${day(from)} ${year(from)} – ${day(to)} ${year(to)}`;
}
