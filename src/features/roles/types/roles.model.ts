// UI-facing domain types. roles.mapper.ts is the only place these meet the
// wire DTOs (roles.dto.ts).

export type RoleStatus = 'active' | 'inactive';
export type BulkAction = 'grant' | 'revoke' | 'replace';

export interface Role {
  id: number;
  name: string;
  departmentId: number | null;
  departmentName: string | null;
  description: string | null;
  status: RoleStatus;
  permissions: string[];
  employeeCount: number;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface RoleListResult {
  roles: Role[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export interface EffectivePermission extends Permission {
  granted: boolean;
}

export interface PermissionCategory {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  permissions: Permission[];
}

export interface EffectivePermissionCategory extends Omit<PermissionCategory, 'permissions'> {
  permissions: EffectivePermission[];
}

export interface RoleDetail {
  role: Role;
  effectivePermissions: EffectivePermissionCategory[];
}

export interface PermissionSet {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
}

export interface RoleFormInput {
  name: string;
  departmentId: number | null;
  description: string;
  status: RoleStatus;
  permissions: string[];
}

export interface RoleEmployee {
  id: number;
  name: string;
  designation: string | null;
  email?: string | null;
}

export interface RoleEmployeeCandidate {
  id: number;
  name: string;
  designation: string | null;
  roleId: number | null;
  roleName: string | null;
}

export interface RoleEmployees {
  holders: RoleEmployee[];
  candidates: RoleEmployeeCandidate[];
}

export interface BulkRoleDiff {
  id: number;
  name: string;
  adds: string[];
  removes: string[];
}

export interface BulkPreviewResult {
  action: BulkAction;
  roles: BulkRoleDiff[];
  totals: { adds: number; removes: number };
}

export interface BulkApplyResult {
  action: BulkAction;
  batchId: string;
  roles: Array<{ id: number; name: string }>;
  totals: { adds: number; removes: number };
}

export interface RoleAuditEntry {
  id: number;
  permissionCode: string;
  action: 'grant' | 'revoke';
  source: 'single' | 'bulk' | 'clone' | 'seed';
  batchId: string | null;
  createdAt: string;
}

export interface RoleAuditResult {
  entries: RoleAuditEntry[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}
