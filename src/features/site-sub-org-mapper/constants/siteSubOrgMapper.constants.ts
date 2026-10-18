export const SEARCH_DEBOUNCE_MS = 500;
export const OPTION_SEARCH_DEBOUNCE_MS = 300;

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const MAPPER_PERMISSIONS = {
  VIEW: 'SITE_VIEW',
  ADD: 'SITE_ADD',
  EDIT: 'SITE_EDIT',
  DELETE: 'SITE_DELETE',
} as const;

export type MappingFieldName = 'siteId' | 'subOrgId';
