import { apiClient } from '@/lib/apiClient';
import type { CreateDeductionRequestDto, CreateDeductionResponseDto, DeductionListResponseDto } from '../types/otherDeductions.dto';

const auth = { withAuth: true };

export const DEDUCTION_PAYOUT_TYPE = 'other_deduction';

export function listDeductions(params: { month: string; search?: string; status?: string; page: number; pageSize: number }) {
  return apiClient.get<DeductionListResponseDto>(
    '/compensation/payouts',
    {
      type: DEDUCTION_PAYOUT_TYPE,
      month: params.month,
      search: params.search || undefined,
      status: params.status || undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    auth
  );
}

export function createDeductions(body: CreateDeductionRequestDto) {
  return apiClient.post<CreateDeductionResponseDto>('/compensation/payouts', body, auth);
}

export function cancelDeductions(ids: number[], note?: string) {
  return apiClient.post<{ cancelled: number; locked: number }>('/compensation/payouts/cancel', { ids, note: note || undefined }, auth);
}
