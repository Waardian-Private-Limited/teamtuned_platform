export const DEPARTMENT_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export type DepartmentStatusFilter = (typeof DEPARTMENT_STATUS_FILTER_OPTIONS)[number]['value'];

export const SEARCH_DEBOUNCE_MS = 500;

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const DEPARTMENT_PERMISSIONS = {
  VIEW: 'DEPT_VIEW',
  ADD: 'DEPT_ADD',
  EDIT: 'DEPT_EDIT',
  DELETE: 'DEPT_DELETE',
} as const;

export type DepartmentFieldName = 'name' | 'description' | 'status';
