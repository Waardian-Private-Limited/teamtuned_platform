import { apiClient } from '@/lib/apiClient';
import type {
  Catalog, Coverage, Delegation, EmployeeRef, Flow, FlowInput, InboxResponse, Lookups, Preview, RequestDetail,
} from '../types/approvals';

const auth = { withAuth: true };

export const getCatalog = () => apiClient.get<Catalog>('/approvals/request-types', undefined, auth);
export const getLookups = () => apiClient.get<Lookups>('/approvals/lookups', undefined, auth);
export const searchEmployees = (search: string) => apiClient.get<EmployeeRef[]>('/approvals/employees', { search }, auth);

export const listFlows = (requestType: string, subOrgId?: number | null) =>
  apiClient.get<Flow[]>('/approvals/flows', { requestType, subOrgId: subOrgId ?? undefined }, auth);
export const createFlow = (body: FlowInput) => apiClient.post<Flow>('/approvals/flows', body, auth);
export const updateFlow = (id: number, body: FlowInput) => apiClient.put<Flow>(`/approvals/flows/${id}`, body, auth);
export const setFlowActive = (id: number, isActive: boolean) => apiClient.patch<{ id: number; isActive: boolean }>(`/approvals/flows/${id}/active`, { isActive }, auth);
export const deleteFlow = (id: number) => apiClient.delete<{ id: number }>(`/approvals/flows/${id}`, auth);
export const previewChain = (body: { requestType: string; employeeId: number; facts?: Record<string, unknown>; flow?: FlowInput | null }) =>
  apiClient.post<Preview>('/approvals/flows/preview', body, auth);
export const getCoverage = (requestType: string, subOrgId?: number | null) =>
  apiClient.get<Coverage>('/approvals/coverage', { requestType, subOrgId: subOrgId ?? undefined }, auth);

export const getInbox = (params: { tab: string; type?: string; status?: string; page?: number }) =>
  apiClient.get<InboxResponse>('/approvals/inbox', { tab: params.tab, type: params.type || undefined, status: params.status || undefined, page: params.page }, auth);
export const getInboxCount = () => apiClient.get<{ pending: number }>('/approvals/inbox/count', undefined, auth);
export const getRequest = (id: number) => apiClient.get<RequestDetail>(`/approvals/requests/${id}`, undefined, auth);
export const decide = (id: number, decision: 'approve' | 'reject', note?: string) => apiClient.post<{ status: string }>(`/approvals/requests/${id}/decide`, { decision, note }, auth);
export const bulkDecide = (ids: number[], decision: 'approve' | 'reject', note?: string) =>
  apiClient.post<{ succeeded: number; failed: number; results: { id: number; ok: boolean; message?: string }[] }>('/approvals/requests/bulk-decide', { ids, decision, note }, auth);
export const sendBack = (id: number, note: string) => apiClient.post(`/approvals/requests/${id}/send-back`, { note }, auth);
export const withdraw = (id: number) => apiClient.post(`/approvals/requests/${id}/withdraw`, {}, auth);
export const resubmit = (id: number) => apiClient.post(`/approvals/requests/${id}/resubmit`, {}, auth);
export const reassign = (id: number, employeeId: number) => apiClient.post(`/approvals/requests/${id}/reassign`, { employeeId }, auth);

export const myDelegations = () => apiClient.get<Delegation[]>('/approvals/delegations/me', undefined, auth);
export const allDelegations = () => apiClient.get<Delegation[]>('/approvals/delegations', undefined, auth);
export const setMyDelegation = (body: { delegateEmployeeId: number; startsOn: string; endsOn: string; requestTypes?: string[] }) =>
  apiClient.put<{ id: number }>('/approvals/delegations/me', body, auth);
export const clearDelegation = (id: number) => apiClient.delete<{ id: number }>(`/approvals/delegations/${id}`, auth);
