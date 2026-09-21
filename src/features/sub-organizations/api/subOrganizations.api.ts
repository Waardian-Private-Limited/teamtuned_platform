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
