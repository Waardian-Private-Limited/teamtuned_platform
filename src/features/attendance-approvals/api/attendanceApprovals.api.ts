import { apiClient } from '@/lib/apiClient';
import type { ReviewPageDto } from '../types/review.dto';
import type { ReviewFilters } from '../types/review.model';

const auth = { withAuth: true } as const;

/** Requests the signed-in reviewer is part of; the server decides which, from the approval flows. */
export function listReview(f: ReviewFilters, page: number, pageSize: number, signal?: AbortSignal) {
  return apiClient.get<ReviewPageDto>('/attendance/regularizations/review', {
    status: f.status,
    site_id: f.siteId ?? undefined,
    department_id: f.departmentId ?? undefined,
    role_id: f.roleId ?? undefined,
    from: f.from || undefined,
    to: f.to || undefined,
    search: f.search || undefined,
    sort: f.sort,
    page,
    page_size: pageSize,
  }, { ...auth, signal });
}
