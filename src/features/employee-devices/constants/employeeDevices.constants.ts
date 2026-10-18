export const EMP_DEVICE_PERMISSION = 'EMP_DEVICE_MANAGEMENT';

export const DEVICE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'registered', label: 'Registered' },
  { value: 'blocked_pending', label: 'Waiting' },
  { value: 'none', label: 'No phone' },
] as const;

export type DeviceStatusFilter = (typeof DEVICE_STATUS_FILTER_OPTIONS)[number]['value'];

export const DEVICE_PLATFORM_FILTER_OPTIONS = [
  { value: 'all', label: 'Any phone' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iPhone' },
] as const;

export type DevicePlatformFilter = (typeof DEVICE_PLATFORM_FILTER_OPTIONS)[number]['value'];

export const SEARCH_DEBOUNCE_MS = 400;
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
