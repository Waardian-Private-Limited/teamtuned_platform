import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type {
  ItemDetailResponseDto,
  ItemDto,
  ItemListResponseDto,
  PayrollSettingsDto,
  RunDto,
  RunListResponseDto,
} from '../types/payrollRuns.dto';
import type { ItemFilters } from '../types/payrollRuns.model';

const auth = { withAuth: true };

export function listRuns(month: string, subOrgId: number | null) {
  return apiClient.get<RunListResponseDto>('/payroll-runs', { month, subOrgId: subOrgId ?? undefined }, auth);
}

export function startRuns(month: string, subOrganizationId?: number | null) {
  const body: Record<string, unknown> = { month };
  if (subOrganizationId !== undefined) body.sub_organization_id = subOrganizationId;
  return apiClient.post<{ runs: RunDto[] }>('/payroll-runs/start', body, auth);
}

export function getRun(id: number) {
  return apiClient.get<RunDto>(`/payroll-runs/${id}`, undefined, auth);
}

export function listItems(id: number, filters: ItemFilters, page: number, pageSize: number) {
  return apiClient.get<ItemListResponseDto>(
    `/payroll-runs/${id}/items`,
    {
      page,
      pageSize,
      search: filters.search.trim() || undefined,
      status: filters.status === 'all' ? undefined : filters.status,
      site_id: filters.siteId ?? undefined,
      department_id: filters.departmentId ?? undefined,
      sort: filters.sort,
      dir: filters.dir,
    },
    auth
  );
}

export function getItem(id: number, employeeId: number) {
  return apiClient.get<ItemDetailResponseDto>(`/payroll-runs/${id}/items/${employeeId}`, undefined, auth);
}

export function recompute(id: number) {
  return apiClient.post<RunDto>(`/payroll-runs/${id}/recompute`, {}, auth);
}

export function setHold(id: number, employeeId: number, hold: boolean, reason?: string) {
  return apiClient.post<ItemDto>(`/payroll-runs/${id}/items/${employeeId}/hold`, { hold, reason: reason || undefined }, auth);
}

export function finalize(id: number) {
  return apiClient.post<RunDto>(`/payroll-runs/${id}/finalize`, {}, auth);
}

export function reopen(id: number, reason: string) {
  return apiClient.post<RunDto>(`/payroll-runs/${id}/reopen`, { reason }, auth);
}

export function markPaid(id: number, paidOn: string, reference?: string) {
  return apiClient.post<RunDto>(`/payroll-runs/${id}/mark-paid`, { paid_on: paidOn, reference: reference || undefined }, auth);
}

export function generatePayslips(id: number, employeeIds?: number[]) {
  return apiClient.post<{ generated: number; run: RunDto }>(`/payroll-runs/${id}/generate`, employeeIds ? { employee_ids: employeeIds } : {}, auth);
}

export function release(id: number) {
  return apiClient.post<{ generated: number; run: RunDto }>(`/payroll-runs/${id}/generate`, {}, auth).then((r) => r.run);
}

export function getSettings(subOrgId: number | null) {
  return apiClient.get<PayrollSettingsDto>('/payroll-runs/settings', { subOrgId: subOrgId ?? undefined }, auth);
}

export function saveSettings(subOrgId: number | null, finalizeApproval: boolean) {
  return apiClient.put<PayrollSettingsDto>(
    '/payroll-runs/settings',
    { sub_organization_id: subOrgId, finalize_approval: finalizeApproval },
    auth
  );
}

export function exportPayslips(runId: number, layout: 'zip' | 'combined', employeeIds?: number[], includeHeld?: boolean) {
  return apiClient.post<ExportJobDto>('/exports/payslips', { runId, layout, employeeIds, includeHeld }, auth);
}

export function exportRegister(runId: number) {
  return apiClient.post<ExportJobDto>('/exports/payroll-register', { runId }, auth);
}

export function exportBankTransfer(runId: number) {
  return apiClient.post<ExportJobDto>('/exports/payroll-bank-transfer', { runId }, auth);
}
