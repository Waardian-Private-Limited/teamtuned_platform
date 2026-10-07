export const minutesText = (m: number) => {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h${r ? ` ${r}m` : ''}` : `${r}m`;
};

export const hoursText = (h: number) => `${h % 1 === 0 ? h : h.toFixed(1)}h`;

/** Days with at most two decimals: 18, 18.5, 18.25. */
export const daysText = (n: number) => `${Math.round(n * 100) / 100}`;

export const timeText = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');

export const dayText = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

export const longDayText = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const dateTimeText = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const monthText = (month: string) => new Date(`${month}-01T00:00:00`).toLocaleDateString([], { month: 'long', year: 'numeric' });

const pad = (n: number) => String(n).padStart(2, '0');

export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export const monthOf = (date: string) => date.slice(0, 7);

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

export const unitsText = (units: number) => (units === 1 ? 'Full day' : units === 0.5 ? 'Half day' : units === 0 ? 'No pay' : `${daysText(units)} day`);
