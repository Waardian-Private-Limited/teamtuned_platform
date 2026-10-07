import type { BadgeTone, OverrideStatus } from '../types/detailed.model';

export const PAGE_SIZE = 25;
export const SEARCH_DEBOUNCE_MS = 350;
export const REFRESH_MS = 60_000;

/** The colour of each tone: a dot and a quiet tint. Colour is never the only cue; every badge carries its label. */
export const TONE: Record<BadgeTone, { dot: string; chip: string; bar: string; text: string }> = {
  good: { dot: 'bg-[var(--tt-success)]', chip: 'bg-[var(--tt-success-soft)] text-[var(--tt-success)]', bar: 'bg-[var(--tt-success)]', text: 'text-[var(--tt-success)]' },
  warn: { dot: 'bg-[var(--tt-warning)]', chip: 'bg-[color-mix(in_srgb,var(--tt-warning)_14%,var(--tt-surface))] text-[var(--tt-warning)]', bar: 'bg-[var(--tt-warning)]', text: 'text-[var(--tt-warning)]' },
  bad: { dot: 'bg-[var(--tt-danger)]', chip: 'bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]', bar: 'bg-[var(--tt-danger)]', text: 'text-[var(--tt-danger)]' },
  info: { dot: 'bg-[var(--tt-accent)]', chip: 'bg-[var(--tt-accent-soft)] text-[var(--tt-accent)]', bar: 'bg-[var(--tt-accent)]', text: 'text-[var(--tt-accent)]' },
  muted: { dot: 'bg-[var(--tt-fg-subtle)]', chip: 'bg-bg-subtle text-fg-muted', bar: 'bg-[var(--tt-border-strong)]', text: 'text-fg-muted' },
};

export const OVERRIDE_OPTIONS: Array<{ value: OverrideStatus; label: string; hint: string }> = [
  { value: 'Present', label: 'Present', hint: 'Full day, paid' },
  { value: 'Half-Day', label: 'Half day', hint: 'Half a day, paid' },
  { value: 'Absent', label: 'Absent', hint: 'Not paid' },
  { value: 'Leave', label: 'On leave', hint: 'Paid day off' },
  { value: 'Weekend', label: 'Week off', hint: 'Paid day off' },
  { value: 'Holiday', label: 'Holiday', hint: 'Paid day off' },
];

/** What the engine's flags mean, in one plain line. Flags that are not here are not shown. */
export const FLAG_TEXT: Record<string, string> = {
  LATE_EXCUSED_BY_PERMISSION: 'Late start excused by a permission',
  EARLY_EXCUSED_BY_PERMISSION: 'Early exit excused by a permission',
  LATE_EXCUSED_BY_NIGHT_OT: 'Late start covered by night overtime',
  NIGHT_OT_ADJUSTED: 'Night overtime lifted this day',
  LATE_MADE_UP: 'Late time made up by staying back',
  LATE_NOT_MADE_UP: 'Late time was not made up',
  MARK_WAIVED: 'A late or early mark was waived',
  LATE_WAIVED: 'Late mark waived',
  EARLY_WAIVED: 'Early-exit mark waived',
  WORKED_ON_OFF_DAY: 'Worked on a week off or holiday',
  UNSCHEDULED_WORK: 'Worked without a scheduled shift',
  PUNCHED_ON_LEAVE: 'Came in on an approved leave day',
  HALF_LEAVE_NOT_WORKED: 'Half-day leave, second half not worked',
  FLEXIBLE_WEEK_OFF: 'Used one of the flexible week offs',
  AUTO_CLOSED: 'Checked out automatically at shift end',
  MISSED_CHECKOUT: 'No check-out',
  SANDWICH_LOSS: 'Week off lost under the sandwich rule',
  CLOCK_RULE_OUTSIDE_SHIFT: 'Policy late or early time falls outside this shift',
};

export const COMP_OFF_REASON: Record<string, string> = {
  overtime: 'Overtime',
  night_ot: 'Night overtime',
  night_ot_leftover: 'Night overtime (left over)',
  holiday_work: 'Holiday work',
  week_off_work: 'Week-off work',
};

export const COMP_OFF_STATE: Record<string, string> = {
  pending: 'Waiting for approval',
  approved: 'Approved',
  credited: 'Credited',
  used_flagged: 'Credited (already used)',
  rejected: 'Rejected',
  reversed: 'Withdrawn',
};

export const SOURCE_TEXT: Record<string, string> = {
  app: 'Mobile app', web: 'Web', device: 'Device', admin: 'Added by HR', regularize: 'Regularization', system: 'Automatic', import: 'Imported',
};

export const LOCATION_TEXT: Record<string, string> = { ok: 'On site', exception: 'Outside the site, reason given', flagged: 'Outside the site, flagged', skipped: '' };
export const FACE_TEXT: Record<string, string> = { match: 'Face matched', no_match: 'Face did not match', skipped: '', unavailable: '' };

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
