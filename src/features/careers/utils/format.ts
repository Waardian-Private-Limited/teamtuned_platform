import type { Range, WorkMode } from '../types/careers.types';

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
};

const trimNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));

export function formatExperience(r: Range | null): string | null {
  if (!r) return null;
  const { min, max } = r;
  if (min !== null && max !== null) return min === max ? `${trimNum(min)} yrs` : `${trimNum(min)}–${trimNum(max)} yrs`;
  if (min !== null) return min === 0 ? 'Freshers welcome' : `${trimNum(min)}+ yrs`;
  if (max !== null) return `Up to ${trimNum(max)} yrs`;
  return null;
}

export function formatMoney(value: number, currency?: string | null, compact = false): string {
  const code = currency || 'INR';
  try {
    return new Intl.NumberFormat(code === 'INR' ? 'en-IN' : undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? 'compact' : 'standard',
    }).format(value);
  } catch {
    return `${code} ${Math.round(value).toLocaleString()}`;
  }
}

export function formatSalary(r: (Range & { currency?: string | null }) | null): string | null {
  if (!r) return null;
  const f = (n: number) => formatMoney(n, r.currency, true);
  if (r.min !== null && r.max !== null) return r.min === r.max ? `${f(r.min)} / yr` : `${f(r.min)} – ${f(r.max)} / yr`;
  if (r.min !== null) return `From ${f(r.min)} / yr`;
  if (r.max !== null) return `Up to ${f(r.max)} / yr`;
  return null;
}

/** Calendar date ('YYYY-MM-DD', a DATE column) shown as-is — never shifted through a timezone. */
export function formatDateOnly(value: string | null): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** UTC timestamp shown in the viewer's local time. */
export function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function postedAgo(value: string | null, now = Date.now()): string | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  const days = Math.floor((now - t) / 86_400_000);
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  if (days < 7) return `Posted ${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `Posted ${w} week${w > 1 ? 's' : ''} ago`;
  }
  const mo = Math.floor(days / 30);
  return mo < 12 ? `Posted ${mo} month${mo > 1 ? 's' : ''} ago` : 'Posted over a year ago';
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
