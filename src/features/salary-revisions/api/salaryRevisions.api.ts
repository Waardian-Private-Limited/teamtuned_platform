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

/** The letter dialog: the Document Centre template for this revision and what HR confirms before downloading. */
export interface RevisionLetterFormDto {
  docType: 'increment_letter' | 'promotion_letter';
  docTypeLabel: string;
  template: { id: number; name: string };
  reference: string | null;
  issuedAt: string | null;
  inputs: Array<{ key: string; label: string; type: 'date' | 'text' | 'number' | 'money'; required: boolean; value: string }>;
  slots: Array<{ key: string; label: string; signatoryId: number | null; open: boolean; chosen: number | null }>;
  usesStamp: boolean;
  stampId: number | null;
  signatories: Array<{ id: number; name: string; designation: string | null }>;
  stamps: Array<{ id: number; name: string }>;
}

export interface RevisionLetterChoice {
  inputs: Record<string, string>;
  signatories: Record<string, number>;
  stamp_id: number | null;
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
export const getLetterForm = (id: number) => apiClient.get<RevisionLetterFormDto>(`/salary-revisions/${id}/letter/form`, undefined, auth);
/** The letter PDF, made on demand: the first download takes a reference number, later ones keep it. */
export const downloadLetter = (id: number, choice: RevisionLetterChoice) =>
  apiClient<Blob>(`/salary-revisions/${id}/letter`, { ...auth, method: 'POST', body: choice, responseType: 'blob' });
/** The employee's own copy of an issued letter (404 until HR has issued it). */
export const downloadMyLetter = (id: number) => apiClient<Blob>(`/salary-revisions/me/${id}/letter`, { ...auth, responseType: 'blob' });
export const listRoles = () => apiClient.get<{ id: number; name: string }[]>('/organization/roles', undefined, auth);
export const voidRevision = (id: number, reason: string) => apiClient.post<RevisionDto>(`/salary-revisions/${id}/void`, { reason }, auth);
