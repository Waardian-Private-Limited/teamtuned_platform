// UI-facing domain types. auth.mapper.ts is the only place these meet the
// wire DTOs (departments.dto.ts).

export type DepartmentStatus = 'active' | 'inactive';

export interface Department {
  id: number;
  name: string;
  description: string | null;
  status: DepartmentStatus;
  createdAt?: string;
  updatedAt?: string | null;
  orgWideHeadName: string | null;
  siteHeadCount: number;
}

export interface DepartmentListResult {
  departments: Department[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface DepartmentHead {
  employeeId: number;
  name: string;
  designation: string | null;
  siteId: number | null;
  siteName: string | null;
}

export interface SiteHeadRow {
  siteId: number;
  siteName: string;
  head: DepartmentHead | null;
}

export interface DepartmentHeadsPanel {
  department: Pick<Department, 'id' | 'name' | 'description' | 'status'>;
  orgWideHead: DepartmentHead | null;
  sites: SiteHeadRow[];
}

export interface HeadCandidate {
  id: number;
  name: string;
  designation: string | null;
  departmentName: string | null;
}

export interface DepartmentFormInput {
  name: string;
  description: string;
  status: DepartmentStatus;
}
