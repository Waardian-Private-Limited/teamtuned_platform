import type { DeductionStatus } from '../types/otherDeductions.model';

export const OTHER_DEDUCTION_PERMISSIONS = {
  VIEW: 'COMP_VIEW',
  ADD: 'COMP_ADD',
  DELETE: 'COMP_DELETE',
} as const;

export const DEDUCTION_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Scheduled' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export type DeductionStatusFilter = (typeof DEDUCTION_STATUS_FILTER_OPTIONS)[number]['value'];


export const DEDUCTION_STATUS_LABEL: Record<DeductionStatus, string> = {
  draft: 'Draft',
  pending: 'Waiting for approval',
  approved: 'Scheduled',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const DEDUCTION_STATUS_HELP: Record<DeductionStatus, string> = {
  draft: 'Saved but not submitted. Payroll ignores it.',
  pending: 'Waiting in Approvals because "Approve other deductions" is on in Compensation settings. Payroll deducts it once approved.',
  approved: 'Scheduled: deducted in the payroll of its month.',
  paid: 'Deducted in a finalized payroll.',
  rejected: 'Rejected in Approvals. Payroll ignores it.',
  cancelled: 'Cancelled. Payroll ignores it.',
};

export const SEARCH_DEBOUNCE_MS = 400;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_INSTALMENTS = 24;
