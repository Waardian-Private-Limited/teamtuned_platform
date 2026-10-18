export const SITE_SEGMENT_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'incharge', label: 'In-charge' },
] as const;

export type SiteSegment = (typeof SITE_SEGMENT_OPTIONS)[number]['value'];

export const SEARCH_DEBOUNCE_MS = 400;
export const SITE_SEARCH_DEBOUNCE_MS = 300;

export const DEFAULT_PAGE_SIZE = 20;

export const EMPLOYEE_SITE_PERMISSIONS = {
  VIEW: 'EMPSITE_VIEW',
  ASSIGN: 'EMPLOYEE_ASSIGN_SITE',
} as const;

// Location rules whose punch pool includes the employee's other locations
// (mirrors the attendance LocationGate pools on the backend).
export const MODES_USING_OTHER_LOCATIONS = new Set(['other_locations', 'exception', 'flagged']);

export type EmployeeSiteFieldName = 'sites' | 'primary' | 'locationAccess' | 'otherLocations';

// Editor drawer tabs and the fields each one owns, so a save error can bring
// its tab forward.
export const SITE_EDITOR_TABS = [
  { value: 'sites', label: 'Sites' },
  { value: 'other', label: 'Other locations' },
] as const;

export type SiteEditorTab = (typeof SITE_EDITOR_TABS)[number]['value'];

export const SITE_EDITOR_TAB_FIELDS: Record<SiteEditorTab, readonly EmployeeSiteFieldName[]> = {
  sites: ['sites', 'primary', 'locationAccess'],
  other: ['otherLocations'],
};
