export const COMP_PERMISSIONS = {
  VIEW: 'COMP_VIEW',
  ADD: 'COMP_ADD',
  EDIT: 'COMP_EDIT',
  APPROVE: 'COMP_APPROVE',
  DELETE: 'COMP_DELETE',
} as const;

export const TABS = [
  { value: 'appraisals', label: 'Appraisals' },
  { value: 'payouts', label: 'Bonus & payouts' },
  { value: 'bonus', label: 'Statutory bonus' },
  { value: 'gratuity', label: 'Gratuity' },
  { value: 'settings', label: 'Settings' },
] as const;

export type TabKey = (typeof TABS)[number]['value'];

export const REVISION_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Scheduled' },
  { value: 'applied', label: 'Applied' },
  { value: 'draft', label: 'Draft' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export const PAYOUT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'draft', label: 'Draft' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending approval',
  approved: 'Scheduled',
  applied: 'Applied',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  in_review: 'In review',
  closed: 'Closed',
};

export const STATUS_TONE: Record<string, 'active' | 'inactive' | 'terminated' | 'neutral'> = {
  draft: 'neutral',
  pending: 'neutral',
  approved: 'active',
  applied: 'active',
  paid: 'active',
  rejected: 'inactive',
  cancelled: 'terminated',
  in_review: 'neutral',
  closed: 'terminated',
};

export const CHANGE_MODES = [
  { value: 'percent', label: '% change' },
  { value: 'ctc', label: 'New CTC' },
  { value: 'gross', label: 'New gross' },
] as const;

export const AMOUNT_MODES = [
  { value: 'fixed', label: 'Fixed ₹' },
  { value: 'percent_basic', label: '% of monthly Basic' },
  { value: 'percent_gross', label: '% of monthly gross' },
  { value: 'percent_ctc', label: '% of annual CTC' },
] as const;

export const EXIT_REASONS = [
  { value: 'resignation', label: 'Resignation' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'superannuation', label: 'Superannuation' },
  { value: 'termination', label: 'Termination' },
  { value: 'death', label: 'Death' },
  { value: 'disablement', label: 'Disablement' },
] as const;
