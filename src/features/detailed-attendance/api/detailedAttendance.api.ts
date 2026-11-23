import { apiClient } from '@/lib/apiClient';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type { DayDetailDto, ExportRequest, ListResponseDto, MonthResponseDto, OverrideBody, OverridePreviewDto } from '../types/detailed.dto';

const auth = { withAuth: true } as const;
const BASE = '/attendance-records';

export interface ListQuery {
  date: string;
  subOrgId: number | null;
  siteId: number | null;
  departmentId: number | null;
  roleId: number | null;
  status?: string | null;
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
      status: q.status || undefined,
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

export function previewOverride(employeeId: number, date: string, body: OverrideBody | { clear: true }, signal?: AbortSignal) {
  return apiClient.post<OverridePreviewDto>(`${BASE}/employees/${employeeId}/days/${date}/override/preview`, body, { ...auth, signal });
}

export function setOverride(employeeId: number, date: string, body: OverrideBody & { reason: string }) {
  return apiClient.put<{ day: unknown }>(`${BASE}/employees/${employeeId}/days/${date}/override`, body, auth);
}

export function clearOverride(employeeId: number, date: string, reason: string) {
  return apiClient.delete<{ day: unknown }>(`${BASE}/employees/${employeeId}/days/${date}/override`, { ...auth, body: { reason } });
}

/** A check-out pressed by mistake is voided: the shift is open again and the employee checks out later. */
export function undoCheckout(employeeId: number, date: string, reason: string) {
  return apiClient.post<{ day: unknown }>(`${BASE}/employees/${employeeId}/days/${date}/undo-checkout`, { reason }, auth);
}

/** Every punch and break of the day is voided, so the employee checks in again. */
export function resetDay(employeeId: number, date: string, reason: string) {
  return apiClient.post<{ day: unknown }>(`${BASE}/employees/${employeeId}/days/${date}/reset`, { reason }, auth);
}

/** HR grants comp-off for a day by hand: what the extra work was, half a day or a full day, and why. */
export function grantCompOff(employeeId: number, date: string, body: { reason: string; units: number; note: string }) {
  return apiClient.post<{ id: number }>(`${BASE}/employees/${employeeId}/days/${date}/comp-off`, body, auth);
}

export function requestExport(body: ExportRequest) {
  return apiClient.post<ExportJobDto>('/exports/attendance', body, auth);
}

export interface MissedOverrideScope {
  month?: string;
  from?: string;
  to?: string;
  subOrgId?: number | null;
  siteId?: number | null;
}

export interface MissedOverridePreviewDto {
  from: string;
  to: string;
  affected: number;
  employees: number;
  skipped: { locked: number; overridden: number; regularized: number };
  by_employee: Array<{ name: string; code: string | null; count: number }>;
  sample: Array<{ employee: string; code: string | null; date: string; current: string }>;
}

/** Read-only: how many untouched missed check-out days a bulk override would touch, and what it skips. */
export function previewMissedOverride(body: MissedOverrideScope, signal?: AbortSignal) {
  return apiClient.post<MissedOverridePreviewDto>(`${BASE}/bulk/missed-checkout/preview`, body, { ...auth, signal });
}

/** Queues the async job that forces every untouched missed check-out day to full / half day and writes a summary. */
export function applyMissedOverride(body: MissedOverrideScope & { type: 'full_day' | 'half_day'; reason: string }) {
  return apiClient.post<ExportJobDto>('/exports/attendance-missed-override', body, auth);
}

/** A short-lived link to the selfie taken at a check-in or check-out. */
export function getPunchImage(punchId: number, signal?: AbortSignal) {
  return apiClient.get<{ url: string }>(`/attendance/punches/${punchId}/image`, undefined, { ...auth, signal });
}
