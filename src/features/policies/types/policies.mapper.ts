import type {
  PolicyDto,
  PolicyDetailDto,
  PolicyVersionDto,
  PolicyListResponseDto,
  PolicyImpactDto,
  PayCalendarPeriodDto,
  PolicyAssignmentDto,
  LeaveTypeDto,
} from './policies.dto';
import type {
  Policy,
  PolicyDetail,
  PolicyVersion,
  PolicyListResult,
  PolicyImpact,
  PayCalendarPeriod,
  PolicyAssignment,
  LeaveType,
} from './policies.model';

export function toPolicy(dto: PolicyDto): Policy {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    description: dto.description,
    status: dto.status,
    isDefault: dto.is_default,
    currentVersionId: dto.current_version_id,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function toPolicyList(dto: PolicyListResponseDto): PolicyListResult {
  return { policies: (dto.policies || []).map(toPolicy), total: dto.total };
}

export function toPolicyVersion(dto: PolicyVersionDto | null): PolicyVersion | null {
  if (!dto) return null;
  return {
    id: dto.id,
    policyId: dto.policy_id,
    versionNo: dto.version_no,
    status: dto.status,
    effectiveFrom: dto.effective_from,
    effectiveTo: dto.effective_to,
    config: dto.config,
    configSchemaVersion: dto.config_schema_version,
    changeNote: dto.change_note,
    publishedAt: dto.published_at,
    createdAt: dto.created_at,
  };
}

export function toPolicyVersionList(dtos: PolicyVersionDto[]): PolicyVersion[] {
  return (dtos || []).map((d) => toPolicyVersion(d)!).filter(Boolean);
}

export function toPolicyDetail(dto: PolicyDetailDto): PolicyDetail {
  return {
    ...toPolicy(dto),
    currentVersion: toPolicyVersion(dto.current_version),
    draftVersion: toPolicyVersion(dto.draft_version),
  };
}

export function toPolicyImpact(dto: PolicyImpactDto): PolicyImpact {
  return {
    affectedEmployeeCount: dto.affected_employee_count,
    sampleDeltas: (dto.sample_deltas || []).map((d) => ({
      employeeId: d.employee_id,
      leaveTypeId: d.leave_type_id,
      current: d.current,
      projected: d.projected,
      delta: d.delta,
    })),
    warnings: (dto.warnings || []).map((w) => ({ message: w.message })),
  };
}

export function toPayCalendarPeriods(dtos: PayCalendarPeriodDto[]): PayCalendarPeriod[] {
  return (dtos || []).map((d) => ({ cycleStart: d.cycleStart, cycleEnd: d.cycleEnd, payDate: d.payDate }));
}

export function toPolicyAssignment(dto: PolicyAssignmentDto): PolicyAssignment {
  return {
    id: dto.id,
    policyId: dto.policy_id,
    scopeType: dto.scope_type,
    scopeId: dto.scope_id,
    priority: dto.priority,
    effectiveFrom: dto.effective_from,
    effectiveTo: dto.effective_to,
    status: dto.status,
  };
}

export function toPolicyAssignments(dtos: PolicyAssignmentDto[]): PolicyAssignment[] {
  return (dtos || []).map(toPolicyAssignment);
}

export function toLeaveType(dto: LeaveTypeDto): LeaveType {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    shortCode: dto.short_code,
    color: dto.color,
    icon: dto.icon,
    category: dto.category,
    unit: dto.unit,
    isPaid: dto.is_paid,
    affectsPayroll: dto.affects_payroll,
    countsAsPresent: dto.counts_as_present,
    genderEligibility: dto.gender_eligibility,
    requiresApproval: dto.requires_approval,
    requiresAttachment: dto.requires_attachment,
    attachmentAfterDays: dto.attachment_after_days,
    allowHalfDay: dto.allow_half_day,
    allowHourly: dto.allow_hourly,
    allowNegativeBalance: dto.allow_negative_balance,
    isSystem: dto.is_system,
    sortOrder: dto.sort_order,
    status: dto.status,
  };
}

export function toLeaveTypes(dtos: LeaveTypeDto[]): LeaveType[] {
  return (dtos || []).map(toLeaveType);
}
