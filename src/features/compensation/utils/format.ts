import { addMonths, formatDate, orgMonth, orgToday } from '@/lib/datetime';

export function inr(n: number | null | undefined, { sign = false } = {}) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  const text = `₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}`;
  if (v < 0) return `−${text}`;
  return sign && v > 0 ? `+${text}` : text;
}

export function pct(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  return `${v > 0 ? '+' : ''}${v.toFixed(Math.abs(v) < 10 ? 2 : 1)}%`;
}

export function date(value: string | null | undefined) {
  return formatDate(value, 'medium');
}

export function month(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(`${value}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** The organization's month, `offset` months away, 'yyyy-MM'. */
export function currentMonth(offset = 0) {
  return addMonths(orgMonth(), offset);
}

export function today() {
  return orgToday();
}

/** The April-to-March financial year that is current in the organization, by its starting year. */
export function currentFyStart() {
  const t = orgToday();
  return Number(t.slice(5, 7)) >= 4 ? Number(t.slice(0, 4)) : Number(t.slice(0, 4)) - 1;
}
