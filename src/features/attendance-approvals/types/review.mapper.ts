import type { ReviewPageDto } from './review.dto';
import type { RequestRow, RowPage, RowStatus } from './review.model';
import type { RegularizationKind } from '@/features/my-attendance/types/regularization.model';

const KINDS: readonly string[] = ['missed_checkout', 'missed_checkin', 'missed_both', 'wrong_time', 'remove_late_mark', 'remove_late_penalty', 'remove_early_mark', 'remove_early_penalty'];
const STATUSES: readonly string[] = ['pending', 'approved', 'rejected', 'cancelled'];
const kindsOf = (list: string[]) => (list || []).filter((k): k is RegularizationKind => KINDS.includes(k));
const statusOf = (s: string): RowStatus => (STATUSES.includes(s) ? (s as RowStatus) : 'pending');

export function toReviewPage(dto: ReviewPageDto): RowPage {
  return {
    rows: dto.items.map((r): RequestRow => ({
      id: r.id, approvalId: r.approval_id, employee: r.employee, date: r.date, status: statusOf(r.status), waitingForMe: r.waiting_for_me,
      kinds: kindsOf(r.kinds), inTime: r.in_time, outTime: r.out_time, recordedInTime: r.recorded_in_time, recordedOutTime: r.recorded_out_time,
      reason: r.reason, hasAttachment: r.has_attachment, submittedAt: r.submitted_at,
    })),
    total: dto.total, page: dto.page, pageSize: dto.page_size,
  };
}
