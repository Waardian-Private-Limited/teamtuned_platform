const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export const money = (v: number | null | undefined) => inr.format(Number(v) || 0);

export function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// The organization's time zone (from GET /settings). Instants and HH:MM entries are shown and typed in it, never in the browser's.
let orgTimezone: string | undefined;
export const setOrgTimezone = (tz: string | undefined) => { orgTimezone = tz; };
export const getOrgTimezone = () => orgTimezone;

export function fmtTime(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: orgTimezone });
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: orgTimezone });
}

export function fmtMinutes(m: number | null | undefined): string {
  const n = Math.max(0, Math.round(Number(m) || 0));
  return `${Math.floor(n / 60)}h ${String(n % 60).padStart(2, '0')}m`;
}

export function ago(v: string | null | undefined): string {
  if (!v) return 'never';
  const diff = Date.now() - new Date(v).getTime();
  if (Number.isNaN(diff)) return v;
  const mins = Math.max(0, Math.round(diff / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const thisMonth = () => today().slice(0, 7);

export const fullName = (l: { firstName: string; lastName?: string | null }) => [l.firstName, l.lastName].filter(Boolean).join(' ');
export const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export const num = (v: string): number => (v.trim() === '' ? NaN : Number(v));
