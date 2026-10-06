export type ShiftTemplateStatus = 'active' | 'inactive';

export interface ShiftTemplate {
  id: number;
  name: string;
  shortCode: string | null;
  /** HH:MM:SS */
  startTime: string;
  /** HH:MM:SS */
  endTime: string;
  durationMinutes: number;
  breakMinutes: number;
  crossesMidnight: boolean;
  workingMinutes: number;
  status: ShiftTemplateStatus;
  subOrganizationId: number | null;
}

export interface ShiftTemplateListResult {
  shifts: ShiftTemplate[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface ShiftTemplateFormInput {
  name: string;
  shortCode: string;
  /** HH:MM from <input type="time"> */
  startTime: string;
  endTime: string;
  /** Set only for shifts longer than a day; the end time is then derived. */
  durationMinutes: number | null;
  breakMinutes: number;
  status: ShiftTemplateStatus;
  subOrganizationId: number | null;
}
