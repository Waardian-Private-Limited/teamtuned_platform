import type { RegularizationKind, RegularizationStatus } from '../types/regularization.model';

export const KIND_TEXT: Record<RegularizationKind, string> = {
  missed_checkout: 'Missed check-out',
  missed_checkin: 'Missed check-in',
  missed_both: 'Missed both punches',
  wrong_time: 'Wrong time',
  remove_late_mark: 'Remove late mark',
  remove_late_penalty: 'Remove late penalty',
  remove_early_mark: 'Remove early mark',
  remove_early_penalty: 'Remove early penalty',
};

export const STATUS_TEXT: Record<RegularizationStatus, string> = {
  pending: 'Waiting for approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Withdrawn',
};

export const STATUS_TONE: Record<RegularizationStatus, string> = {
  pending: 'text-[var(--tt-warning)]',
  approved: 'text-[var(--tt-success)]',
  rejected: 'text-[var(--tt-danger)]',
  cancelled: 'text-fg-muted',
};

export const DAY_TYPE_TEXT: Record<string, string> = {
  working: 'Working day',
  week_off: 'Week off',
  half_week_off: 'Half week off',
  holiday: 'Holiday',
  half_holiday: 'Half holiday',
  roster_leave: 'Leave',
  unscheduled: 'Not scheduled',
};

/** Why a day cannot be regularized, by the server's code. */
export const BLOCKED_TEXT: Record<string, string> = {
  ATTENDANCE_REGULARIZE_DISABLED: 'Regularization is not allowed for you.',
  ATTENDANCE_REGULARIZE_FUTURE_DATE: 'This day has not happened yet.',
  ATTENDANCE_REGULARIZE_WINDOW_CLOSED: 'The time to raise a request for this day has passed.',
  ATTENDANCE_REGULARIZE_LIMIT_REACHED: 'You have used all your requests for this month.',
  ATTENDANCE_REGULARIZE_LOCKED: 'This day is locked for payroll.',
  ATTENDANCE_REGULARIZE_ALREADY_REQUESTED: 'You already have a request open for this day.',
};
