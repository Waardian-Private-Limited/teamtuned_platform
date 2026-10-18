import { apiClient } from '@/lib/apiClient';
import type { ListResponseDto } from '../../shared/types/recruitment.dto';
import type { DossierDto, MyReviewDto, ReviewDecision, ReviewDto } from '../types/reviews.dto';

const auth = { withAuth: true } as const;
const BASE = '/recruitment';

export const listForApplication = (applicationId: number) => apiClient.get<{ items: ReviewDto[] }>(`${BASE}/applications/${applicationId}/reviews`, undefined, auth);

export const requestReviews = (applicationId: number, body: { reviewer_employee_ids: number[]; message?: string }) =>
  apiClient.post<{ items: ReviewDto[] }>(`${BASE}/applications/${applicationId}/reviews`, body, auth);

export const recordOffline = (applicationId: number, body: { reviewer_name: string; reviewer_designation?: string; decision: ReviewDecision; note?: string; suggested_ctc?: number | null; suggested_joining_date?: string | null }) =>
  apiClient.post<{ items: ReviewDto[] }>(`${BASE}/applications/${applicationId}/reviews/offline`, body, auth);

export const cancelReview = (id: number) => apiClient.post<{ items: ReviewDto[] }>(`${BASE}/reviews/${id}/cancel`, {}, auth);

/** One PDF with everything a reviewer needs, resume appended; generated on demand. */
export const reviewPack = (applicationId: number) => apiClient<Blob>(`${BASE}/applications/${applicationId}/review-pack`, { ...auth, responseType: 'blob' });

export const myReviews = (scope: 'pending' | 'done', page = 1, pageSize = 20) =>
  apiClient.get<ListResponseDto<MyReviewDto> & { counts?: { pending: number; done: number } }>(`${BASE}/reviews/mine`, { scope, page, pageSize }, auth);

export const getReview = (id: number) => apiClient.get<DossierDto>(`${BASE}/reviews/${id}`, undefined, auth);

export const decide = (id: number, body: { decision: ReviewDecision; note?: string; suggested_ctc?: number | null; suggested_joining_date?: string | null }) =>
  apiClient.put<DossierDto>(`${BASE}/reviews/${id}/decision`, body, auth);
