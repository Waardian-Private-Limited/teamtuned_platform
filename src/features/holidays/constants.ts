import type { HolidaySession } from './types/holidays';

export const HOLIDAY_PERMISSIONS = {
  ADD: 'HOLIDAY_ADD',
  EDIT: 'HOLIDAY_EDIT',
  DELETE: 'HOLIDAY_DELETE',
} as const;

export const SESSION_LABEL: Record<HolidaySession, string> = {
  full: 'Full day',
  first_half: 'First half',
  second_half: 'Second half',
};

export const HOLIDAY_TYPES = ['National', 'Regional', 'Festival', 'Company', 'Restricted'];

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;
export type HolidayStatusFilter = (typeof STATUS_OPTIONS)[number]['value'];

export const OPTIONAL_STATE_LABEL: Record<string, string> = {
  pending: 'Waiting for approval',
  approved: 'You are off',
  rejected: 'Not approved',
};

/** Why an optional holiday cannot be taken, in words; a code with no entry is not shown. */
export const OPTIONAL_BLOCKED_TEXT: Record<string, string> = {
  HOLIDAY_OPTIONAL_WINDOW_CLOSED: 'Time to apply has passed',
  HOLIDAY_OPTIONAL_LIMIT_REACHED: 'Limit for the year used',
};
