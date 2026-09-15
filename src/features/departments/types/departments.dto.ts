// Wire shapes returned by /api/v1/departments — mirrors the backend DTOs
// exactly (see teamtuned_backend/src/modules/departments/application/dto).

export interface DepartmentHeadSummaryDto {
  orgWideHead: string | null;
  siteHeadCount: number;
}

export interface DepartmentDto {
  id: number;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string | null;
  heads: DepartmentHeadSummaryDto;
}

export interface DepartmentListResponseDto {
  departments: DepartmentDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface DepartmentHeadDto {
  employeeId: number;
  name: string;
  designation: string | null;
  siteId: number | null;
  siteName: string | null;
}

export interface DepartmentHeadsPanelDto {
  department: Omit<DepartmentDto, 'heads'>;
  orgWideHead: DepartmentHeadDto | null;
  sites: Array<{ siteId: number; siteName: string; head: DepartmentHeadDto | null }>;
}

export interface HeadCandidateDto {
  id: number;
  name: string;
  designation: string | null;
  departmentName: string | null;
}
