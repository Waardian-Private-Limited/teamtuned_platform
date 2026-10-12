import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type {
  AdvanceDetailDto,
  AdvanceDto,
  AdvanceListResponseDto,
  AdvanceTypeDto,
  AdvanceTypeListResponseDto,
  AdvanceTypeRequestDto,
  CreateHrAdvanceRequestDto,
  CreateMyAdvanceRequestDto,
  DisburseRequestDto,
  EligibilityDto,
  ExportAdvancesRequestDto,
  MyOverviewDto,
  OverviewDto,
  PagedAdvancesDto,
  PlanContextDto,
  PlanRequestDto,
  PreviewRequestDto,
  PreviewResponseDto,
  UploadedFileDto,
} from '../types/salaryAdvance.dto';

const auth = { withAuth: true };
const BASE = '/salary-advance';

export interface ListAdvancesParams {
  status: string;
  type?: number | null;
  search?: string;
  siteId?: number | null;
  departmentId?: number | null;
  subOrgId?: number | null;
  page: number;
  pageSize: number;
  sort?: string;
}

export function getOverview(params: { subOrgId?: number | null; month?: string }) {
  return apiClient.get<OverviewDto>(`${BASE}/overview`, { subOrgId: params.subOrgId ?? undefined, month: params.month || undefined }, auth);
}

export function listAdvances(params: ListAdvancesParams) {
  return apiClient.get<AdvanceListResponseDto>(
    `${BASE}/advances`,
    {
      status: params.status,
      type: params.type ?? undefined,
      search: params.search || undefined,
      site_id: params.siteId ?? undefined,
      department_id: params.departmentId ?? undefined,
      subOrgId: params.subOrgId ?? undefined,
      page: params.page,
      pageSize: params.pageSize,
      sort: params.sort,
    },
    auth
  );
}

export function getAdvance(id: number) {
  return apiClient.get<AdvanceDetailDto>(`${BASE}/advances/${id}`, undefined, auth);
}

export function createAdvance(body: CreateHrAdvanceRequestDto) {
  return apiClient.post<AdvanceDto>(`${BASE}/advances`, body, auth);
}

export function getEligibility(employeeId: number, advanceTypeId: number) {
  return apiClient.get<EligibilityDto>(`${BASE}/eligibility`, { employee_id: employeeId, advance_type_id: advanceTypeId }, auth);
}

export function disburseAdvance(id: number, body: DisburseRequestDto) {
  return apiClient.post<AdvanceDto>(`${BASE}/advances/${id}/disburse`, body, auth);
}

export function cancelAdvance(id: number, reason: string) {
  return apiClient.post<AdvanceDto>(`${BASE}/advances/${id}/cancel`, { reason }, auth);
}

export function skipMonth(id: number, body: { month_key: string; mode: 'push' | 'merge' }) {
  return apiClient.post<AdvanceDto>(`${BASE}/advances/${id}/schedule/skip`, body, auth);
}

export function pauseUntil(id: number, untilMonth: string) {
  return apiClient.post<AdvanceDto>(`${BASE}/advances/${id}/schedule/pause`, { until_month: untilMonth }, auth);
}

export function reshape(id: number, body: { installment_amount?: number; installments?: number; start_month?: string }) {
  return apiClient.post<AdvanceDto>(`${BASE}/advances/${id}/schedule/reshape`, body, auth);
}

export function previewPlan(id: number, body: PlanRequestDto, signal?: AbortSignal) {
  return apiClient<PlanContextDto>(`${BASE}/advances/${id}/plan/preview`, { method: 'POST', body, withAuth: true, signal });
}

export function savePlan(id: number, body: PlanRequestDto) {
  return apiClient.put<AdvanceDetailDto>(`${BASE}/advances/${id}/plan`, body, auth);
}

export function recordRepayment(id: number, body: { amount: number; reference: string; paid_on: string }) {
  return apiClient.post<AdvanceDto>(`${BASE}/advances/${id}/repayments`, body, auth);
}

export function waiveAdvance(id: number, body: { reason: string; write_off: boolean }) {
  return apiClient.post<AdvanceDto>(`${BASE}/advances/${id}/waive`, body, auth);
}

export function attachmentUrl(id: number, index: number | 'proof') {
  return apiClient.get<{ url: string }>(`${BASE}/advances/${id}/attachments/${index}`, undefined, auth);
}

export function listTypes(params: { search?: string; status?: string; subOrgId?: number | null; page?: number; pageSize?: number } = {}) {
  return apiClient.get<AdvanceTypeListResponseDto>(
    `${BASE}/types`,
    {
      search: params.search || undefined,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      subOrgId: params.subOrgId ?? undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    auth
  );
}

export function createType(body: AdvanceTypeRequestDto) {
  return apiClient.post<AdvanceTypeDto>(`${BASE}/types`, body, auth);
}

export function updateType(id: number, body: AdvanceTypeRequestDto) {
  return apiClient.put<AdvanceTypeDto>(`${BASE}/types/${id}`, body, auth);
}

export function setTypeStatus(id: number, status: 'active' | 'inactive') {
  return apiClient.patch<AdvanceTypeDto>(`${BASE}/types/${id}/status`, { status }, auth);
}

export function getMyOverview() {
  return apiClient.get<MyOverviewDto>(`${BASE}/me/overview`, undefined, auth);
}

export function listMyAdvances(params: { status?: string; page: number; pageSize: number }) {
  return apiClient.get<PagedAdvancesDto>(`${BASE}/me/advances`, { status: params.status || undefined, page: params.page, pageSize: params.pageSize }, auth);
}

export function getMyAdvance(id: number) {
  return apiClient.get<AdvanceDetailDto>(`${BASE}/me/advances/${id}`, undefined, auth);
}

export function previewMyAdvance(body: PreviewRequestDto, signal?: AbortSignal) {
  return apiClient<PreviewResponseDto>(`${BASE}/me/advances/preview`, { method: 'POST', body, withAuth: true, signal });
}

export function createMyAdvance(body: CreateMyAdvanceRequestDto) {
  return apiClient.post<AdvanceDto>(`${BASE}/me/advances`, body, auth);
}

export function cancelMyAdvance(id: number) {
  return apiClient.post<AdvanceDto>(`${BASE}/me/advances/${id}/cancel`, {}, auth);
}

export type UploadScope = 'me' | 'hr' | 'payouts';
const UPLOAD_PATH: Record<UploadScope, string> = { me: `${BASE}/me/attachments`, hr: `${BASE}/attachments`, payouts: '/payouts/attachments' };

export function uploadAttachment(file: File, scope: UploadScope = 'me') {
  const form = new FormData();
  form.append('file', file);
  return apiClient.post<UploadedFileDto>(UPLOAD_PATH[scope], form, auth);
}

export function exportAdvances(body: ExportAdvancesRequestDto) {
  return apiClient.post<ExportJobDto>('/exports/salary-advances', body, auth);
}
