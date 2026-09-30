export const REVISION_PERMISSIONS = {
  VIEW: 'COMP_VIEW',
  ADD: 'COMP_ADD',
  EDIT: 'COMP_EDIT',
  APPROVE: 'COMP_APPROVE',
  DELETE: 'COMP_DELETE',
} as const;

export const SEARCH_DEBOUNCE_MS = 400;
export const DEFAULT_PAGE_SIZE = 10;

export const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Scheduled' },
  { value: 'applied', label: 'Applied' },
  { value: 'draft', label: 'Draft' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number]['value'];

export const TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'increment', label: 'Increments' },
  { value: 'promotion', label: 'Promotions' },
  { value: 'appraisal', label: 'Appraisals' },
  { value: 'market_adjustment', label: 'Market adjustments' },
  { value: 'correction', label: 'Corrections' },
  { value: 'confirmation', label: 'Confirmations' },
  { value: 'demotion', label: 'Demotions' },
  { value: 'transfer', label: 'Transfers' },
  { value: 'joining', label: 'Joining salary' },
] as const;

export const CHANGE_MODES = [
  { value: 'percent', label: '% change' },
  { value: 'ctc', label: 'New CTC' },
  { value: 'gross', label: 'New gross' },
] as const;
