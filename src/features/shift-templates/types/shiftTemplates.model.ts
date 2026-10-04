export type ShiftTemplateStatus = 'active' | 'inactive';

export interface ShiftTemplate {
  id: number;
  name: string;
  shortCode: string | null;
  /** HH:MM:SS */
  startTime: string;
  /** HH:MM:SS */
  endTime: string;
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
  breakMinutes: number;
  status: ShiftTemplateStatus;
  subOrganizationId: number | null;
}
