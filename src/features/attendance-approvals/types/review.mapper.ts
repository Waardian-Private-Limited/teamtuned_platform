import type { PlaceDto, PunchDto, ReviewPageDto } from './review.dto';
import type { Place, RequestRow, ReviewedPunch, ReviewStatusFilter, RowPage, RowStatus } from './review.model';
import type { RegularizationKind } from '@/features/my-attendance/types/regularization.model';

const KINDS: readonly string[] = ['missed_checkout', 'missed_checkin', 'missed_both', 'wrong_time', 'remove_late_mark', 'remove_late_penalty', 'remove_early_mark', 'remove_early_penalty'];
const STATUSES: readonly string[] = ['pending', 'approved', 'rejected', 'cancelled'];
const kindsOf = (list: string[] | undefined) => (list || []).filter((k): k is RegularizationKind => KINDS.includes(k));
const statusOf = (s: string): RowStatus => (STATUSES.includes(s) ? (s as RowStatus) : 'pending');

const place = (p: PlaceDto | null | undefined): Place | null => (p ? { name: p.name, outside: p.outside, distanceM: p.distance_m } : null);
const punch = (p: PunchDto): ReviewedPunch => ({
  direction: p.direction, time: p.time, place: p.place, outside: p.outside, distanceM: p.distance_m, issues: p.issues ?? [], reason: p.reason, reviewState: p.review_state,
});

export function toReviewPage(dto: ReviewPageDto): RowPage {
  return {
    rows: dto.items.map((r): RequestRow => ({
      id: r.id, approvalId: r.approval_id, employee: r.employee, date: r.date, status: statusOf(r.status), waitingForMe: r.waiting_for_me,
      waitingOn: r.waiting_on ? { step: r.waiting_on.step, approvers: r.waiting_on.approvers, openToRole: r.waiting_on.open_to_role, since: r.waiting_on.since } : null,
      kinds: kindsOf(r.kinds), inTime: r.in_time ?? null, outTime: r.out_time ?? null, recordedInTime: r.recorded_in_time ?? null, recordedOutTime: r.recorded_out_time ?? null,
      recordedInPlace: place(r.recorded_in_place), recordedOutPlace: place(r.recorded_out_place),
      reason: r.reason ?? null, hasAttachment: !!r.has_attachment, punches: (r.punches ?? []).map(punch), submittedAt: r.submitted_at,
    })),
    total: dto.total, page: dto.page, pageSize: dto.page_size,
    counts: dto.counts ?? {},
    access: { canTrack: !!dto.access?.can_track, allSites: !!dto.access?.all_sites },
    scope: dto.scope === 'all' ? 'all' : 'assigned',
    status: (dto.status as ReviewStatusFilter) || 'waiting',
  };
}
