import { apiClient } from '@/lib/apiClient';
import type {
  DaysResponseDto,
  LiveBoardDto,
  PolicySchemaDto,
  TimelineDto,
  TrackedEmployeesResponseDto,
  TrackingFilters,
  TrackingPolicyDto,
  TrackingState,
  TripDto,
  TripsResponseDto,
} from '../types/tracking.dto';

const auth = { withAuth: true } as const;

const filterParams = (f: TrackingFilters = {}) => ({
  subOrgId: f.subOrgId ?? undefined,
  department_id: f.departmentId ?? undefined,
  role_id: f.roleId ?? undefined,
  site_id: f.siteId ?? undefined,
  policy_id: f.policyId ?? undefined,
});

export function getLiveBoard(filters: TrackingFilters, states: TrackingState[], signal?: AbortSignal) {
  return apiClient.get<LiveBoardDto>('/tracking/live', { ...filterParams(filters), state: states.length ? states.join(',') : undefined }, { ...auth, signal });
}

export function getTimeline(employeeId: number, date: string, signal?: AbortSignal) {
  return apiClient.get<TimelineDto>(`/tracking/employees/${employeeId}/days/${date}`, undefined, { ...auth, signal });
}

export function getDays(date: string, filters: TrackingFilters, page: number, pageSize: number, signal?: AbortSignal) {
  return apiClient.get<DaysResponseDto>('/tracking/days', { date, ...filterParams(filters), limit: pageSize, offset: (page - 1) * pageSize }, { ...auth, signal });
}

export function listPolicies(subOrgId?: number | null, includeArchived = false) {
  return apiClient.get<{ policies: TrackingPolicyDto[] }>('/tracking/policies', { subOrgId: subOrgId ?? undefined, archived: includeArchived ? '1' : undefined }, auth);
}

export function getPolicy(id: number) {
  return apiClient.get<TrackingPolicyDto>(`/tracking/policies/${id}`, undefined, auth);
}

export function getPolicySchema() {
  return apiClient.get<PolicySchemaDto>('/tracking/policies/schema', undefined, auth);
}

interface PolicyInput {
  name: string;
  description?: string | null;
  config?: Record<string, unknown>;
  isDefault?: boolean;
  subOrganizationId?: number | null;
}

const policyBody = (i: PolicyInput) => ({ name: i.name, description: i.description ?? null, config: i.config, is_default: i.isDefault, sub_organization_id: i.subOrganizationId ?? null });

export function createPolicy(input: PolicyInput) {
  return apiClient.post<TrackingPolicyDto>('/tracking/policies', policyBody(input), auth);
}

export function updatePolicy(id: number, input: PolicyInput) {
  return apiClient.put<TrackingPolicyDto>(`/tracking/policies/${id}`, policyBody(input), auth);
}

export function archivePolicy(id: number) {
  return apiClient.post<TrackingPolicyDto>(`/tracking/policies/${id}/archive`, {}, auth);
}

export function restorePolicy(id: number) {
  return apiClient.post<TrackingPolicyDto>(`/tracking/policies/${id}/restore`, {}, auth);
}

export function deletePolicy(id: number) {
  return apiClient.delete<{ success: boolean }>(`/tracking/policies/${id}`, auth);
}

export function listTrackedEmployees(params: { filters: TrackingFilters; search?: string; enabled?: boolean | null; page: number; pageSize: number }) {
  return apiClient.get<TrackedEmployeesResponseDto>(
    '/tracking/employees',
    { ...filterParams(params.filters), search: params.search || undefined, enabled: params.enabled === null || params.enabled === undefined ? undefined : params.enabled ? '1' : '0', limit: params.pageSize, offset: (params.page - 1) * params.pageSize },
    auth
  );
}

export function setTracking(input: { employeeIds: number[]; enabled: boolean; policyId?: number | null }) {
  return apiClient.put<{ updated: number }>('/tracking/employees', { employee_ids: input.employeeIds, enabled: input.enabled, policy_id: input.policyId ?? null }, auth);
}

export function listTrips(params: { status?: string; from?: string; to?: string; page: number; pageSize: number }) {
  return apiClient.get<TripsResponseDto>('/tracking/trips', { status: params.status || undefined, from: params.from || undefined, to: params.to || undefined, limit: params.pageSize, offset: (params.page - 1) * params.pageSize }, auth);
}

export function getTrip(id: number) {
  return apiClient.get<TripDto>(`/tracking/trips/${id}`, undefined, auth);
}

export function adjustTrip(id: number, km: number, note?: string) {
  return apiClient.put<TripDto>(`/tracking/trips/${id}/adjust`, { km, note: note || null }, auth);
}
