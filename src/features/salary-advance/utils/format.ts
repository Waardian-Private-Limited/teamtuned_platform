import { formatDate, formatDayTime } from '@/lib/datetime';

export { money, monthLabel, MONTH_KEY, thisMonth, shiftMonth } from '@/features/salary-slips/utils/format';

export function compactMoney(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  const v = Math.abs(Number(n));
  const sign = Number(n) < 0 ? '−' : '';
  if (v >= 1e7) return `${sign}₹${(v / 1e7).toFixed(v >= 1e8 ? 0 : 1).replace(/\.0$/, '')}Cr`;
  if (v >= 1e5) return `${sign}₹${(v / 1e5).toFixed(v >= 1e6 ? 0 : 1).replace(/\.0$/, '')}L`;
  if (v >= 1e3) return `${sign}₹${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(/\.0$/, '')}K`;
  return `${sign}₹${Math.round(v)}`;
}

export function dateText(value: string | null | undefined) {
  return value ? formatDate(value.slice(0, 10), 'medium') : '—';
}

export function dateTimeText(value: string | null | undefined) {
  return value ? formatDayTime(value) : '—';
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function parseAmount(raw: string) {
  return raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}
