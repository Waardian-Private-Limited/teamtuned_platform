import { apiClient } from '@/lib/apiClient';
import type { DashboardFilters, EmployeesResponseDto, EmployeeView, FilterOptionsDto, OverviewDto } from '../types/dashboard.dto';

const auth = { withAuth: true } as const;

const params = (f: Partial<DashboardFilters>) => ({
  date: f.date || undefined,
  subOrgId: f.subOrgId ?? undefined,
  site_id: f.siteId ?? undefined,
  department_id: f.departmentId ?? undefined,
  role_id: f.roleId ?? undefined,
});

export function getFilterOptions(subOrgId: number | null, departmentId: number | null, signal?: AbortSignal) {
  return apiClient.get<FilterOptionsDto>('/attendance-dashboard/filters', { subOrgId: subOrgId ?? undefined, department_id: departmentId ?? undefined }, { ...auth, signal });
}

export function getOverview(filters: DashboardFilters, signal?: AbortSignal) {
  return apiClient.get<OverviewDto>('/attendance-dashboard/overview', params(filters), { ...auth, signal });
}

export function getEmployees(filters: DashboardFilters, view: EmployeeView, search: string, page: number, pageSize: number, signal?: AbortSignal) {
  return apiClient.get<EmployeesResponseDto>(
    '/attendance-dashboard/employees',
    { ...params(filters), status: view, search: search || undefined, limit: pageSize, offset: (page - 1) * pageSize },
    { ...auth, signal },
  );
}
