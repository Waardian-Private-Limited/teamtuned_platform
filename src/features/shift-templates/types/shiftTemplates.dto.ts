// Wire shapes returned by /api/v1/shift-templates — mirrors the backend DTO
// (teamtuned_backend/src/modules/shift-templates/application/dto).

export interface ShiftTemplateDto {
  id: number;
  name: string;
  short_code: string | null;
  start_time: string;
  end_time: string;
  break_minutes: number;
  crosses_midnight: boolean;
  working_minutes: number;
  status: 'active' | 'inactive';
  sub_organization_id: number | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface ShiftTemplateListResponseDto {
  shifts: ShiftTemplateDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}
