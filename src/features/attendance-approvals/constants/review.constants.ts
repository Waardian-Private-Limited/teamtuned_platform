import type { ReviewStatusFilter, RowStatus, SortKey } from '../types/review.model';

export const DEFAULT_PAGE_SIZE = 25;
export const SEARCH_DEBOUNCE_MS = 400;

export const REVIEW_STATUS_OPTIONS: ReadonlyArray<{ value: ReviewStatusFilter; label: string }> = [
  { value: 'waiting', label: 'Waiting for me' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Withdrawn' },
  { value: 'all', label: 'All statuses' },
];

export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: 'submitted_desc', label: 'Newest first' },
  { value: 'submitted_asc', label: 'Oldest first' },
  { value: 'date_desc', label: 'Attendance date, latest' },
  { value: 'date_asc', label: 'Attendance date, earliest' },
  { value: 'name_asc', label: 'Employee name' },
];

export const ROW_STATUS: Record<RowStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  approved: { label: 'Approved', className: 'border-[var(--tt-success)]/25 bg-[var(--tt-success-soft)] text-[var(--tt-success)]' },
  rejected: { label: 'Rejected', className: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]' },
  cancelled: { label: 'Withdrawn', className: 'border-line bg-bg-subtle text-fg-muted' },
};
