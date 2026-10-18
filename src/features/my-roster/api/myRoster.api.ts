import { apiClient } from '@/lib/apiClient';
import type { MyRosterDetailDto, MyRosterListDto } from '../types/roster.dto';

const auth = { withAuth: true } as const;

// Always the signed-in employee: the server reads who is asking from the token.

export function getMyRosters(page: number, signal?: AbortSignal) {
  return apiClient.get<MyRosterListDto>('/roster/me/rosters', { page, page_size: 20 }, { ...auth, signal });
}

export function getMyRoster(id: number, signal?: AbortSignal) {
  return apiClient.get<MyRosterDetailDto>(`/roster/me/rosters/${id}`, undefined, { ...auth, signal });
}
