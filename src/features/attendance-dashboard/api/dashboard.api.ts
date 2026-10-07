import { apiClient } from '@/lib/apiClient';
import type { DashboardFilters, EmployeesResponseDto, EmployeeView, FilterOptionsDto, LeaderBoardKey, LeaderBoardPageDto, LeaderPeriod, LeadersDto, OverviewDto } from '../types/dashboard.dto';

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

/** The top few of every leaderboard for the day, week or month ending on the date. */
export function getLeaders(filters: DashboardFilters, period: LeaderPeriod, signal?: AbortSignal) {
  return apiClient.get<LeadersDto>('/attendance-dashboard/leaders', { ...params(filters), period }, { ...auth, signal });
}

/** One leaderboard's full ranking, a page at a time. */
export function getLeaderBoard(filters: DashboardFilters, period: LeaderPeriod, board: LeaderBoardKey, page: number, pageSize: number, signal?: AbortSignal) {
  return apiClient.get<LeaderBoardPageDto>(
    '/attendance-dashboard/leaders',
    { ...params(filters), period, board, limit: pageSize, offset: (page - 1) * pageSize },
    { ...auth, signal },
  );
}
