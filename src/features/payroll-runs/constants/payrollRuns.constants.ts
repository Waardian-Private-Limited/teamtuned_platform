import type { ItemStatusFilter, RunStage } from '../types/payrollRuns.model';

export const PAYROLL_PERMISSIONS = {
  VIEW: 'PAYROLL_VIEW',
  ADD: 'PAYROLL_ADD',
  EDIT: 'PAYROLL_EDIT',
} as const;

export const POLL_MS = 2500;
export const SEARCH_DEBOUNCE_MS = 400;
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export const ITEM_STATUS_OPTIONS: ReadonlyArray<{ value: ItemStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'error', label: 'Errors' },
  { value: 'warning', label: 'Warnings' },
  { value: 'held', label: 'Held' },
  { value: 'ok', label: 'OK' },
];

export const STEPS = ['Calculate', 'Review', 'Finalize', 'Release', 'Paid'] as const;

export const STAGE_STEP: Record<RunStage, number> = {
  not_started: 0,
  not_calculated: 0,
  calculating: 0,
  failed: 0,
  review: 1,
  awaiting_finalize_approval: 2,
  finalized: 3,
  released: 4,
  paid: 5,
};

export const STAGE_LABEL: Record<RunStage, string> = {
  not_started: 'Not started',
  not_calculated: 'Not calculated',
  calculating: 'Calculating',
  failed: 'Calculation failed',
  review: 'In review',
  awaiting_finalize_approval: 'Awaiting approval',
  finalized: 'Finalized',
  released: 'Payslips released',
  paid: 'Paid',
};

export const STATUTORY_CATEGORIES = new Set(['pf', 'epf', 'esi', 'esic', 'pt', 'professional_tax', 'tds', 'lwf', 'income_tax']);

export const PAYOUT_CATEGORY_LABEL: Record<string, string> = {
  arrears: 'Arrears',
  arrear: 'Arrears',
  bonus: 'Bonus',
  incentive: 'Incentive',
  other_deduction: 'Recovery',
  reimbursement: 'Reimbursement',
};

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
