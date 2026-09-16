export const ROLE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export type RoleStatusFilter = (typeof ROLE_STATUS_FILTER_OPTIONS)[number]['value'];

export const SEARCH_DEBOUNCE_MS = 500;

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const ROLE_PERMISSIONS = {
  VIEW: 'ROLE_VIEW',
  ADD: 'ROLE_ADD',
  EDIT: 'ROLE_EDIT',
  DELETE: 'ROLE_DELETE',
} as const;

export type RoleFieldName = 'name' | 'description' | 'status' | 'departmentId';

export const BULK_ACTION_OPTIONS = [
  { value: 'grant', label: 'Grant', description: 'Add the selected permissions to every chosen role.' },
  { value: 'revoke', label: 'Revoke', description: 'Remove the selected permissions from every chosen role.' },
  { value: 'replace', label: 'Replace', description: "Set each chosen role's permissions to exactly this set." },
] as const;
