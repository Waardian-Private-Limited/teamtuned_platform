import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type { MarkPaidRequestDto, MarkResultDto, PayoutListDto, PayoutOverviewDto } from '../types/payouts.dto';

const auth = { withAuth: true };

export interface PayoutQuery {
  tab: string;
  source?: string | null;
  month?: string;
  siteId?: number | null;
  subOrgId?: number | null;
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

function params(q: PayoutQuery) {
  return {
    tab: q.tab,
    source: q.source || undefined,
    month: q.month || undefined,
    site_id: q.siteId ?? undefined,
    subOrgId: q.subOrgId ?? undefined,
    search: q.search || undefined,
    sort: q.sort,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export const listPayouts = (q: PayoutQuery) => apiClient.get<PayoutListDto>('/payouts', params(q), auth);
export const getOverview = (subOrgId: number | null) => apiClient.get<PayoutOverviewDto>('/payouts/overview', { subOrgId: subOrgId ?? undefined }, auth);
export const markPaid = (body: MarkPaidRequestDto) => apiClient.post<MarkResultDto>('/payouts/mark-paid', body, auth);
export const markFailed = (keys: string[], note: string) => apiClient.post<MarkResultDto>('/payouts/mark-failed', { keys, note }, auth);

export function exportBankSheet(q: PayoutQuery, keys: string[] | null) {
  return apiClient.post<ExportJobDto>('/exports/payouts-bank-sheet', { ...params(q), keys: keys ?? undefined }, auth);
}
