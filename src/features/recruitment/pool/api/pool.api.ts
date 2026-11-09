import { recruitmentApi } from '../../shared/api/recruitment.api';
import type { ImportResult, LeadInput, LeadStatus, PoolList, PoolPerson, PoolSort, PoolTab } from '../types/pool.types';

// /api/v1/recruitment/pool — talent pool & leads (TALENT_POOL_FEATURE).

export interface PoolQuery {
  tab: PoolTab;
  search: string;
  leadSource: string;
  mine: boolean;
  sort: PoolSort;
  page: number;
  pageSize: number;
}

export function listPool(q: PoolQuery) {
  return recruitmentApi.get<PoolList>('/pool', {
    status: q.tab && q.tab !== 'due' ? q.tab : undefined,
    follow_up: q.tab === 'due' ? 'due' : undefined,
    search: q.search.trim() || undefined,
    lead_source: q.leadSource || undefined,
    mine: q.mine ? 1 : undefined,
    sort: q.sort,
    page: q.page,
    pageSize: q.pageSize,
  });
}

export const getPoolPerson = (id: number) => recruitmentApi.get<PoolPerson>(`/pool/${id}`);

export const addLead = (body: LeadInput) => recruitmentApi.post<PoolPerson>('/pool', body);

export const importPool = (body: { rows: Array<Record<string, string>>; lead_source?: string; lead_status?: LeadStatus | null; update_existing?: boolean }) =>
  recruitmentApi.post<ImportResult>('/pool/import', body);

export const logActivity = (id: number, body: { status?: LeadStatus; note?: string; follow_up_on?: string | null }) =>
  recruitmentApi.post<PoolPerson>(`/pool/${id}/activities`, body);

export const moveToPosition = (id: number, body: { position_id: number; note?: string }) =>
  recruitmentApi.post<{ applicationId: number; positionId: number; positionTitle: string }>(`/pool/${id}/move`, body);
