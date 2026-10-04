const DAY_MS = 86400000;

export function toDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  return fmtDate(new Date(toDate(s).getTime() + n * DAY_MS));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY_MS);
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function weekdayIndex(s: string): number {
  return (toDate(s).getUTCDay() + 6) % 7;
}

export function startOfWeek(s: string): string {
  return addDays(s, -weekdayIndex(s));
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  return { from: fmtDate(new Date(Date.UTC(year, month, 1))), to: fmtDate(new Date(Date.UTC(year, month + 1, 0))) };
}

export function todayLocal(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function formatDay(s: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat('en-IN', { ...opts, timeZone: 'UTC' }).format(toDate(s));
}

export function formatMinutes(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
}

export function formatRange(startMin: number, durationMin: number): string {
  return `${formatMinutes(startMin)} – ${formatMinutes(startMin + durationMin)}`;
}

export function clockOf(dateTime: string | null): string {
  if (!dateTime) return '';
  const [h, m] = dateTime.slice(11, 16).split(':').map(Number);
  return formatMinutes(h * 60 + m);
}

export function maskToDays(mask: number): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((i) => (mask >> i) & 1);
}

export function daysToMask(days: number[]): number {
  return days.reduce((m, d) => m | (1 << d), 0);
}

export function hoursLabel(minutes: number): string {
  return `${Math.round((minutes / 60) * 10) / 10}h`;
}
