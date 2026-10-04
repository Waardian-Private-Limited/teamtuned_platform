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
