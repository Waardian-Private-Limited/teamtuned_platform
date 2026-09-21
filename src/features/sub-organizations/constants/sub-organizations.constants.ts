export const SEARCH_DEBOUNCE_MS = 500;
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const SUB_ORG_PERMISSIONS = {
  VIEW: 'SITE_VIEW',
  ADD: 'SITE_ADD',
  EDIT: 'SITE_EDIT',
  DELETE: 'SITE_DELETE',
} as const;

export const SUB_ORG_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export type SubOrgStatusFilter = (typeof SUB_ORG_STATUS_FILTER_OPTIONS)[number]['value'];

export type SubOrgFieldName = 'name' | 'code' | 'address' | 'gst_number' | 'logo_url';

export const GST_LENGTH = 15;
