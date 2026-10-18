import { apiClient } from '@/lib/apiClient';
import type {
  EmployeeSiteListResponseDto,
  EmployeeSiteDetailDto,
  SiteOptionsResponseDto,
  OtherLocationsResponseDto,
  UpdateEmployeeSitesBodyDto,
} from '../types/employeeSites.dto';
import type { SiteSegment } from '../constants/employeeSites.constants';

interface ListParams {
  search?: string;
  departmentId?: number | null;
  siteId?: number | null;
  segment?: SiteSegment;
  subOrgId?: number | null;
  page?: number;
  pageSize?: number;
}

export function listEmployeeSites(params: ListParams = {}) {
  return apiClient.get<EmployeeSiteListResponseDto>(
    '/employee-sites',
    {
      search: params.search || undefined,
      department_id: params.departmentId || undefined,
      site_id: params.siteId || undefined,
      unassigned: params.segment === 'unassigned' ? 1 : undefined,
      incharge_only: params.segment === 'incharge' ? 1 : undefined,
      subOrgId: params.subOrgId ?? undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    { withAuth: true }
  );
}

export function getEmployeeSites(employeeId: number) {
  return apiClient.get<EmployeeSiteDetailDto>(`/employee-sites/${employeeId}`, undefined, { withAuth: true });
}

export function updateEmployeeSites(employeeId: number, body: UpdateEmployeeSitesBodyDto) {
  return apiClient.put<EmployeeSiteDetailDto>(`/employee-sites/${employeeId}/sites`, body, { withAuth: true });
}

export function searchSiteOptions(params: { search?: string; employeeId?: number | null; limit?: number } = {}) {
  return apiClient.get<SiteOptionsResponseDto>(
    '/employee-sites/options/sites',
    {
      search: params.search || undefined,
      employee_id: params.employeeId || undefined,
      limit: params.limit,
    },
    { withAuth: true }
  );
}

// Other locations still live on the legacy organization routes; the drawer
// reuses them as they are.
export function listOtherLocations() {
  return apiClient.get<OtherLocationsResponseDto>('/organization/employees/other-locations', undefined, { withAuth: true });
}

export function updateEmployeeOtherLocations(employeeId: number, locationIds: number[]) {
  return apiClient.put<{ success: boolean; assigned_count: number }>(
    `/organization/employees/${employeeId}/other-locations`,
    { location_ids: locationIds },
    { withAuth: true }
  );
}

// The legacy department list has no permission gate, so anyone who can open
// this screen can fill the department filter. Without paging params it
// returns a plain array.
export function listDepartmentOptions() {
  return apiClient.get<Array<{ id: number; name: string }>>('/organization/departments', undefined, { withAuth: true });
}
