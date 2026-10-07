import { apiClient } from '@/lib/apiClient';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type { DayDetailDto, ExportRequest, ListResponseDto, MonthResponseDto, OverridePreviewDto, OverrideStatus } from '../types/detailed.dto';

const auth = { withAuth: true } as const;
const BASE = '/attendance-records';

export interface ListQuery {
  date: string;
  subOrgId: number | null;
  siteId: number | null;
  departmentId: number | null;
  roleId: number | null;
  search: string;
  page: number;
  pageSize: number;
}

export function getFilterOptions(subOrgId: number | null, departmentId: number | null, signal?: AbortSignal) {
  return apiClient.get<FilterOptionsDto>(`${BASE}/filters`, { subOrgId: subOrgId ?? undefined, department_id: departmentId ?? undefined }, { ...auth, signal });
}

export function listEmployees(q: ListQuery, signal?: AbortSignal) {
  return apiClient.get<ListResponseDto>(
    `${BASE}/employees`,
    {
      date: q.date || undefined,
      subOrgId: q.subOrgId ?? undefined,
      site_id: q.siteId ?? undefined,
      department_id: q.departmentId ?? undefined,
      role_id: q.roleId ?? undefined,
      search: q.search || undefined,
      limit: q.pageSize,
      offset: (q.page - 1) * q.pageSize,
    },
    { ...auth, signal },
  );
}

export function getMonth(employeeId: number, month: string, signal?: AbortSignal) {
  return apiClient.get<MonthResponseDto>(`${BASE}/employees/${employeeId}/month`, { month }, { ...auth, signal });
}

export function getDay(employeeId: number, date: string, signal?: AbortSignal) {
  return apiClient.get<DayDetailDto>(`${BASE}/employees/${employeeId}/days/${date}`, undefined, { ...auth, signal });
}

export function previewOverride(employeeId: number, date: string, body: { status?: OverrideStatus; clear?: boolean }, signal?: AbortSignal) {
  return apiClient.post<OverridePreviewDto>(`${BASE}/employees/${employeeId}/days/${date}/override/preview`, body, { ...auth, signal });
}

export function setOverride(employeeId: number, date: string, body: { status: OverrideStatus; reason: string }) {
  return apiClient.put<{ day: unknown }>(`${BASE}/employees/${employeeId}/days/${date}/override`, body, auth);
}

export function clearOverride(employeeId: number, date: string, reason: string) {
  return apiClient.delete<{ day: unknown }>(`${BASE}/employees/${employeeId}/days/${date}/override`, { ...auth, body: { reason } });
}

export function requestExport(body: ExportRequest) {
  return apiClient.post<ExportJobDto>('/exports/attendance', body, auth);
}
