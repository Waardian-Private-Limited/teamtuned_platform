// UI-facing domain types. policies.mapper.ts is the only place these meet
// the wire DTOs (policies.dto.ts).
//
// One policy = one thing an employee is assigned to, with three config
// sections (workRules, leave, payrollCycle). No "kind", no groups.
// Attendance capture and shift timings are per-employee settings, not
// policy rules.

export type PolicyStatus = 'active' | 'inactive' | 'archived';
export type VersionStatus = 'draft' | 'published' | 'superseded';

export interface Policy {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: PolicyStatus;
  isDefault: boolean;
  currentVersionId: number | null;
  subOrganizationId: number | null;
  createdAt?: string;
  updatedAt?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PolicyConfig = any;

export interface PolicyVersion {
  id: number;
  policyId: number;
  versionNo: number;
  status: VersionStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  config: PolicyConfig;
  configSchemaVersion: number;
  changeNote: string | null;
  publishedAt: string | null;
  createdAt?: string;
}

export interface PolicyDetail extends Policy {
  currentVersion: PolicyVersion | null;
  draftVersion: PolicyVersion | null;
}

export interface PolicyListResult {
  policies: Policy[];
  total: number;
}

export interface PolicyImpact {
  affectedEmployeeCount: number;
  sampleDeltas: Array<{ employeeId: number; leaveTypeId: number | null; current: number; projected: number; delta: number }>;
  warnings: Array<{ message: string }>;
}

export interface PayCalendarPeriod {
  cycleStart: string;
  cycleEnd: string;
  payDate: string;
}

export type ScopeType = 'organization' | 'sub_organization' | 'site' | 'department' | 'role' | 'employee_type' | 'employee';

export interface PolicyAssignment {
  id: number;
  policyId: number;
  scopeType: ScopeType;
  scopeId: number | null;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'active' | 'inactive';
}

export type LeaveTypeCategory = 'paid' | 'unpaid' | 'statutory' | 'compensatory' | 'special';
export type LeaveTypeUnit = 'day' | 'half_day' | 'hour';
export type GenderEligibility = 'any' | 'male' | 'female' | 'other';

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  shortCode: string | null;
  color: string | null;
  icon: string | null;
  category: LeaveTypeCategory;
  unit: LeaveTypeUnit;
  isPaid: boolean;
  affectsPayroll: boolean;
  countsAsPresent: boolean;
  genderEligibility: GenderEligibility;
  requiresApproval: boolean;
  requiresAttachment: boolean;
  attachmentAfterDays: number | null;
  allowHalfDay: boolean;
  allowHourly: boolean;
  allowNegativeBalance: boolean;
  isSystem: boolean;
  sortOrder: number;
  status: 'active' | 'inactive';
}

export interface PolicyFormInput {
  name: string;
  code: string;
  description: string;
  config?: PolicyConfig;
  effectiveFrom?: string;
  subOrganizationId: number | null;
}

export interface LeaveTypeFormInput {
  name: string;
  code: string;
  category: LeaveTypeCategory;
  unit: LeaveTypeUnit;
  isPaid: boolean;
  requiresApproval: boolean;
  allowHalfDay: boolean;
  status: 'active' | 'inactive';
}
