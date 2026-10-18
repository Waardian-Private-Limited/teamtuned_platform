import type { SiteSegment } from '../constants/employeeSites.constants';

export interface EmployeeSiteRow {
  id: number;
  code: string | null;
  name: string;
  phone: string | null;
  status: string | null;
  designation: string | null;
  department: string | null;
  role: string | null;
  primarySite: { id: number; name: string } | null;
  siteCount: number;
  isIncharge: boolean;
  locationAccess: string;
  canCheckinAnySite: boolean;
  otherLocationCount: number;
}

export interface EmployeeSiteSummary {
  total: number;
  unassigned: number;
  incharge: number;
}

export interface EmployeeSiteListResult {
  employees: EmployeeSiteRow[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  summary: EmployeeSiteSummary;
}

export interface AssignedSite {
  siteId: number;
  name: string;
  code: string | null;
  city: string | null;
  status: string | null;
  isPrimary: boolean;
  isIncharge: boolean;
}

export interface OtherLocation {
  id: number;
  name: string;
  type: string | null;
  address: string | null;
  status: string | null;
}

export interface LocationAccessOption {
  value: string;
  label: string;
  description: string;
}

export interface EmployeeSiteDetail {
  employee: {
    id: number;
    code: string | null;
    name: string;
    status: string | null;
    designation: string | null;
    department: string | null;
    role: string | null;
  };
  sites: AssignedSite[];
  locationAccess: string;
  canCheckinAnySite: boolean;
  otherLocations: OtherLocation[];
  locationAccessOptions: LocationAccessOption[];
}

export interface SiteOption {
  id: number;
  name: string;
  code: string | null;
  city: string | null;
}

export interface EmployeeSiteFilters {
  search: string;
  departmentId: number | null;
  siteId: number | null;
  segment: SiteSegment;
  subOrgId: number | null;
}

/** What the drawer submits. */
export interface EmployeeSiteFormInput {
  sites: Array<{ siteId: number; isPrimary: boolean }>;
  locationAccess: string;
  otherLocationIds: number[];
}
