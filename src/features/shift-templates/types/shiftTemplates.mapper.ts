import type { ShiftTemplateDto, ShiftTemplateListResponseDto } from './shiftTemplates.dto';
import type { ShiftTemplate, ShiftTemplateListResult } from './shiftTemplates.model';

export function toShiftTemplate(dto: ShiftTemplateDto): ShiftTemplate {
  return {
    id: dto.id,
    name: dto.name,
    startTime: dto.start_time,
    endTime: dto.end_time,
    breakMinutes: dto.break_minutes,
    crossesMidnight: dto.crosses_midnight,
    workingMinutes: dto.working_minutes,
    status: dto.status,
    subOrganizationId: dto.sub_organization_id ?? null,
  };
}

export function toShiftTemplateList(dto: ShiftTemplateListResponseDto): ShiftTemplateListResult {
  return {
    shifts: (dto.shifts || []).map(toShiftTemplate),
    page: dto.page,
    pageSize: dto.pageSize,
    total: dto.total,
    pages: dto.pages,
  };
}
