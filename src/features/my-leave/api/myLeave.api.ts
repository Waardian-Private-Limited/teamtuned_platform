import { apiClient } from '@/lib/apiClient';
import type { ApplicationDto, LeaveInputDto, OverviewDto, QuoteDto, RequestDetailDto, RequestsPageDto, TimelineDto } from '../types/leave.dto';
import type { RequestFilters } from '../types/leave.model';

const auth = { withAuth: true } as const;

/*
 * Everything here is about the signed-in employee: the server reads who is asking from the token, so
 * no employee id is ever sent and nothing in a URL can point this at someone else's leave.
 */

export function getOverview(signal?: AbortSignal) {
  return apiClient.get<OverviewDto>('/leave/me/overview', undefined, { ...auth, signal });
}

export function listRequests(f: RequestFilters, page: number, pageSize: number, signal?: AbortSignal) {
  return apiClient.get<RequestsPageDto>('/leave/me/requests', {
    status: f.status ?? undefined, leave_type_id: f.typeId ?? undefined, from: f.from || undefined, to: f.to || undefined, page, pageSize,
  }, { ...auth, signal });
}

export function getRequest(id: number, signal?: AbortSignal) {
  return apiClient.get<RequestDetailDto>(`/leave/me/requests/${id}`, undefined, { ...auth, signal });
}

export function getTimeline(approvalId: number, signal?: AbortSignal) {
  return apiClient.get<TimelineDto>(`/approvals/requests/${approvalId}/timeline`, undefined, { ...auth, signal });
}

export function preview(input: LeaveInputDto, signal?: AbortSignal) {
  return apiClient.post<QuoteDto>('/leave/me/preview', input, { ...auth, signal });
}

/** A supporting document travels as a form; without one the request goes as JSON. */
export function apply(input: LeaveInputDto, reason: string, attachment: File | null) {
  const body = { ...input, reason };
  if (!attachment) return apiClient.post<{ application: ApplicationDto }>('/leave/me/requests', body, auth);
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) if (value !== null && value !== undefined) form.append(key, String(value));
  form.append('attachment', attachment);
  return apiClient.post<{ application: ApplicationDto }>('/leave/me/requests', form, auth);
}

export function cancel(id: number, reason: string) {
  return apiClient.post<RequestDetailDto>(`/leave/me/requests/${id}/cancel`, { reason: reason || undefined }, auth);
}

/** Takes extra work as comp-off or as pay, where the policy lets the employee choose. */
export function chooseEarned(id: number, as: 'comp_off' | 'paid') {
  return apiClient.post(`/attendance/me/grants/${id}/choice`, { as }, auth);
}
