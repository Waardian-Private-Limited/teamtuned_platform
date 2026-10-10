import { apiClient } from '@/lib/apiClient';
import type { ReviewPageDto } from '../types/review.dto';
import type { RequestType, ReviewFilters, ReviewScope } from '../types/review.model';

const auth = { withAuth: true } as const;

const PATHS: Record<RequestType, string> = {
  regularize: '/attendance/regularizations/review',
  verification: '/attendance/reviews/review',
};

/** Requests of one type the signed-in reviewer is part of; the server decides which, from the approval flows. */
export function listReview(type: RequestType, scope: ReviewScope | null, f: ReviewFilters, page: number, pageSize: number, signal?: AbortSignal) {
  return apiClient.get<ReviewPageDto>(PATHS[type], {
    scope: scope ?? undefined,
    status: f.status ?? undefined,
    site_id: f.siteId ?? undefined,
    department_id: f.departmentId ?? undefined,
    from: f.from || undefined,
    to: f.to || undefined,
    search: f.search || undefined,
    page,
    page_size: pageSize,
  }, { ...auth, signal });
}
