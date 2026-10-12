import type { SubOrganizationDto, SubOrganizationListResponseDto } from './sub-organizations.dto';
import type { SubOrganization, SubOrganizationListResult } from './sub-organizations.model';

export function toSubOrganization(dto: SubOrganizationDto): SubOrganization {
  return {
    id: dto.id,
    name: dto.name,
    legalName: dto.legal_name ?? '',
    code: dto.code,
    address: dto.address ?? '',
    gstNumber: dto.gst_number ?? '',
    pan: dto.pan ?? '',
    tan: dto.tan ?? '',
    pfEstablishmentCode: dto.pf_establishment_code ?? '',
    esiEmployerCode: dto.esi_employer_code ?? '',
    ptRegistrationNo: dto.pt_registration_no ?? '',
    lwfRegistrationNo: dto.lwf_registration_no ?? '',
    registeredState: dto.registered_state ?? '',
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
