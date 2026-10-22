import { minutesText, pctText } from '@/features/attendance-dashboard/constants/dashboard.constants';
import type { BucketUnit, InsightBoardKey, InsightGroup, InsightPeriod, InsightSort } from '../types/insights.dto';

export { minutesText, pctText };

export const PERIODS: ReadonlyArray<{ value: InsightPeriod; label: string }> = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

export const GROUPS: ReadonlyArray<{ value: InsightGroup; label: string }> = [
  { value: 'site', label: 'Sites' },
  { value: 'department', label: 'Departments' },
  { value: 'employee', label: 'Employees' },
];

export const EMPLOYEE_PAGE_SIZE = 25;

/** Hours with one decimal, from minutes: 90 -> "1.5h". */
export const hoursText = (m: number | null | undefined) => (m === null || m === undefined ? '—' : `${Math.round((m / 60) * 10) / 10}h`);
export const scoreText = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(Math.round(v)));
export const numText = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(Math.round(v * 10) / 10));

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts }).format(new Date(`${date}T00:00:00Z`));

/** "1 Oct – 22 Oct 2026", or one date. */
export const rangeText = (from: string, to: string) => (from === to ? fmt(to, { day: 'numeric', month: 'short', year: 'numeric' }) : `${fmt(from, { day: 'numeric', month: 'short' })} – ${fmt(to, { day: 'numeric', month: 'short', year: 'numeric' })}`);

/** The name of the period, e.g. "October 2026", "Q3 FY 2026-27", "Week of 19 Oct". */
export function periodTitle(period: InsightPeriod, from: string, to: string, yearStart: 1 | 4) {
  if (period === 'week') return `Week of ${fmt(from, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  if (period === 'month') return fmt(from, { month: 'long', year: 'numeric' });
  const y = Number(from.slice(0, 4));
  const fy = yearStart === 4 ? `FY ${y}-${String((y + 1) % 100).padStart(2, '0')}` : String(y);
  if (period === 'year') return yearStart === 4 ? fy : `Year ${y}`;
  const m = Number(from.slice(5, 7));
  const q = Math.floor((((m - yearStart) % 12) + 12) % 12 / 3) + 1;
  return yearStart === 4 ? `Q${q} ${fy}` : `Q${q} ${y}`;
}

/** Axis label of a trend bucket. */
export function bucketLabel(unit: BucketUnit, key: string) {
  if (unit === 'month') return fmt(key, { month: 'short' });
  if (unit === 'week') return fmt(key, { day: 'numeric', month: 'short' });
  return String(Number(key.slice(8, 10)));
}

export const bucketTitle = (unit: BucketUnit, from: string, to: string) => (unit === 'day' ? fmt(from, { weekday: 'short', day: 'numeric', month: 'short' }) : rangeText(from, to));

/** Each board: its title, what the value means, and whether a high value is bad news. */
export const BOARD_META: Record<InsightBoardKey, { title: string; measure: string; risk?: boolean }> = {
  most_consistent: { title: 'Most consistent', measure: 'Consistency score' },
  least_consistent: { title: 'Needs attention', measure: 'Lowest consistency', risk: true },
  most_overtime: { title: 'Most overtime', measure: 'Overtime hours' },
  most_night_ot: { title: 'Most night OT', measure: 'Night overtime hours' },
  most_off_day_work: { title: 'Worked on days off', measure: 'Week offs and holidays worked' },
  most_hours: { title: 'Most hours', measure: 'Hours worked' },
  most_late: { title: 'Late most often', measure: 'Late days', risk: true },
};
export const BOARD_ORDER: InsightBoardKey[] = ['most_consistent', 'least_consistent', 'most_overtime', 'most_night_ot', 'most_off_day_work', 'most_late'];

export const boardValueText = (unit: 'score' | 'minutes' | 'days', v: number) => (unit === 'score' ? scoreText(v) : unit === 'minutes' ? hoursText(v) : `${v} ${v === 1 ? 'day' : 'days'}`);

/** Table columns: label, sort key, and how the cell reads. */
export interface Column { key: InsightSort; label: string; short?: string; text: (r: Record<string, unknown>) => string; csv: (r: Record<string, unknown>) => string | number }
const n = (r: Record<string, unknown>, k: string) => (r[k] === null || r[k] === undefined ? null : Number(r[k]));
export const METRIC_COLUMNS: Column[] = [
  { key: 'consistency', label: 'Consistency', text: (r) => scoreText(n(r, 'consistency')), csv: (r) => n(r, 'consistency') ?? '' },
  { key: 'attendance_rate', label: 'Attendance', text: (r) => pctText(n(r, 'attendance_rate')), csv: (r) => n(r, 'attendance_rate') ?? '' },
  { key: 'punctuality_rate', label: 'Punctuality', text: (r) => pctText(n(r, 'punctuality_rate')), csv: (r) => n(r, 'punctuality_rate') ?? '' },
  { key: 'absent_days', label: 'Absent', text: (r) => numText(n(r, 'absent_days')), csv: (r) => n(r, 'absent_days') ?? 0 },
  { key: 'late_days', label: 'Late days', text: (r) => numText(n(r, 'late_days')), csv: (r) => n(r, 'late_days') ?? 0 },
  { key: 'worked_minutes', label: 'Hours', text: (r) => hoursText(n(r, 'worked_minutes')), csv: (r) => Math.round((n(r, 'worked_minutes') ?? 0) / 6) / 10 },
  { key: 'overtime_minutes', label: 'Overtime', text: (r) => hoursText(n(r, 'overtime_minutes')), csv: (r) => Math.round((n(r, 'overtime_minutes') ?? 0) / 6) / 10 },
  { key: 'night_ot_minutes', label: 'Night OT', text: (r) => hoursText(n(r, 'night_ot_minutes')), csv: (r) => Math.round((n(r, 'night_ot_minutes') ?? 0) / 6) / 10 },
  { key: 'off_day_days', label: 'Days off worked', short: 'Off-day', text: (r) => numText(n(r, 'off_day_days')), csv: (r) => n(r, 'off_day_days') ?? 0 },
];

/** A CSV file from a header row and rows; values with commas, quotes or line breaks are quoted. */
export function downloadCsv(name: string, header: string[], rows: Array<Array<string | number | null>>) {
  const cell = (v: string | number | null) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
