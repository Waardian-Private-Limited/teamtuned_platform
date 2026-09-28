// Wire shapes returned by /api/v1/policies — mirrors the backend DTOs
// exactly (see teamtuned_backend/src/modules/policies/application/dto).
//
// One policy bundles work-hour rules, leave entitlement and payment cycle
// as ONE thing an employee is assigned to — matching the legacy
// `attendance_policies` / `employees.attendance_policy_id` model. There is
// no "policy kind" and no group/bundle concept.

export type PolicyStatus = 'active' | 'inactive' | 'archived';
export type VersionStatus = 'draft' | 'published' | 'superseded';

export interface PolicyDto {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: PolicyStatus;
  is_default: boolean;
  current_version_id: number | null;
  sub_organization_id: number | null;
  created_at?: string;
  updated_at?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PolicyConfig = any;

export interface PolicyVersionDto {
  id: number;
  policy_id: number;
  version_no: number;
  status: VersionStatus;
  effective_from: string;
  effective_to: string | null;
  config: PolicyConfig;
  config_schema_version: number;
  change_note: string | null;
  published_at: string | null;
  published_by: number | null;
  created_at?: string;
}

export interface PolicyDetailDto extends PolicyDto {
  current_version: PolicyVersionDto | null;
  draft_version: PolicyVersionDto | null;
}

export interface PolicyListResponseDto {
  policies: PolicyDto[];
  total: number;
}

export interface PolicyVersionListResponseDto {
  versions: PolicyVersionDto[];
}

export interface PolicyImpactDto {
  affected_employee_count: number;
  sample_deltas: Array<{
    employee_id: number;
    leave_type_id: number | null;
    current: number;
    projected: number;
    delta: number;
  }>;
  warnings: Array<{ employeeId?: number; leaveTypeId?: number; message: string }>;
}

export interface PayCalendarPeriodDto {
  cycleStart: string;
  cycleEnd: string;
  payDate: string;
}

export interface PayCalendarResponseDto {
  periods: PayCalendarPeriodDto[];
}

export type ScopeType = 'organization' | 'sub_organization' | 'site' | 'department' | 'role' | 'employee_type' | 'employee';

export interface PolicyAssignmentDto {
  id: number;
  policy_id: number;
  scope_type: ScopeType;
  scope_id: number | null;
  priority: number;
  effective_from: string;
  effective_to: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface PolicyAssignmentListResponseDto {
  assignments: PolicyAssignmentDto[];
}

export interface ResolvedPolicyDto {
  policyId: number;
  versionId: number;
  versionNo: number;
  config: PolicyConfig;
}

export interface ResolveEmployeePoliciesResponseDto {
  employee_id: number;
  date: string;
  policy: ResolvedPolicyDto;
}

export type LeaveTypeCategory = 'paid' | 'unpaid' | 'statutory' | 'compensatory' | 'special';
export type LeaveTypeUnit = 'day' | 'half_day' | 'hour';
export type GenderEligibility = 'any' | 'male' | 'female' | 'other';

export interface LeaveTypeDto {
  id: number;
  code: string;
  name: string;
  short_code: string | null;
  color: string | null;
  icon: string | null;
  category: LeaveTypeCategory;
  unit: LeaveTypeUnit;
  is_paid: boolean;
  affects_payroll: boolean;
  counts_as_present: boolean;
  gender_eligibility: GenderEligibility;
  requires_approval: boolean;
  requires_attachment: boolean;
  attachment_after_days: number | null;
  allow_half_day: boolean;
  allow_hourly: boolean;
  allow_negative_balance: boolean;
  max_negative_balance: number | null;
  is_system: boolean;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string | null;
}

export interface LeaveTypeListResponseDto {
  leave_types: LeaveTypeDto[];
}

export interface SeedLeaveTypeCatalogResponseDto {
  created_count: number;
  leave_types: LeaveTypeDto[];
}
