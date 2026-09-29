import { apiClient } from '@/lib/apiClient';
import type { ShiftTemplateDto, ShiftTemplateListResponseDto } from '../types/shiftTemplates.dto';
import type { ShiftTemplateFormInput } from '../types/shiftTemplates.model';

interface ListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  subOrgId?: number | null;
}

function toBody(input: ShiftTemplateFormInput) {
  return {
    name: input.name,
    start_time: input.startTime,
    end_time: input.endTime,
    break_minutes: input.breakMinutes,
    status: input.status,
    sub_organization_id: input.subOrganizationId ?? null,
  };
}

export function listShiftTemplates(params: ListParams = {}) {
  return apiClient.get<ShiftTemplateListResponseDto>(
    '/shift-templates',
    {
      search: params.search || undefined,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      page: params.page,
      pageSize: params.pageSize,
      subOrgId: params.subOrgId ?? undefined,
    },
    { withAuth: true }
  );
}

export function createShiftTemplate(input: ShiftTemplateFormInput) {
  return apiClient.post<ShiftTemplateDto>('/shift-templates', toBody(input), { withAuth: true });
}

export function updateShiftTemplate(id: number, input: ShiftTemplateFormInput) {
  return apiClient.put<ShiftTemplateDto>(`/shift-templates/${id}`, toBody(input), { withAuth: true });
}

export function updateShiftTemplateStatus(id: number, status: string) {
  return apiClient.patch<ShiftTemplateDto>(`/shift-templates/${id}/status`, { status }, { withAuth: true });
}

export function deleteShiftTemplate(id: number) {
  return apiClient.delete<{ success: boolean }>(`/shift-templates/${id}`, { withAuth: true });
}
