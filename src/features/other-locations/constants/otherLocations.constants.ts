import type { OtherLocationType } from './../types/otherLocations.dto';

export const OTHER_LOCATION_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export type OtherLocationStatusFilter = (typeof OTHER_LOCATION_STATUS_FILTER_OPTIONS)[number]['value'];

export const OTHER_LOCATION_TYPE_OPTIONS: { value: OtherLocationType; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'client', label: 'Client Site' },
  { value: 'field', label: 'Field Location' },
  { value: 'other', label: 'Other' },
];

export const OTHER_LOCATION_TYPE_LABELS: Record<OtherLocationType, string> = {
  home: 'Home',
  client: 'Client',
  field: 'Field',
  other: 'Other',
};

export const SEARCH_DEBOUNCE_MS = 400;

export const OTHER_LOCATION_PERMISSIONS = {
  ADD: 'OTHER_LOCATION_ADD',
  EDIT: 'OTHER_LOCATION_EDIT',
  DELETE: 'OTHER_LOCATION_DELETE',
} as const;

export type OtherLocationFieldName = 'location_name' | 'latitude' | 'longitude' | 'radius' | 'status';
