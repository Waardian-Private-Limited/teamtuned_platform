import { apiClient } from '@/lib/apiClient';
import type {
  PolicyDto,
  PolicyDetailDto,
  PolicyListResponseDto,
  PolicyVersionDto,
  PolicyVersionListResponseDto,
  PolicyImpactDto,
  PayCalendarResponseDto,
  PolicyAssignmentDto,
  PolicyAssignmentListResponseDto,
  ResolveEmployeePoliciesResponseDto,
  LeaveTypeDto,
  LeaveTypeListResponseDto,
  SeedLeaveTypeCatalogResponseDto,
  PolicyConfig,
} from '../types/policies.dto';

interface ListPoliciesParams {
  search?: string;
  status?: string;
  subOrgId?: number | null;
}

interface PolicyInput {
  name: string;
  code: string;
  description?: string;
  config?: PolicyConfig;
  effectiveFrom?: string;
  subOrganizationId?: number | null;
}

interface PolicyDraftInput {
  name?: string;
  description?: string;
  config?: PolicyConfig;
  effectiveFrom?: string;
  changeNote?: string;
}

// --- Schema ---

// Field-metadata tree the config editor renders section forms from — one
// source of truth shared with backend validation (domain/schemas/index.js).
export function getPolicySchema() {
  return apiClient.get<{ schemaVersion: number; describe: Record<string, unknown> }>('/policies/schema', undefined, { withAuth: true });
}

// --- Policies ---

export function listPolicies(params: ListPoliciesParams = {}) {
  return apiClient.get<PolicyListResponseDto>(
    '/policies',
    { search: params.search || undefined, status: params.status && params.status !== 'all' ? params.status : undefined, subOrgId: params.subOrgId ?? undefined },
    { withAuth: true }
  );
}

export function getPolicy(id: number) {
  return apiClient.get<PolicyDetailDto>(`/policies/${id}`, undefined, { withAuth: true });
}

export function createPolicy(input: PolicyInput) {
  const { subOrganizationId, ...rest } = input;
  return apiClient.post<PolicyDetailDto>('/policies', { ...rest, sub_organization_id: subOrganizationId ?? null }, { withAuth: true });
}

export function updatePolicyDraft(id: number, input: PolicyDraftInput) {
  return apiClient.put<PolicyDetailDto>(`/policies/${id}`, input, { withAuth: true });
}

export function clonePolicy(id: number, name?: string, code?: string) {
  return apiClient.post<PolicyDetailDto>(`/policies/${id}/clone`, { name, code }, { withAuth: true });
}

export function updatePolicyStatus(id: number, status: string) {
  return apiClient.patch<PolicyDto>(`/policies/${id}/status`, { status }, { withAuth: true });
}

export function deletePolicy(id: number) {
  return apiClient.delete<{ success: boolean }>(`/policies/${id}`, { withAuth: true });
}

export function previewPolicyImpact(id: number, versionId?: number) {
  return apiClient.get<PolicyImpactDto>(`/policies/${id}/impact`, { versionId }, { withAuth: true });
}

export function previewPayCalendar(id: number) {
  return apiClient.get<PayCalendarResponseDto>(`/policies/${id}/pay-calendar`, undefined, { withAuth: true });
}

// --- Versions ---

export function listPolicyVersions(policyId: number) {
  return apiClient.get<PolicyVersionListResponseDto>(`/policies/${policyId}/versions`, undefined, { withAuth: true });
}

export function getPolicyVersion(policyId: number, versionId: number) {
  return apiClient.get<PolicyVersionDto>(`/policies/${policyId}/versions/${versionId}`, undefined, { withAuth: true });
}

export function publishPolicyVersion(policyId: number, versionId: number) {
  return apiClient.post<{ version: PolicyVersionDto }>(`/policies/${policyId}/versions/${versionId}/publish`, {}, { withAuth: true });
}

export function rollbackPolicyVersion(policyId: number, toVersionId: number) {
  return apiClient.post<{ version: PolicyVersionDto }>(`/policies/${policyId}/rollback`, { toVersionId }, { withAuth: true });
}

// --- Assignments ---

export function listAssignments(params: { scopeType?: string } = {}) {
  return apiClient.get<PolicyAssignmentListResponseDto>('/policies/assignments', params, { withAuth: true });
}

export function assignPolicy(input: {
  policyId: number;
  scopeType: string;
  scopeId?: number | null;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}) {
  return apiClient.post<PolicyAssignmentDto>('/policies/assignments', input, { withAuth: true });
}

export function unassignPolicy(id: number) {
  return apiClient.delete<{ success: boolean }>(`/policies/assignments/${id}`, { withAuth: true });
}

export function resolveEmployeePolicies(employeeId: number, date?: string) {
  return apiClient.get<ResolveEmployeePoliciesResponseDto>(`/policies/assignments/resolve/${employeeId}`, { date }, { withAuth: true });
}

// --- Leave types ---

export function listLeaveTypes(status?: string) {
  return apiClient.get<LeaveTypeListResponseDto>('/policies/leave-types', { status }, { withAuth: true });
}

interface LeaveTypeInput {
  name: string;
  code: string;
  category?: string;
  unit?: string;
  isPaid?: boolean;
  requiresApproval?: boolean;
  allowHalfDay?: boolean;
  status?: string;
}

export function createLeaveType(input: LeaveTypeInput) {
  return apiClient.post<LeaveTypeDto>('/policies/leave-types', input, { withAuth: true });
}

export function updateLeaveType(id: number, input: Partial<LeaveTypeInput>) {
  return apiClient.put<LeaveTypeDto>(`/policies/leave-types/${id}`, input, { withAuth: true });
}

export function deleteLeaveType(id: number) {
  return apiClient.delete<{ success: boolean }>(`/policies/leave-types/${id}`, { withAuth: true });
}

export function seedLeaveTypeCatalog() {
  return apiClient.post<SeedLeaveTypeCatalogResponseDto>('/policies/leave-types/seed', {}, { withAuth: true });
}
