// Date maths for splitting a cycle into breaks, on 'YYYY-MM-DD' strings in UTC so the browser's time zone never shifts a day.
// It mirrors the server (domain/Periods.js) so the form can show the split before saving; the server still checks it.
import type { BreakDraft, CheckIn } from './types/perf.types';

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const STEP_MONTHS: Partial<Record<CheckIn, number>> = { monthly: 1, quarterly: 3, half_yearly: 6 };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toMs(iso: string): number | null {
  const m = ISO.exec(iso || '');
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(ms);
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? ms : null;
}
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => fromMs((toMs(iso) as number) + n * 86400000);
export const daysBetween = (a: string, b: string) => Math.round(((toMs(b) as number) - (toMs(a) as number)) / 86400000);

function addMonths(iso: string, n: number) {
  const d = new Date(toMs(iso) as number);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return fromMs(d.getTime());
}

const validRange = (start: string, end: string) => toMs(start) !== null && toMs(end) !== null && (toMs(end) as number) >= (toMs(start) as number);

/** Breaks of a fixed length (Q1..Q4, H1/H2, Apr 2025..), as the server generates them. */
export function generate(start: string, end: string, checkIn: CheckIn): BreakDraft[] {
  const step = STEP_MONTHS[checkIn];
  if (!step || !validRange(start, end)) return [];
  const out: BreakDraft[] = [];
  let from = start;
  for (let seq = 1; seq <= 200; seq += 1) {
    const to = addDays(addMonths(start, step * seq), -1);
    const last = (toMs(to) as number) >= (toMs(end) as number);
    const d = new Date(toMs(from) as number);
    const label = checkIn === 'quarterly' ? `Q${seq}` : checkIn === 'half_yearly' ? `H${seq}` : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    out.push({ label, period_start: from, period_end: last ? end : to, weight: null });
    if (last) break;
    from = addDays(to, 1);
  }
  return out;
}

/** The cycle cut into `count` breaks of (almost) equal days, for a custom split to start from. */
export function evenSplit(start: string, end: string, count: number): BreakDraft[] {
  if (!validRange(start, end) || count < 1) return [];
  const days = daysBetween(start, end) + 1;
  const n = Math.min(count, days);
  const out: BreakDraft[] = [];
  let from = start;
  for (let i = 0; i < n; i += 1) {
    const to = i === n - 1 ? end : addDays(start, Math.round((days * (i + 1)) / n) - 1);
    out.push({ label: `Break ${i + 1}`, period_start: from, period_end: to, weight: null });
    from = addDays(to, 1);
  }
  return out;
}

/** After an end date changes, every following break starts the next day, so the split never has gaps. */
export function chain(list: BreakDraft[], start: string): BreakDraft[] {
  return list.map((b, i) => ({ ...b, period_start: i === 0 ? start : toMs(list[i - 1].period_end) !== null ? addDays(list[i - 1].period_end, 1) : b.period_start }));
}

/** Equal weights that add up to exactly 100 (the remainder goes to the last break). */
export function evenWeights(list: BreakDraft[]): BreakDraft[] {
  const each = Math.floor((10000 / list.length)) / 100;
  return list.map((b, i) => ({ ...b, weight: i === list.length - 1 ? Math.round((100 - each * (list.length - 1)) * 100) / 100 : each }));
}

export const weightTotal = (list: BreakDraft[]) => Math.round(list.reduce((s, b) => s + (b.weight ?? 0), 0) * 100) / 100;

/** Short "1 Apr – 30 Jun" for a break. */
export function shortRange(from: string, to: string) {
  const f = toMs(from);
  const t = toMs(to);
  if (f === null || t === null) return '';
  const fmt = (ms: number) => { const d = new Date(ms); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
  return `${fmt(f)} – ${fmt(t)}`;
}
