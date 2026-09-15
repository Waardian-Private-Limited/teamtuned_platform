import type {
  DepartmentDto,
  DepartmentListResponseDto,
  DepartmentHeadDto,
  DepartmentHeadsPanelDto,
  HeadCandidateDto,
} from './departments.dto';
import type {
  Department,
  DepartmentHead,
  DepartmentHeadsPanel,
  DepartmentListResult,
  HeadCandidate,
} from './departments.model';

export function toDepartment(dto: DepartmentDto): Department {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    status: dto.status,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    orgWideHeadName: dto.heads?.orgWideHead ?? null,
    siteHeadCount: dto.heads?.siteHeadCount ?? 0,
  };
}

export function toDepartmentList(dto: DepartmentListResponseDto): DepartmentListResult {
  return {
    departments: (dto.departments || []).map(toDepartment),
    page: dto.page,
    pageSize: dto.pageSize,
    total: dto.total,
    pages: dto.pages,
  };
}

export function toDepartmentHead(dto: DepartmentHeadDto): DepartmentHead {
  return {
    employeeId: dto.employeeId,
    name: dto.name,
    designation: dto.designation,
    siteId: dto.siteId,
    siteName: dto.siteName,
  };
}

export function toDepartmentHeadsPanel(dto: DepartmentHeadsPanelDto): DepartmentHeadsPanel {
  return {
    department: {
      id: dto.department.id,
      name: dto.department.name,
      description: dto.department.description,
      status: dto.department.status,
    },
    orgWideHead: dto.orgWideHead ? toDepartmentHead(dto.orgWideHead) : null,
    sites: (dto.sites || []).map((s) => ({
      siteId: s.siteId,
      siteName: s.siteName,
      head: s.head ? toDepartmentHead(s.head) : null,
    })),
  };
}

export function toHeadCandidate(dto: HeadCandidateDto): HeadCandidate {
  return { id: dto.id, name: dto.name, designation: dto.designation, departmentName: dto.departmentName };
}

export function toHeadCandidates(dtos: HeadCandidateDto[]): HeadCandidate[] {
  return (dtos || []).map(toHeadCandidate);
}
