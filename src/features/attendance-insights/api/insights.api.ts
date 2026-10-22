import { apiClient } from '@/lib/apiClient';
import type { EmployeeInsightsDto, InsightFilters, InsightGroup, InsightsDto, InsightSort } from '../types/insights.dto';

const auth = { withAuth: true } as const;

const params = (f: InsightFilters) => ({
  period: f.period,
  date: f.date || undefined,
  year_start: f.yearStart,
  subOrgId: f.subOrgId ?? undefined,
  site_id: f.siteId ?? undefined,
  department_id: f.departmentId ?? undefined,
  role_id: f.roleId ?? undefined,
});

export interface InsightsQuery {
  group: InsightGroup;
  sort?: InsightSort;
  dir?: 'asc' | 'desc';
  search?: string;
  limit?: number;
  offset?: number;
}

/** Figures for the period: totals, trend, boards, and rows by site, department or employee. */
export function getInsights(filters: InsightFilters, q: InsightsQuery, signal?: AbortSignal) {
  return apiClient.get<InsightsDto>('/attendance-dashboard/insights', { ...params(filters), ...q, search: q.search || undefined }, { ...auth, signal });
}

/** One person's figures for the period, compared with their department, site and everyone in reach. */
export function getEmployeeInsights(filters: InsightFilters, employeeId: number, signal?: AbortSignal) {
  return apiClient.get<EmployeeInsightsDto>(`/attendance-dashboard/insights/employees/${employeeId}`, params(filters), { ...auth, signal });
}
