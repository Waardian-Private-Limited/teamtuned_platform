import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type {
  GenerateResponseDto,
  PayRunDto,
  PayRunListResponseDto,
  PayslipExportRequestDto,
  RunItemDto,
  RunItemPageDto,
} from '../types/salarySlips.dto';

const auth = { withAuth: true };

interface ItemParams {
  page: number;
  pageSize: number;
  search?: string;
  siteId?: number | null;
}

export function listRuns(month: string, subOrgId?: number | null) {
  return apiClient.get<PayRunListResponseDto>('/payroll-runs', { month, subOrgId: subOrgId ?? undefined }, auth);
}

export function getRun(runId: number) {
  return apiClient.get<PayRunDto>(`/payroll-runs/${runId}`, undefined, auth);
}

export function listRunItems(runId: number, params: ItemParams) {
  return apiClient.get<RunItemPageDto>(
    `/payroll-runs/${runId}/items`,
    {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || undefined,
      site_id: params.siteId ?? undefined,
      sort: 'name',
      dir: 'asc',
    },
    auth
  );
}

export function generatePayslips(runId: number, employeeIds?: number[]) {
  return apiClient.post<GenerateResponseDto>(`/payroll-runs/${runId}/generate`, employeeIds ? { employee_ids: employeeIds } : {}, auth);
}

export function holdPayslip(runId: number, employeeId: number, reason: string) {
  return apiClient.post<RunItemDto>(`/payroll-runs/${runId}/items/${employeeId}/hold`, { hold: true, reason }, auth);
}

export function releaseHold(runId: number, employeeId: number) {
  return apiClient.post<RunItemDto>(`/payroll-runs/${runId}/items/${employeeId}/hold`, { hold: false }, auth);
}

export function requestPayslipExport(body: PayslipExportRequestDto) {
  return apiClient.post<ExportJobDto>('/exports/payslips', body, auth);
}

export function listSiteOptions() {
  return apiClient.get<{ sites: { id: number; name: string }[] }>('/sites', { status: 'active', page: 1, pageSize: 100 }, auth);
}
