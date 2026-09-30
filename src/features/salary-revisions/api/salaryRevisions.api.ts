import { apiClient } from '@/lib/apiClient';
import type { RevisionDto, RevisionPreviewDto } from '@/features/compensation/types/compensation.dto';

const auth = { withAuth: true };

export interface RevisionListParams {
  search?: string;
  status?: string;
  type?: string;
  subOrgId?: number | null;
  page: number;
  pageSize: number;
}

export interface RevisionListResponse {
  revisions: RevisionDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  counts: Record<string, number>;
}

export interface LetterDto {
  kind: 'increment' | 'promotion';
  revision_id: number;
  company: { name: string; address: string | null; logo_url: string | null; gst_number: string | null; email: string | null; phone: string | null };
  recipient: { name: string; employee_code: string; designation: string; department: string };
  date: string;
  title: string;
  paragraphs: string[];
  structure: { name: string; monthly: number; annual: number }[];
  totals: { monthly_gross: number | null; annual_ctc: number | null };
  signatory: string;
}

export function listRevisions(params: RevisionListParams) {
  return apiClient.get<RevisionListResponse>(
    '/salary-revisions',
    {
      search: params.search || undefined,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      type: params.type || undefined,
      subOrgId: params.subOrgId ?? undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    auth
  );
}

export const previewRevision = (body: Record<string, unknown>) => apiClient.post<RevisionPreviewDto>('/salary-revisions/preview', body, auth);
export const createRevision = (body: Record<string, unknown>) => apiClient.post<RevisionDto>('/salary-revisions', body, auth);
export const updateRevision = (id: number, body: Record<string, unknown>) => apiClient.put<RevisionDto>(`/salary-revisions/${id}`, body, auth);
export const submitRevisions = (ids: number[]) => apiClient.post<{ submitted: number; approved: number; applied: number }>('/salary-revisions/submit', { ids }, auth);
export const decideRevisions = (ids: number[], decision: 'approve' | 'reject', note?: string) =>
  apiClient.post<{ decided: number; blocked: number; applied: number }>('/salary-revisions/decide', { ids, decision, note }, auth);
export const cancelRevisions = (ids: number[]) => apiClient.post<{ cancelled: number }>('/salary-revisions/cancel', { ids }, auth);
export const getLetter = (id: number) => apiClient.get<LetterDto>(`/salary-revisions/${id}/letter`, undefined, auth);
export const getMyLetter = (id: number) => apiClient.get<LetterDto>(`/salary-revisions/me/${id}/letter`, undefined, auth);
export const listRoles = () => apiClient.get<{ id: number; name: string }[]>('/organization/roles', undefined, auth);
