import { apiClient } from '@/lib/apiClient';
import type { Holiday, HolidayInput, HolidayListResponse, MyHolidaysResponse } from '../types/holidays';

interface ListParams {
  year: number;
  search?: string;
  status?: string;
  type?: string;
  subOrgId?: number | null;
}

export function listHolidays(p: ListParams) {
  return apiClient.get<HolidayListResponse>(
    '/holidays',
    {
      year: p.year,
      search: p.search || undefined,
      status: p.status && p.status !== 'all' ? p.status : undefined,
      type: p.type || undefined,
      subOrgId: p.subOrgId ?? undefined,
    },
    { withAuth: true }
  );
}

export const createHoliday = (input: HolidayInput) => apiClient.post<Holiday>('/holidays', input, { withAuth: true });
export const updateHoliday = (id: number, input: HolidayInput) => apiClient.put<Holiday>(`/holidays/${id}`, input, { withAuth: true });
export const setHolidayStatus = (id: number, status: string) => apiClient.patch<Holiday>(`/holidays/${id}/status`, { status }, { withAuth: true });
export const deleteHoliday = (id: number) => apiClient.delete<{ success: boolean }>(`/holidays/${id}`, { withAuth: true });
export const copyHolidays = (fromYear: number, toYear: number, ids?: number[]) =>
  apiClient.post<{ created: number; skipped: number }>('/holidays/copy', { from_year: fromYear, to_year: toYear, ids }, { withAuth: true });
export const myHolidays = (year: number) => apiClient.get<MyHolidaysResponse>('/holidays/me', { year }, { withAuth: true });
/** Whether a policy in force lets employees take optional holidays: only then can a holiday be marked optional. */
export const optionalHolidaysEnabled = () => apiClient.get<{ enabled: boolean }>('/holidays/optional/settings', undefined, { withAuth: true });
export const applyOptionalHoliday = (holidayId: number) => apiClient.post<{ id: number; state: string }>('/holidays/me/optional', { holiday_id: holidayId }, { withAuth: true });
export const cancelOptionalHoliday = (choiceId: number) => apiClient.post<{ id: number; state: string }>(`/holidays/me/optional/${choiceId}/cancel`, {}, { withAuth: true });
