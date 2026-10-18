import type {
  EmployeeSiteRowDto,
  EmployeeSiteListResponseDto,
  AssignedSiteDto,
  OtherLocationDto,
  EmployeeSiteDetailDto,
  SiteOptionDto,
} from './employeeSites.dto';
import type {
  EmployeeSiteRow,
  EmployeeSiteListResult,
  AssignedSite,
  OtherLocation,
  EmployeeSiteDetail,
  SiteOption,
} from './employeeSites.model';

export function toEmployeeSiteRow(dto: EmployeeSiteRowDto): EmployeeSiteRow {
  return {
    id: dto.id,
    code: dto.code ?? null,
    name: dto.name || dto.code || `Employee #${dto.id}`,
    phone: dto.phone ?? null,
    status: dto.status ?? null,
    designation: dto.designation ?? null,
    department: dto.department ?? null,
    role: dto.role ?? null,
    primarySite: dto.primary_site ? { id: dto.primary_site.id, name: dto.primary_site.name || `Site #${dto.primary_site.id}` } : null,
    siteCount: Number(dto.site_count || 0),
    isIncharge: Boolean(dto.is_incharge),
    locationAccess: dto.location_access || 'assigned',
    canCheckinAnySite: Boolean(dto.can_checkin_any_site),
    otherLocationCount: Number(dto.other_location_count || 0),
  };
}

export function toEmployeeSiteList(dto: EmployeeSiteListResponseDto): EmployeeSiteListResult {
  return {
    employees: (dto.employees || []).map(toEmployeeSiteRow),
    page: dto.page || 1,
    pageSize: dto.pageSize || 20,
    total: Number(dto.total || 0),
    pages: Number(dto.pages || 0),
    summary: {
      total: Number(dto.summary?.total || 0),
      unassigned: Number(dto.summary?.unassigned || 0),
      incharge: Number(dto.summary?.incharge || 0),
    },
  };
}

export function toAssignedSite(dto: AssignedSiteDto): AssignedSite {
  return {
    siteId: dto.site_id,
    name: dto.name || `Site #${dto.site_id}`,
    code: dto.code ?? null,
    city: dto.city ?? null,
    status: dto.status ?? null,
    isPrimary: Boolean(dto.is_primary),
    isIncharge: Boolean(dto.is_incharge),
  };
}

export function toOtherLocation(dto: OtherLocationDto): OtherLocation {
  return {
    id: dto.id,
    name: dto.location_name,
    type: dto.location_type ?? null,
    address: dto.address ?? null,
    status: dto.status ?? null,
  };
}

export function toEmployeeSiteDetail(dto: EmployeeSiteDetailDto): EmployeeSiteDetail {
  return {
    employee: {
      id: dto.employee.id,
      code: dto.employee.code ?? null,
      name: dto.employee.name || dto.employee.code || `Employee #${dto.employee.id}`,
      status: dto.employee.status ?? null,
      designation: dto.employee.designation ?? null,
      department: dto.employee.department ?? null,
      role: dto.employee.role ?? null,
    },
    sites: (dto.sites || []).map(toAssignedSite),
    locationAccess: dto.location_access || 'assigned',
    canCheckinAnySite: Boolean(dto.can_checkin_any_site),
    otherLocations: (dto.other_locations || []).map(toOtherLocation),
    locationAccessOptions: dto.location_access_options || [],
  };
}

export function toSiteOption(dto: SiteOptionDto): SiteOption {
  return {
    id: dto.id,
    name: dto.name || `Site #${dto.id}`,
    code: dto.code ?? null,
    city: dto.city ?? null,
  };
}
