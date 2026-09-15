import { apiClient } from '@/lib/apiClient';
import type {
  DepartmentDto,
  DepartmentHeadsPanelDto,
  DepartmentListResponseDto,
  HeadCandidateDto,
} from '../types/departments.dto';

interface ListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

interface DepartmentInput {
  name: string;
  description: string;
  status: string;
}

export function listDepartments(params: ListParams = {}) {
  return apiClient.get<DepartmentListResponseDto>(
    '/departments',
    {
      search: params.search || undefined,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    { withAuth: true }
  );
}

export function createDepartment(input: DepartmentInput) {
  return apiClient.post<DepartmentDto>('/departments', input, { withAuth: true });
}

export function updateDepartment(id: number, input: DepartmentInput) {
  return apiClient.put<DepartmentDto>(`/departments/${id}`, input, { withAuth: true });
}

export function updateDepartmentStatus(id: number, status: string) {
  return apiClient.patch<DepartmentDto>(`/departments/${id}/status`, { status }, { withAuth: true });
}

export function deleteDepartment(id: number) {
  return apiClient.delete<{ success: boolean }>(`/departments/${id}`, { withAuth: true });
}

export function getDepartmentHeads(id: number) {
  return apiClient.get<DepartmentHeadsPanelDto>(`/departments/${id}/heads`, undefined, { withAuth: true });
}

export function assignDepartmentHead(id: number, input: { siteId?: number | null; employeeId: number }) {
  return apiClient.put<{ success: boolean }>(`/departments/${id}/heads`, input, { withAuth: true });
}

export function removeDepartmentHead(id: number, siteId?: number | null) {
  const query = siteId ? `?siteId=${siteId}` : '';
  return apiClient.delete<{ success: boolean }>(`/departments/${id}/heads${query}`, { withAuth: true });
}

export function listHeadCandidates(search?: string) {
  return apiClient.get<{ candidates: HeadCandidateDto[] }>(
    '/departments/head-candidates',
    { search: search || undefined },
    { withAuth: true }
  );
}
