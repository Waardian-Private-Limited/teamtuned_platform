export const ROSTER_PERMISSIONS = {
  VIEW: 'ROSTER_VIEW',
  ADD: 'ROSTER_ADD',
  EDIT: 'ROSTER_EDIT',
  PUBLISH: 'ROSTER_PUBLISH',
  APPROVE: 'ROSTER_APPROVE',
  DELETE: 'ROSTER_DELETE',
} as const;

export const ROSTER_ANY_PERMISSIONS = Object.values(ROSTER_PERMISSIONS);

export const ROSTER_FEATURE = 'ROSTER_FEATURE';

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const ALL_DAYS_MASK = 127;

export const APPROVAL_LEVEL_LABELS: Record<string, string> = {
  unit_manager: 'Team manager',
  reporting_manager: "Requester's reporting manager",
  permission: 'Anyone with roster approval access',
  employee: 'A specific person',
  peer: 'Colleague',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  generating: 'Generating',
  review: 'In review',
  published: 'Published',
  archived: 'Archived',
  failed: 'Failed',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  expired: 'Expired',
  open: 'Open',
  filled: 'Filled',
  closed: 'Closed',
};

export const VIOLATION_LABELS: Record<string, string> = {
  understaffed: 'Not enough people on the shift',
  interval_gap: 'Hours with too few people',
  rest: 'Too little rest between shifts',
  overlap: 'Overlapping shifts',
  double_shift: 'Two shifts on one day',
  consecutive_days: 'Too many working days in a row',
  consecutive_nights: 'Too many night shifts in a row',
  night_block_rest: 'Rest missing after a run of nights',
  weekly_hours: 'Over the weekly hours limit',
  weekly_off: 'Weekly off day missing',
  min_weekly_hours: 'Under the minimum weekly hours',
  leave: 'Shift on a leave day',
  unavailable: 'Shift on an unavailable day',
};

export const KIND_LABELS: Record<string, string> = {
  shift: 'Shift',
  off: 'Off',
  leave: 'Leave',
  holiday: 'Holiday',
  comp_off: 'Comp off',
  unavailable: 'Unavailable',
};

export const DEFAULT_FILTERS = { siteIds: [], departmentIds: [], roleIds: [], employmentTypeIds: [] };
