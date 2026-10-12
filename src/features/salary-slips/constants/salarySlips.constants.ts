import type { SlipStatus } from '../types/salarySlips.model';

export const SALARY_SLIP_PERMISSIONS = {
  VIEW: 'PAYROLL_VIEW',
  ADD: 'PAYROLL_ADD',
  EDIT: 'PAYROLL_EDIT',
} as const;

export const SEARCH_DEBOUNCE_MS = 400;
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export const SLIP_STATUS_LABEL: Record<SlipStatus, string> = {
  held: 'Held',
  visible: 'Generated',
  not_generated: 'Not generated',
  draft: 'Draft preview',
};

export const GENERATE_ALL_NOTE = 'All payslips except held ones become visible to employees in the app';
export const DRAFT_BLOCK_REASON = 'Finalize the payroll first';
export const PENDING_BLOCK_REASON = 'This payroll is waiting for approval';
export const PAID_HOLD_REASON = 'This payroll is already paid';

export const RUN_STATUS_LABEL = {
  draft: 'Draft',
  finalized: 'Finalized',
  paid: 'Paid',
} as const;
