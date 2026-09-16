// Wire shapes returned by /api/v1/roles — mirrors the backend DTOs exactly
// (see teamtuned_backend/src/modules/roles/application/dto).

export interface RoleDto {
  id: number;
  name: string;
  department_id: number | null;
  department_name: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  permissions: string[];
  employee_count: number;
  created_by: number | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface RoleListResponseDto {
  roles: RoleDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface PermissionDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export interface EffectivePermissionDto extends PermissionDto {
  granted: boolean;
}

export interface PermissionCategoryDto {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  permissions: PermissionDto[];
}

export interface EffectivePermissionCategoryDto extends Omit<PermissionCategoryDto, 'permissions'> {
  permissions: EffectivePermissionDto[];
}

export interface PermissionCatalogResponseDto {
  categories: PermissionCategoryDto[];
}

export interface RoleDetailResponseDto {
  role: RoleDto;
  effectivePermissions: EffectivePermissionCategoryDto[];
}

export interface PermissionSetDto {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
  created_by: number | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface RoleEmployeeDto {
  id: number;
  first_name: string;
  last_name: string;
  designation: string | null;
  email?: string | null;
}

export interface RoleEmployeeCandidateDto {
  id: number;
  first_name: string;
  last_name: string;
  designation: string | null;
  role_id: number | null;
  role_name: string | null;
}

export interface RoleEmployeesResponseDto {
  holders: RoleEmployeeDto[];
  candidates: RoleEmployeeCandidateDto[];
}

export type BulkAction = 'grant' | 'revoke' | 'replace';

export interface BulkRoleDiffDto {
  id: number;
  name: string;
  adds: string[];
  removes: string[];
}

export interface BulkPreviewResponseDto {
  action: BulkAction;
  roles: BulkRoleDiffDto[];
  totals: { adds: number; removes: number };
}

export interface BulkApplyResponseDto {
  action: BulkAction;
  batchId: string;
  roles: Array<{ id: number; name: string }>;
  totals: { adds: number; removes: number };
}

export interface RoleAuditEntryDto {
  id: number;
  permissionCode: string;
  action: 'grant' | 'revoke';
  source: 'single' | 'bulk' | 'clone' | 'seed';
  batchId: string | null;
  actorUserId: number | null;
  createdAt: string;
}

export interface RoleAuditResponseDto {
  entries: RoleAuditEntryDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}
