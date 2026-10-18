import { apiClient } from '@/lib/apiClient';
import type { ListResponseDto } from '../../shared/types/recruitment.dto';

export type ReferralStatus = 'in_review' | 'interviewing' | 'offered' | 'hired' | 'not_selected';

export interface ReferralDto {
  id: number;
  candidateName: string;
  positionTitle: string;
  status: ReferralStatus;
  referredAt: string;
}

type Named = { id?: number | null; name?: string } | string | null | undefined;

export interface ReferralPositionDto {
  id: number;
  title: string;
  department?: Named;
  location?: Named;
}

export interface ReferralInput {
  positionId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  note: string;
  resume: File | null;
}

const auth = { withAuth: true } as const;

export function listMyReferrals(page = 1, pageSize = 20) {
  return apiClient.get<ListResponseDto<ReferralDto> | ReferralDto[]>('/recruitment/referrals/mine', { page, pageSize }, auth);
}

export function listReferralPositions() {
  return apiClient.get<ReferralPositionDto[] | { items: ReferralPositionDto[] }>('/recruitment/referrals/positions', undefined, auth);
}

export function createReferral(input: ReferralInput) {
  const fd = new FormData();
  fd.append('position_id', String(input.positionId));
  fd.append('first_name', input.firstName.trim());
  fd.append('last_name', input.lastName.trim());
  fd.append('email', input.email.trim());
  if (input.phone.trim()) fd.append('phone', input.phone.trim());
  if (input.note.trim()) fd.append('note', input.note.trim());
  if (input.resume) fd.append('resume', input.resume);
  return apiClient.post('/recruitment/referrals', fd, auth);
}
