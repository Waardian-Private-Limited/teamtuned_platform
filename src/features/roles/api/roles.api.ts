import { apiClient } from '@/lib/apiClient';
import type {
  RoleDto,
  RoleListResponseDto,
  RoleDetailResponseDto,
  PermissionCatalogResponseDto,
  PermissionSetDto,
  RoleEmployeesResponseDto,
  BulkPreviewResponseDto,
  BulkApplyResponseDto,
  RoleAuditResponseDto,
  BulkAction,
} from '../types/roles.dto';

interface ListParams {
  search?: string;
  status?: string;
  departmentId?: number | null;
  page?: number;
  pageSize?: number;
}

interface RoleInput {
  name: string;
  departmentId: number | null;
  description: string;
  status: string;
  permissions: string[];
}

export function listRoles(params: ListParams = {}) {
  return apiClient.get<RoleListResponseDto>(
    '/roles',
    {
      search: params.search || undefined,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      department_id: params.departmentId || undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    { withAuth: true }
  );
}

export function getRole(id: number) {
  return apiClient.get<RoleDetailResponseDto>(`/roles/${id}`, undefined, { withAuth: true });
}

function toBody(input: RoleInput) {
  return {
    name: input.name,
    department_id: input.departmentId,
    description: input.description,
    status: input.status,
    permissions: input.permissions,
  };
}

export function createRole(input: RoleInput) {
  return apiClient.post<RoleDto>('/roles', toBody(input), { withAuth: true });
}

export function updateRole(id: number, input: RoleInput) {
  return apiClient.put<RoleDto>(`/roles/${id}`, toBody(input), { withAuth: true });
}

export function updateRoleStatus(id: number, status: string) {
  return apiClient.patch<RoleDto>(`/roles/${id}/status`, { status }, { withAuth: true });
}

export function deleteRole(id: number) {
  return apiClient.delete<{ success: boolean }>(`/roles/${id}`, { withAuth: true });
}

export function cloneRole(id: number, name?: string) {
  return apiClient.post<RoleDto>(`/roles/${id}/clone`, { name }, { withAuth: true });
}

export function listRoleEmployees(id: number, search?: string) {
  return apiClient.get<RoleEmployeesResponseDto>(
    `/roles/${id}/employees`,
    { search: search !== undefined ? search : undefined },
    { withAuth: true }
  );
}

export function assignRoleEmployees(id: number, employeeIds: number[]) {
  return apiClient.put<{ success: boolean }>(`/roles/${id}/employees`, { employee_ids: employeeIds }, { withAuth: true });
}

// DELETE has no body slot in apiClient (matches removeDepartmentHead's
// convention) — the target employee ids travel as a query param instead.
export function removeRoleEmployees(id: number, employeeIds: number[]) {
  return apiClient.delete<{ success: boolean }>(
    `/roles/${id}/employees?employee_ids=${employeeIds.join(',')}`,
    { withAuth: true }
  );
}

export function listRoleAudit(id: number, page = 1, pageSize = 20) {
  return apiClient.get<RoleAuditResponseDto>(`/roles/${id}/audit`, { page, pageSize }, { withAuth: true });
}

export function listPermissionCatalog() {
  return apiClient.get<PermissionCatalogResponseDto>('/roles/permissions', undefined, { withAuth: true });
}

export function listPermissionSets() {
  return apiClient.get<{ sets: PermissionSetDto[] }>('/roles/permission-sets', undefined, { withAuth: true });
}

export function createPermissionSet(input: { name: string; description: string; permissions: string[] }) {
  return apiClient.post<PermissionSetDto>('/roles/permission-sets', input, { withAuth: true });
}

export function updatePermissionSet(id: number, input: { name: string; description: string; permissions: string[] }) {
  return apiClient.put<PermissionSetDto>(`/roles/permission-sets/${id}`, input, { withAuth: true });
}

export function deletePermissionSet(id: number) {
  return apiClient.delete<{ success: boolean }>(`/roles/permission-sets/${id}`, { withAuth: true });
}

interface BulkInput {
  roleIds: number[];
  setIds: number[];
  extraCodes: string[];
  action: BulkAction;
}

function bulkBody(input: BulkInput) {
  return { role_ids: input.roleIds, set_ids: input.setIds, permissions: input.extraCodes, action: input.action };
}

export function previewBulkPermissions(input: BulkInput) {
  return apiClient.post<BulkPreviewResponseDto>('/roles/bulk-permissions/preview', bulkBody(input), { withAuth: true });
}

export function applyBulkPermissions(input: BulkInput) {
  return apiClient.post<BulkApplyResponseDto>('/roles/bulk-permissions', bulkBody(input), { withAuth: true });
}
