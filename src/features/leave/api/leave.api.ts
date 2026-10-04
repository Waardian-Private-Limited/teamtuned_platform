import { apiClient } from '@/lib/apiClient';
import type { ApplyInput, BalanceCard, BalanceGrid, CalendarResponse, LedgerEntry, LeaveRequest, LeaveRequestDetail, Quote, RequestsResponse } from '../types/leave';

const auth = { withAuth: true } as const;
type P = Record<string, string | number | boolean | undefined | null>;

/* my leave */
export const myBalances = () => apiClient.get<BalanceCard>('/leave/me/balances', undefined, auth);
export const myLedger = (p: P) => apiClient.get<{ entries: LedgerEntry[]; total: number; pages: number }>('/leave/me/ledger', p, auth);
export const myRequests = (p: P) => apiClient.get<RequestsResponse>('/leave/me/requests', p, auth);
export const myRequest = (id: number) => apiClient.get<LeaveRequestDetail>(`/leave/me/requests/${id}`, undefined, auth);
export const myPreview = (b: ApplyInput) => apiClient.post<Quote>('/leave/me/preview', b, auth);
export const myApply = (b: ApplyInput) => apiClient.post<{ application: LeaveRequest; quote: Quote }>('/leave/me/requests', b, auth);
export const myCancel = (id: number, reason?: string) => apiClient.post<LeaveRequestDetail>(`/leave/me/requests/${id}/cancel`, { reason }, auth);

/* admin */
export const listRequests = (p: P) => apiClient.get<RequestsResponse>('/leave/requests', p, auth);
export const getRequest = (id: number) => apiClient.get<LeaveRequestDetail>(`/leave/requests/${id}`, undefined, auth);
export const previewFor = (b: ApplyInput) => apiClient.post<Quote>('/leave/requests/preview', b, auth);
export const applyFor = (b: ApplyInput) => apiClient.post<{ application: LeaveRequest; quote: Quote }>('/leave/requests', b, auth);
export const approve = (id: number, remarks?: string) => apiClient.post<LeaveRequestDetail>(`/leave/requests/${id}/approve`, { remarks }, auth);
export const reject = (id: number, reason: string) => apiClient.post<LeaveRequestDetail>(`/leave/requests/${id}/reject`, { reason }, auth);
export const cancel = (id: number, reason?: string, fromDate?: string) => apiClient.post<LeaveRequestDetail>(`/leave/requests/${id}/cancel`, { reason, from_date: fromDate }, auth);
export const balanceGrid = (p: P) => apiClient.get<BalanceGrid>('/leave/balances', p, auth);
export const employeeBalances = (id: number) => apiClient.get<BalanceCard>(`/leave/employees/${id}/balances`, undefined, auth);
export const employeeLedger = (id: number, p: P) => apiClient.get<{ entries: LedgerEntry[]; total: number; pages: number }>(`/leave/employees/${id}/ledger`, p, auth);
export const adjust = (b: { employee_id: number; leave_type_id: number; quantity: number; reason: string; expires_on?: string }) => apiClient.post<{ available: number }>('/leave/balances/adjust', b, auth);
export const bulkAdjust = (b: { employee_ids: number[]; leave_type_id: number; quantity: number; reason: string }) =>
  apiClient.post<{ applied: number; failed: number; results: { employee_id: number; ok: boolean; error?: string }[] }>('/leave/balances/bulk-adjust', b, auth);
export const calendar = (p: P) => apiClient.get<CalendarResponse>('/leave/calendar', p, auth);
