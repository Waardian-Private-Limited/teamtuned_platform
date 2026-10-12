import { addMonths, formatDate, orgMonth } from '@/lib/datetime';

export const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export function money(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  const body = `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  return v < 0 ? `−${body}` : body;
}

export function monthLabel(key: string, style: 'short' | 'long' = 'long') {
  if (!MONTH_KEY.test(key)) return '—';
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: style, year: 'numeric', timeZone: 'UTC' });
}

export function shiftMonth(key: string, delta: number) {
  return addMonths(key, delta);
}

export function thisMonth() {
  return orgMonth();
}

export function shortDate(value: string | null | undefined) {
  return value ? formatDate(value.slice(0, 10), 'medium') : '—';
}
