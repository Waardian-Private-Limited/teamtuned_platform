export const SITE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export type SiteStatusFilter = (typeof SITE_STATUS_FILTER_OPTIONS)[number]['value'];

export const SEARCH_DEBOUNCE_MS = 500;

export const DEFAULT_PAGE_SIZE = 10;

export const SITE_PERMISSIONS = {
  VIEW: 'SITE_VIEW',
  ADD: 'SITE_ADD',
  EDIT: 'SITE_EDIT',
  DELETE: 'SITE_DELETE',
} as const;

export type SiteFieldName =
  | 'name'
  | 'code'
  | 'address'
  | 'pincode'
  | 'city'
  | 'state'
  | 'country'
  | 'expiry_date'
  | 'budget_amount'
  | 'final_budget_allocated'
  | 'actual_budget_approved'
  | 'latitude'
  | 'longitude'
  | 'radius_meters'
  | 'status';

export const BUDGET_PAGE_SIZE = 5;
