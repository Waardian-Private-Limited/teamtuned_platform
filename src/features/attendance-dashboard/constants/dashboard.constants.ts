import type { DayStatus, EmployeeView } from '../types/dashboard.dto';

/**
 * Each status's label and colour. Colour follows meaning only (the theme's status tokens):
 * green came, amber not yet, red absent, greys not expected at work. It is never the only
 * cue: every status also carries its label.
 */
export const STATUS: Record<DayStatus, { label: string; short: string; color: string }> = {
  working: { label: 'Working now', short: 'Working', color: 'var(--tt-success)' },
  completed: { label: 'Completed', short: 'Completed', color: 'color-mix(in srgb, var(--tt-success) 62%, var(--tt-surface))' },
  half_day: { label: 'Half day', short: 'Half day', color: 'color-mix(in srgb, var(--tt-success) 34%, var(--tt-surface))' },
  not_checked_in: { label: 'Not checked in', short: 'Not in', color: 'var(--tt-warning)' },
  absent: { label: 'Absent', short: 'Absent', color: 'var(--tt-danger)' },
  on_leave: { label: 'On leave', short: 'Leave', color: 'var(--tt-fg-muted)' },
  holiday: { label: 'Holiday', short: 'Holiday', color: 'var(--tt-fg-subtle)' },
  week_off: { label: 'Week off', short: 'Week off', color: 'var(--tt-border-strong)' },
};

/** The order statuses are stacked and listed in: came, not yet, absent, not expected. */
export const STATUS_ORDER: DayStatus[] = ['working', 'completed', 'half_day', 'not_checked_in', 'absent', 'on_leave', 'holiday', 'week_off'];

export const VIEW_LABEL: Record<EmployeeView, string> = {
  all: 'Everyone',
  present: 'Present',
  late: 'Late',
  review: 'Needs review',
  ...Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.label])),
} as Record<EmployeeView, string>;

export const PAGE_SIZE = 20;

export const minutesText = (m: number) => {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h${r ? ` ${r}m` : ''}` : `${r}m`;
};

export const pctText = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v % 1 === 0 ? v : v.toFixed(1)}%`);

export const timeText = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');

export const dayText = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

export const hourText = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;
