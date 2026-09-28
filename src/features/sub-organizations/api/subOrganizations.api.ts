import { apiClient } from '@/lib/apiClient';
import type { SubOrganizationDto, SubOrganizationListResponseDto } from '../types/sub-organizations.dto';
import type { SubOrganizationFormInput } from '../types/sub-organizations.model';

interface ListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export function listSubOrganizations(params: ListParams = {}) {
  return apiClient.get<SubOrganizationListResponseDto>(
    '/sub-organizations',
    {
      search: params.search || undefined,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    { withAuth: true }
  );
}

export function listActiveSubOrganizations() {
  return apiClient.get<{ sub_organizations: SubOrganizationDto[] }>(
    '/sub-organizations/active',
    undefined,
    { withAuth: true }
  );
}

// Sub-orgs the current user may act in — powers create-form pickers. OrgAdmin
// gets every active sub-org; a scoped user gets only their assigned ones.
export function listManageableSubOrganizations() {
  return apiClient.get<{ sub_organizations: SubOrganizationDto[] }>(
    '/sub-organizations/manageable',
    undefined,
    { withAuth: true }
  );
}

export interface SubOrgAdminDto {
  user_id: number;
  name: string;
  email: string;
  assigned_at: string;
}

export interface SubOrgAdminCandidateDto {
  user_id: number;
  name: string;
  email: string;
}

export function listSubOrgAdminCandidates(search?: string) {
  return apiClient.get<{ candidates: SubOrgAdminCandidateDto[] }>(
    '/sub-organizations/admin-candidates',
    { search: search || undefined },
    { withAuth: true }
  );
}

export function listSubOrgAdmins(id: number) {
  return apiClient.get<{ admins: SubOrgAdminDto[] }>(`/sub-organizations/${id}/admins`, undefined, { withAuth: true });
}

export function assignSubOrgAdmin(id: number, userId: number) {
  return apiClient.post<{ assigned: boolean }>(`/sub-organizations/${id}/admins`, { userId }, { withAuth: true });
}

export function removeSubOrgAdmin(id: number, userId: number) {
  return apiClient.delete<{ removed: boolean }>(`/sub-organizations/${id}/admins/${userId}`, { withAuth: true });
}

function toBody(input: SubOrganizationFormInput) {
  return {
    name: input.name.trim(),
    code: input.code.trim(),
    address: input.address.trim() || null,
    gst_number: input.gstNumber.trim() || null,
    logo_url: input.logoUrl.trim() || null,
    status: input.status,
  };
}

export function createSubOrganization(input: SubOrganizationFormInput) {
  return apiClient.post<{ sub_organization: SubOrganizationDto }>('/sub-organizations', toBody(input), { withAuth: true });
}

export function updateSubOrganization(id: number, input: SubOrganizationFormInput) {
  return apiClient.put<{ sub_organization: SubOrganizationDto }>(`/sub-organizations/${id}`, toBody(input), { withAuth: true });
}

export function updateSubOrganizationStatus(id: number, status: string) {
  return apiClient.patch<{ sub_organization: SubOrganizationDto }>(
    `/sub-organizations/${id}/status`,
    { status },
    { withAuth: true }
  );
}

export function setPrimarySubOrganization(id: number) {
  return apiClient.patch<{ sub_organization: SubOrganizationDto }>(`/sub-organizations/${id}/primary`, {}, { withAuth: true });
}

export function deleteSubOrganization(id: number) {
  return apiClient.delete<{ success: boolean }>(`/sub-organizations/${id}`, { withAuth: true });
}
