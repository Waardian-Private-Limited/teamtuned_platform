import { apiClient } from '@/lib/apiClient';
import type {
  MappingDto,
  MappingListResponseDto,
  SiteOptionsResponseDto,
  SubOrgOptionsResponseDto,
} from '../types/siteSubOrgMapper.dto';

const BASE = '/site-sub-org-mapper';

interface ListParams {
  search?: string;
  siteId?: number | null;
  subOrgId?: number | null;
  page?: number;
  pageSize?: number;
}

export function listMappings(params: ListParams = {}) {
  return apiClient.get<MappingListResponseDto>(
    BASE,
    {
      search: params.search || undefined,
      site_id: params.siteId || undefined,
      // Read by the backend's sub-org scope middleware, which narrows the list
      // to this sub-org (and rejects one outside the user's scope).
      sub_org_id: params.subOrgId || undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    { withAuth: true }
  );
}

export function listSiteOptions(search?: string) {
  return apiClient.get<SiteOptionsResponseDto>(`${BASE}/options/sites`, { search: search || undefined }, { withAuth: true });
}

export function listSubOrgOptions(search?: string) {
  return apiClient.get<SubOrgOptionsResponseDto>(
    `${BASE}/options/sub-organizations`,
    { search: search || undefined },
    { withAuth: true }
  );
}

export function createMapping(input: { siteId: number; subOrgId: number }) {
  return apiClient.post<MappingDto>(BASE, { site_id: input.siteId, sub_org_id: input.subOrgId }, { withAuth: true });
}

export function deleteMapping(id: number) {
  return apiClient.delete<{ success: boolean }>(`${BASE}/${id}`, { withAuth: true });
}
