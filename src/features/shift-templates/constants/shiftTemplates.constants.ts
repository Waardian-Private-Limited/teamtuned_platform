export const SHIFT_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export type ShiftStatusFilter = (typeof SHIFT_STATUS_FILTER_OPTIONS)[number]['value'];

export const SEARCH_DEBOUNCE_MS = 500;
export const DEFAULT_PAGE_SIZE = 10;

// Shift timings are attendance configuration: same permission family as the
// backend routes (shiftTemplatesRoutes.js).
export const SHIFT_PERMISSIONS = {
  VIEW: 'ATTENDCONFIG_VIEW',
  ADD: 'ATTENDCONFIG_ADD',
  EDIT: 'ATTENDCONFIG_EDIT',
  DELETE: 'ATTENDCONFIG_DELETE',
} as const;

// Matches the backend's `details.field` names so a server rejection lands on
// the right input.
export type ShiftFieldName = 'name' | 'short_code' | 'start_time' | 'end_time' | 'break_minutes';
export const SHIFT_FIELD_NAMES: readonly ShiftFieldName[] = ['name', 'short_code', 'start_time', 'end_time', 'break_minutes'];
