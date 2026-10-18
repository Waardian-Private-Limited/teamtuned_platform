export interface Mapping {
  id: number;
  siteId: number;
  siteName: string;
  siteCode: string | null;
  siteCity: string | null;
  subOrgId: number;
  subOrgName: string;
  subOrgCode: string | null;
  createdAt: string | null;
}

export interface MappingListResult {
  mappings: Mapping[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

// One entry in a server-searched picker (site or sub-organization).
export interface PickerOption {
  value: number;
  label: string;
  hint?: string;
}

export interface MappingFormInput {
  siteId: number | null;
  subOrgId: number | null;
}
