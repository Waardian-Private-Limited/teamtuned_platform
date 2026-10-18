// Wire shapes returned by /api/v1/site-sub-org-mapper — mirrors the backend
// DTOs exactly (see teamtuned_backend/src/modules/site-sub-org-mappings/application/dto).

export interface MappingDto {
  id: number;
  site: { id: number; name: string | null; code: string | null; city: string | null };
  subOrganization: { id: number; name: string | null; code: string | null };
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MappingListResponseDto {
  mappings: MappingDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface SiteOptionDto {
  id: number;
  name: string;
  code: string | null;
  city: string | null;
}

export interface SubOrgOptionDto {
  id: number;
  name: string;
  code: string | null;
  isPrimary: boolean;
}

export interface SiteOptionsResponseDto {
  sites: SiteOptionDto[];
}

export interface SubOrgOptionsResponseDto {
  subOrganizations: SubOrgOptionDto[];
}
