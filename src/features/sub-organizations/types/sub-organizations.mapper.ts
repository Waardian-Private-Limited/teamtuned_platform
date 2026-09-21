import type { SubOrganizationDto, SubOrganizationListResponseDto } from './sub-organizations.dto';
import type { SubOrganization, SubOrganizationListResult } from './sub-organizations.model';

export function toSubOrganization(dto: SubOrganizationDto): SubOrganization {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    address: dto.address ?? '',
    gstNumber: dto.gst_number ?? '',
    logoUrl: dto.logo_url ?? '',
    isPrimary: Boolean(dto.is_primary),
    status: dto.status === 'inactive' ? 'inactive' : 'active',
  };
}

export function toSubOrganizationList(dto: SubOrganizationListResponseDto): SubOrganizationListResult {
  return {
    subOrganizations: (dto.sub_organizations || []).map(toSubOrganization),
    page: dto.page,
    pageSize: dto.pageSize,
    total: dto.total,
    pages: dto.pages,
  };
}
