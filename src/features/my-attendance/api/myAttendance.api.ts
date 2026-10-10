import { apiClient } from '@/lib/apiClient';
import type { DayDetailDto, MonthResponseDto } from '@/features/detailed-attendance/types/detailed.dto';
import type { RegularizationOptionsDto, RegularizationRequestDto, RegularizationSubmitBody } from '../types/regularization.dto';

const auth = { withAuth: true } as const;

/*
 * Everything here is about the signed-in employee. No employee id is ever sent: the server reads
 * who is asking from the token, so there is nothing in a URL or a request to change to see or
 * touch someone else's attendance.
 */

export function getMyMonth(month: string, signal?: AbortSignal) {
  return apiClient.get<MonthResponseDto>('/attendance-records/me/month', { month: month || undefined }, { ...auth, signal });
}

export function getMyDay(date: string, signal?: AbortSignal) {
  return apiClient.get<DayDetailDto>(`/attendance-records/me/days/${date}`, undefined, { ...auth, signal });
}

export function getRegularizationOptions(date: string, signal?: AbortSignal) {
  return apiClient.get<RegularizationOptionsDto>('/attendance/me/regularizations/options', { date }, { ...auth, signal });
}

/** A proof file travels as a form, so the list of kinds goes as JSON text. */
export function submitRegularization(body: RegularizationSubmitBody, attachment: File | null) {
  if (!attachment) return apiClient.post<RegularizationRequestDto>('/attendance/me/regularizations', body, auth);
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) form.append(key, key === 'kinds' ? JSON.stringify(value) : String(value));
  form.append('attachment', attachment);
  return apiClient.post<RegularizationRequestDto>('/attendance/me/regularizations', form, auth);
}

export function cancelRegularization(id: number) {
  return apiClient.post<RegularizationRequestDto>(`/attendance/me/regularizations/${id}/cancel`, undefined, auth);
}
