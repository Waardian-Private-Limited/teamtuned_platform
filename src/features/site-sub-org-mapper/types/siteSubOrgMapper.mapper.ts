import type { MappingDto, MappingListResponseDto, SiteOptionDto, SubOrgOptionDto } from './siteSubOrgMapper.dto';
import type { Mapping, MappingListResult, PickerOption } from './siteSubOrgMapper.model';

export function toMapping(dto: MappingDto): Mapping {
  return {
    id: dto.id,
    siteId: dto.site.id,
    siteName: dto.site.name ?? `Site #${dto.site.id}`,
    siteCode: dto.site.code,
    siteCity: dto.site.city,
    subOrgId: dto.subOrganization.id,
    subOrgName: dto.subOrganization.name ?? `Sub-organization #${dto.subOrganization.id}`,
    subOrgCode: dto.subOrganization.code,
    createdAt: dto.createdAt,
  };
}

export function toMappingList(dto: MappingListResponseDto): MappingListResult {
  return {
    mappings: (dto.mappings || []).map(toMapping),
    page: dto.page,
    pageSize: dto.pageSize,
    total: dto.total,
    pages: dto.pages,
  };
}

export function toSiteOption(dto: SiteOptionDto): PickerOption {
  const hint = [dto.code, dto.city].filter(Boolean).join(' · ');
  return { value: dto.id, label: dto.name, hint: hint || undefined };
}

export function toSubOrgOption(dto: SubOrgOptionDto): PickerOption {
  return { value: dto.id, label: dto.name, hint: dto.code ?? undefined };
}
