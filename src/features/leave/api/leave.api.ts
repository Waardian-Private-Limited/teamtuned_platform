import { apiClient } from '@/lib/apiClient';
import type { ApplyInput, BalanceCard, BalanceGrid, CalendarResponse, LedgerEntry, LeaveRequest, LeaveRequestDetail, PayrollAdjustment, Quote, RequestsResponse } from '../types/leave';

const auth = { withAuth: true } as const;
type P = Record<string, string | number | boolean | undefined | null>;

/* HR: the employee's own leave lives in features/my-leave. */
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

export const payrollAdjustments = (month: string) => apiClient.get<{ adjustments: PayrollAdjustment[] }>('/leave/payroll-adjustments', { month }, auth);
