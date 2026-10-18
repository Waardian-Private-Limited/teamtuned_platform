// Wire shapes for /employee-sites (snake_case, as the backend sends them).

export interface EmployeeSiteRowDto {
  id: number;
  code: string | null;
  name: string | null;
  phone: string | null;
  status: string | null;
  designation: string | null;
  department: string | null;
  role: string | null;
  primary_site: { id: number; name: string | null } | null;
  site_count: number;
  is_incharge: boolean;
  location_access: string;
  can_checkin_any_site: boolean;
  other_location_count: number;
}

export interface EmployeeSiteSummaryDto {
  total: number;
  unassigned: number;
  incharge: number;
}

export interface EmployeeSiteListResponseDto {
  employees: EmployeeSiteRowDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  summary: EmployeeSiteSummaryDto;
}

export interface AssignedSiteDto {
  site_id: number;
  name: string | null;
  code: string | null;
  city: string | null;
  status: string | null;
  is_primary: boolean;
  is_incharge: boolean;
}

export interface OtherLocationDto {
  id: number;
  location_name: string;
  location_type?: string | null;
  address?: string | null;
  status?: string | null;
}

export interface LocationAccessOptionDto {
  value: string;
  label: string;
  description: string;
}

export interface EmployeeSiteDetailDto {
  employee: {
    id: number;
    code: string | null;
    name: string | null;
    status: string | null;
    designation: string | null;
    department: string | null;
    role: string | null;
    sub_organization_id: number | null;
  };
  sites: AssignedSiteDto[];
  location_access: string;
  can_checkin_any_site: boolean;
  other_locations: OtherLocationDto[];
  location_access_options: LocationAccessOptionDto[];
}

export interface SiteOptionDto {
  id: number;
  name: string | null;
  code: string | null;
  city: string | null;
}

export interface SiteOptionsResponseDto {
  sites: SiteOptionDto[];
}

export interface OtherLocationsResponseDto {
  locations: OtherLocationDto[];
}

export interface UpdateEmployeeSitesBodyDto {
  sites: Array<{ site_id: number; is_primary: boolean }>;
  location_access?: string;
}
