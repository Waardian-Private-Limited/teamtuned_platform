import { apiClient } from '@/lib/apiClient';
import type {
  CompEmployeeDto,
  CycleDto,
  CycleSummaryDto,
  GratuityCalcDto,
  GratuityRowDto,
  HistoryDto,
  PayoutDto,
  RevisionDto,
  SettingsResponseDto,
  BonusRowDto,
  CompensationSettings,
} from '../types/compensation.dto';

const auth = { withAuth: true };
type Params = Record<string, string | number | boolean | undefined | null>;

interface PagedResponse {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  counts?: Record<string, number>;
}

export const getSettings = (subOrgId: number | null) =>
  apiClient.get<SettingsResponseDto>('/compensation/settings', { forSubOrgId: subOrgId ?? undefined }, auth);
export const updateSettings = (subOrgId: number | null, settings: CompensationSettings) =>
  apiClient.put<SettingsResponseDto>('/compensation/settings', { sub_organization_id: subOrgId, settings }, auth);

export const searchEmployees = (search: string, subOrgId?: number | null) =>
  apiClient.get<{ employees: CompEmployeeDto[] }>('/compensation/employees', { search: search || undefined, subOrgId: subOrgId ?? undefined }, auth);
export const employeeHistory = (id: number) => apiClient.get<HistoryDto>(`/compensation/employees/${id}/history`, undefined, auth);
export const employeeGratuity = (id: number, params: Params) => apiClient.get<GratuityCalcDto>(`/compensation/employees/${id}/gratuity`, params, auth);

export const listCycles = () => apiClient.get<{ cycles: CycleDto[] }>('/compensation/cycles', undefined, auth);
export const getCycle = (id: number) => apiClient.get<CycleDto>(`/compensation/cycles/${id}`, undefined, auth);
export const createCycle = (body: Record<string, unknown>) => apiClient.post<CycleDto>('/compensation/cycles', body, auth);
export const updateCycle = (id: number, body: Record<string, unknown>) => apiClient.put<CycleDto>(`/compensation/cycles/${id}`, body, auth);
export const generateProposals = (id: number) => apiClient.post<{ eligible: number; added: number }>(`/compensation/cycles/${id}/generate`, {}, auth);
export const listProposals = (id: number, params: Params) =>
  apiClient.get<PagedResponse & { revisions: RevisionDto[] }>(`/compensation/cycles/${id}/proposals`, params, auth);
export const updateProposals = (id: number, items: Record<string, unknown>[]) =>
  apiClient.put<{ updated: number; summary: CycleSummaryDto }>(`/compensation/cycles/${id}/proposals`, { items }, auth);
export const applyRatings = (id: number) => apiClient.post<{ updated: number; summary: CycleSummaryDto }>(`/compensation/cycles/${id}/apply-ratings`, {}, auth);
export const submitCycle = (id: number) => apiClient.post<CycleDto>(`/compensation/cycles/${id}/submit`, {}, auth);
export const approveCycle = (id: number) => apiClient.post<CycleDto>(`/compensation/cycles/${id}/approve`, {}, auth);
export const closeCycle = (id: number) => apiClient.post<CycleDto>(`/compensation/cycles/${id}/close`, {}, auth);

export const listPayouts = (params: Params) =>
  apiClient.get<PagedResponse & { payouts: PayoutDto[]; open_amount: number }>('/compensation/payouts', params, auth);
export const createPayouts = (body: Record<string, unknown>) =>
  apiClient.post<{ created: number; employees: number; skipped: { employee_id: number; reason: string }[]; status: string }>('/compensation/payouts', body, auth);
export const decidePayouts = (ids: number[], decision: 'approve' | 'reject') =>
  apiClient.post<{ decided: number; blocked: number }>('/compensation/payouts/decide', { ids, decision }, auth);
export const cancelPayouts = (ids: number[]) => apiClient.post<{ cancelled: number; locked: number }>('/compensation/payouts/cancel', { ids }, auth);
export const clawbackPayout = (id: number, body: Record<string, unknown>) =>
  apiClient.post<{ recovered: number; payout_month: string }>(`/compensation/payouts/${id}/clawback`, body, auth);

export const statutoryBonus = (params: Params) =>
  apiClient.get<PagedResponse & { fy: { start: string; end: string; label: string }; rows: BonusRowDto[] }>('/compensation/statutory-bonus', params, auth);
export const generateStatutoryBonus = (body: Record<string, unknown>) =>
  apiClient.post<{ created: number; amount: number }>('/compensation/statutory-bonus', body, auth);
export const gratuityLiability = (params: Params) =>
  apiClient.get<PagedResponse & { as_of: string; rows: GratuityRowDto[] }>('/compensation/gratuity', params, auth);
export const createGratuityPayout = (body: Record<string, unknown>) =>
  apiClient.post<{ amount: number; payout_month: string }>('/compensation/gratuity/payout', body, auth);

export const listRoles = () => apiClient.get<{ id: number; name: string }[]>('/organization/roles', undefined, auth);
