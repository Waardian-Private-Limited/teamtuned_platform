import type { AdvanceKind, AdvanceListTab, AdvanceStatus, InstallmentStatus, InterestMode } from '../types/salaryAdvance.model';

export const SALARY_ADVANCE_PERMISSIONS = {
  VIEW: 'SALADV_VIEW',
  PAY: 'SALADV_PAY',
  APPROVE: 'SALADV_APPROVE',
  POLICY: 'SALADV_POLICY',
  CREATE: 'SALADV_CREATE',
} as const;

export const ADVANCES_ACCESS = [SALARY_ADVANCE_PERMISSIONS.VIEW, SALARY_ADVANCE_PERMISSIONS.PAY, SALARY_ADVANCE_PERMISSIONS.CREATE];

export const ADVANCE_TABS: ReadonlyArray<{ value: AdvanceListTab; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'to_disburse', label: 'To disburse' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

export const ADVANCE_TAB_VALUES = ADVANCE_TABS.map((t) => t.value);

export const ADVANCE_STATUS_LABEL: Record<AdvanceStatus, string> = {
  pending: 'Waiting for approval',
  approved: 'To disburse',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  active: 'Repaying',
  closed: 'Closed',
  written_off: 'Written off',
  merged: 'Merged',
};

export const ADVANCE_STATUS_HELP: Record<AdvanceStatus, string> = {
  pending: 'Waiting in Approvals. Nothing is paid or recovered yet.',
  approved: 'Approved. Waiting to be paid out, by Accounts or in the next payroll.',
  rejected: 'Rejected in Approvals. Nothing is paid or recovered.',
  cancelled: 'Cancelled before it was paid out.',
  active: 'Paid out. Instalments are being recovered from salary.',
  closed: 'Fully recovered.',
  written_off: 'The remaining balance was waived or written off.',
  merged: 'What was left moved into a newer advance, which is recovered on one schedule.',
};

export const INSTALLMENT_STATUS_LABEL: Record<InstallmentStatus, string> = {
  scheduled: 'Scheduled',
  deducted: 'Deducted',
  partial: 'Partly deducted',
  carried: 'Carried forward',
  skipped: 'Skipped',
  waived: 'Waived',
  paid_manually: 'Paid manually',
  moved: 'Moved',
};

export const INSTALLMENT_STATUS_HELP: Record<InstallmentStatus, string> = {
  scheduled: 'Due in the payroll of this month.',
  deducted: 'Recovered in payroll.',
  partial: 'Only part was recovered. The rest carries to the next payroll.',
  carried: 'Not fully recovered. The balance is due in the next payroll.',
  skipped: 'Skipped by HR. Moved to the end of the schedule or merged into the next month.',
  waived: 'Waived. It will not be recovered.',
  paid_manually: 'Repaid outside payroll.',
  moved: 'Moved into the advance this one was merged into.',
};

export const INTEREST_LABEL: Record<InterestMode, string> = {
  none: 'No interest',
  flat: 'Flat interest',
  reducing: 'Reducing balance',
};

export const KIND_LABEL: Record<AdvanceKind, string> = {
  advance: 'Advance',
  loan: 'Loan',
};

export const EVENT_LABEL: Record<string, string> = {
  requested: 'Requested',
  created: 'Created by HR',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  withdrawn: 'Withdrawn',
  disbursed: 'Paid out',
  disbursed_in_payroll: 'Paid out in payroll',
  disbursement_reverted: 'Payout reverted',
  installment_deducted: 'Instalment recovered',
  installment_partial: 'Instalment partly recovered',
  installment_reverted: 'Recovery reverted',
  skipped: 'Month skipped',
  paused: 'Recovery paused',
  reshaped: 'Instalment changed',
  repayment: 'Repayment recorded',
  repaid: 'Repayment recorded',
  waived: 'Balance waived',
  written_off: 'Written off',
  closed: 'Closed',
  imported: 'Imported from the old system',
};

export const SEARCH_DEBOUNCE_MS = 400;
export const PREVIEW_DEBOUNCE_MS = 450;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
export const ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export const ILLUSTRATIONS = {
  credit: { src: '/vectors/credit.svg', width: 960, height: 660, alt: 'Salary advance illustration' },
  debits: { src: '/vectors/debits.svg', width: 960, height: 439, alt: 'Recovery illustration' },
  flow: { src: '/vectors/flow.svg', width: 960, height: 755, alt: 'Advance types illustration' },
  review: { src: '/vectors/review.svg', width: 576, height: 800, alt: 'Review illustration' },
} as const;

export const DISBURSEMENT_LABEL = {
  manual: 'By Accounts',
  payroll: 'With payroll',
} as const;
