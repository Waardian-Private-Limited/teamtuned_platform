import { apiClient } from '@/lib/apiClient';
import type { ListResponseDto } from '../../shared/types/recruitment.dto';

export type ReferralStatus = 'in_review' | 'interviewing' | 'offered' | 'hired' | 'not_selected';

export interface ReferralDto {
  id: number;
  candidateName: string;
  positionTitle: string;
  status: ReferralStatus;
  referredAt: string;
  reward: ReferralRewardDto | null;
}

export type ReferralRewardStatus = 'waiting' | 'due' | 'scheduled' | 'paid' | 'forfeited' | 'cancelled';

export interface ReferralRewardDto {
  status: ReferralRewardStatus;
  rewardType: 'cash' | 'non_cash';
  amount: number | null;
  description: string | null;
  payoutMode: 'payroll' | 'manual';
  eligibleOn: string | null;
  payoutMonth: string | null;
  paidOn: string | null;
}

/** What referring earns, shown before someone refers. */
export interface ReferralProgramSummaryDto {
  enabled: boolean;
  reward_type?: 'cash' | 'non_cash';
  amount?: number | null;
  description?: string | null;
  payable_after_days?: number;
  payout_mode?: 'payroll' | 'manual';
  terms?: string;
  has_terms_file?: boolean;
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

export function getReferralProgram() {
  return apiClient.get<ReferralProgramSummaryDto>('/recruitment/referrals/program', undefined, auth);
}

export function getReferralTermsUrl() {
  return apiClient.get<{ url: string; name: string }>('/recruitment/referrals/program/terms-url', undefined, auth);
}

// HR: every referral reward (RECRUIT_MANAGE to see, RECRUIT_SETTINGS to change).
export interface ReferralRewardRowDto {
  id: number;
  status: ReferralRewardStatus;
  statusReason: string | null;
  rewardType: 'cash' | 'non_cash';
  amount: number | null;
  description: string | null;
  payoutMode: 'payroll' | 'manual';
  payableAfterDays: number;
  joinedOn: string | null;
  eligibleOn: string | null;
  payoutMonth: string | null;
  paidOn: string | null;
  paidReference: string | null;
  note: string | null;
  referrer: { id: number; name: string; code: string | null };
  hire: { id: number; name: string; code: string | null };
  positionTitle: string;
}

export interface ReferralRewardPageDto {
  items: ReferralRewardRowDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  counts: Partial<Record<ReferralRewardStatus, number>>;
}

export function listReferralRewards(params: { status?: ReferralRewardStatus | null; search?: string; page?: number }) {
  return apiClient.get<ReferralRewardPageDto>('/recruitment/referral-rewards', { ...params, status: params.status ?? undefined, pageSize: 25 }, auth);
}

export function updateReferralReward(id: number, body: { amount?: number; description?: string; note?: string }) {
  return apiClient.patch<ReferralRewardRowDto>(`/recruitment/referral-rewards/${id}`, body, auth);
}

export function cancelReferralReward(id: number, reason: string) {
  return apiClient.post<ReferralRewardRowDto>(`/recruitment/referral-rewards/${id}/cancel`, { reason }, auth);
}

export function payReferralReward(id: number, body: { paid_on?: string; reference?: string }) {
  return apiClient.post<ReferralRewardRowDto>(`/recruitment/referral-rewards/${id}/pay`, body, auth);
}
