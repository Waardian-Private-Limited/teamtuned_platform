import type {
  RoleDto,
  RoleListResponseDto,
  PermissionCategoryDto,
  EffectivePermissionCategoryDto,
  RoleDetailResponseDto,
  PermissionSetDto,
  RoleEmployeeDto,
  RoleEmployeeCandidateDto,
  RoleEmployeesResponseDto,
  BulkPreviewResponseDto,
  BulkApplyResponseDto,
  RoleAuditResponseDto,
} from './roles.dto';
import type {
  Role,
  RoleListResult,
  PermissionCategory,
  EffectivePermissionCategory,
  RoleDetail,
  PermissionSet,
  RoleEmployee,
  RoleEmployeeCandidate,
  RoleEmployees,
  BulkPreviewResult,
  BulkApplyResult,
  RoleAuditResult,
} from './roles.model';

export function toRole(dto: RoleDto): Role {
  return {
    id: dto.id,
    name: dto.name,
    departmentId: dto.department_id,
    departmentName: dto.department_name,
    description: dto.description,
    status: dto.status,
    permissions: dto.permissions || [],
    employeeCount: dto.employee_count,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function toRoleList(dto: RoleListResponseDto): RoleListResult {
  return {
    roles: (dto.roles || []).map(toRole),
    page: dto.page,
    pageSize: dto.pageSize,
    total: dto.total,
    pages: dto.pages,
  };
}

export function toPermissionCategory(dto: PermissionCategoryDto): PermissionCategory {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    sortOrder: dto.sort_order,
    permissions: dto.permissions.map((p) => ({ id: p.id, code: p.code, name: p.name, description: p.description })),
  };
}

export function toEffectivePermissionCategory(dto: EffectivePermissionCategoryDto): EffectivePermissionCategory {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    sortOrder: dto.sort_order,
    permissions: dto.permissions.map((p) => ({
      id: p.id, code: p.code, name: p.name, description: p.description, granted: p.granted,
    })),
  };
}

export function toRoleDetail(dto: RoleDetailResponseDto): RoleDetail {
  return {
    role: toRole(dto.role),
    effectivePermissions: (dto.effectivePermissions || []).map(toEffectivePermissionCategory),
  };
}

export function toPermissionSet(dto: PermissionSetDto): PermissionSet {
  return { id: dto.id, name: dto.name, description: dto.description, permissions: dto.permissions || [] };
}

export function toRoleEmployee(dto: RoleEmployeeDto): RoleEmployee {
  return {
    id: dto.id,
    name: [dto.first_name, dto.last_name].filter(Boolean).join(' '),
    designation: dto.designation,
    email: dto.email,
  };
}

export function toRoleEmployeeCandidate(dto: RoleEmployeeCandidateDto): RoleEmployeeCandidate {
  return {
    id: dto.id,
    name: [dto.first_name, dto.last_name].filter(Boolean).join(' '),
    designation: dto.designation,
    roleId: dto.role_id,
    roleName: dto.role_name,
  };
}

export function toRoleEmployees(dto: RoleEmployeesResponseDto): RoleEmployees {
  return {
    holders: (dto.holders || []).map(toRoleEmployee),
    candidates: (dto.candidates || []).map(toRoleEmployeeCandidate),
  };
}

export function toBulkPreview(dto: BulkPreviewResponseDto): BulkPreviewResult {
  return { action: dto.action, roles: dto.roles, totals: dto.totals };
}

export function toBulkApply(dto: BulkApplyResponseDto): BulkApplyResult {
  return { action: dto.action, batchId: dto.batchId, roles: dto.roles, totals: dto.totals };
}

export function toRoleAudit(dto: RoleAuditResponseDto): RoleAuditResult {
  return {
    entries: (dto.entries || []).map((e) => ({
      id: e.id, permissionCode: e.permissionCode, action: e.action, source: e.source, batchId: e.batchId, createdAt: e.createdAt,
    })),
    page: dto.page,
    pageSize: dto.pageSize,
    total: dto.total,
    pages: dto.pages,
  };
}
