import type { LeaveStatus, Session } from '../types/leave.model';

export const DEFAULT_PAGE_SIZE = 10;
export const PREVIEW_DEBOUNCE_MS = 400;
export const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;

export const STATUS: Record<LeaveStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  approved: { label: 'Approved', className: 'border-[var(--tt-success)]/25 bg-[var(--tt-success-soft)] text-[var(--tt-success)]' },
  rejected: { label: 'Rejected', className: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]' },
  cancelled: { label: 'Cancelled', className: 'border-line bg-bg-subtle text-fg-muted' },
  expired: { label: 'Expired', className: 'border-line bg-bg-subtle text-fg-muted' },
};
export const STATUS_ORDER: LeaveStatus[] = ['pending', 'approved', 'rejected', 'cancelled', 'expired'];

export const SESSION_TEXT: Record<Session, string> = { full: 'Full day', first_half: 'First half', second_half: 'Second half' };

export const EARNED_REASON: Record<string, string> = {
  overtime: 'Overtime',
  night_ot: 'Night overtime',
  night_ot_leftover: 'Night overtime',
  holiday_work: 'Worked on a holiday',
  week_off_work: 'Worked on a week off',
};

export const EARNED_STATE: Record<string, { label: string; className: string }> = {
  pending: STATUS.pending,
  approved: STATUS.approved,
  credited: { label: 'Credited', className: STATUS.approved.className },
  rejected: STATUS.rejected,
  used_flagged: { label: 'Used', className: STATUS.cancelled.className },
};

/** What a day inside a leave is, when it is not charged as a working day. */
export const DAY_KIND: Record<string, string> = { working: 'Working day', week_off: 'Week off', holiday: 'Holiday', half_holiday: 'Half holiday' };

export const TIMELINE_TEXT: Record<string, string> = {
  submitted: 'Sent', resubmitted: 'Sent again', approved: 'Approved', rejected: 'Rejected', sent_back: 'Sent back',
  withdrawn: 'Withdrawn', escalated: 'Escalated', reassigned: 'Reassigned', skipped: 'Step skipped',
};
