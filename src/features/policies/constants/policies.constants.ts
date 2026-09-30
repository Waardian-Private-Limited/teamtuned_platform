export const POLICY_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
] as const;

export type PolicyStatusFilter = (typeof POLICY_STATUS_FILTER_OPTIONS)[number]['value'];

export const SEARCH_DEBOUNCE_MS = 500;

export const POLICY_PERMISSIONS = {
  VIEW: 'POLICY_VIEW',
  ADD: 'POLICY_ADD',
  EDIT: 'POLICY_EDIT',
  DELETE: 'POLICY_DELETE',
} as const;

export type PolicyFieldName = 'name' | 'code' | 'description' | 'config';

export const LEAVE_TYPE_CATEGORY_OPTIONS = [
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'statutory', label: 'Statutory' },
  { value: 'compensatory', label: 'Compensatory' },
  { value: 'special', label: 'Special' },
] as const;

export const LEAVE_TYPE_UNIT_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'half_day', label: 'Half day' },
  { value: 'hour', label: 'Hour' },
] as const;

// The three config sections every policy carries. One list, used by the
// create wizard, the editor's section tabs and the read-only config
// summary, so a renamed section is renamed in all three at once.
//
// Attendance capture, geofence, device binding and shift timings are NOT
// policy rules — they are per-employee settings configured when an
// employee is added.
export const POLICY_SECTIONS = [
  { value: 'workRules', label: 'Work Rules' },
  { value: 'leave', label: 'Leave' },
  { value: 'payrollCycle', label: 'Payroll Cycle' },
] as const;

export type PolicySectionKey = (typeof POLICY_SECTIONS)[number]['value'];

// Scope precedence mirrors the backend resolver (PolicyAssignmentPolicy's
// SCOPE_PRECEDENCE): the first match wins, `organization` is the fallback
// every employee lands on when nothing more specific is assigned.
export const SCOPE_TYPE_OPTIONS = [
  { value: 'employee', label: 'Employee', needsTarget: true },
  { value: 'role', label: 'Role', needsTarget: true },
  { value: 'department', label: 'Department', needsTarget: true },
  { value: 'site', label: 'Site', needsTarget: true },
  { value: 'sub_organization', label: 'Sub-organization', needsTarget: true },
  { value: 'employee_type', label: 'Employment type', needsTarget: true },
  { value: 'organization', label: 'Whole organization', needsTarget: false },
] as const;

// Scope types with no v2 list API of their own yet — the picker falls back
// to a plain numeric id for these two.
export const SCOPE_TYPES_WITHOUT_PICKER = ['employee'] as const;
