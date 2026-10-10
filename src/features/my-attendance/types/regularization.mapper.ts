import type { RegularizationOptionsDto, RegularizationRequestDto } from './regularization.dto';
import type { RegularizationKind, RegularizationOptions, RegularizationRequest, RegularizationStatus } from './regularization.model';

const KINDS: readonly string[] = ['missed_checkout', 'missed_checkin', 'missed_both', 'wrong_time', 'remove_late_mark', 'remove_late_penalty', 'remove_early_mark', 'remove_early_penalty'];
const STATUSES: readonly string[] = ['pending', 'approved', 'rejected', 'cancelled'];

// A kind this app does not know is left out rather than offered: it cannot be sent back correctly.
const kindsOf = (list: string[]) => list.filter((k): k is RegularizationKind => KINDS.includes(k));

export function toRequest(dto: RegularizationRequestDto): RegularizationRequest {
  return {
    id: dto.id,
    date: dto.date,
    status: (STATUSES.includes(dto.status) ? dto.status : 'pending') as RegularizationStatus,
    kinds: kindsOf(dto.kinds || []),
    inTime: dto.in_time,
    outTime: dto.out_time,
    recordedInTime: dto.recorded_in_time,
    recordedOutTime: dto.recorded_out_time,
    reason: dto.reason,
    reviewNote: dto.review_note,
    hasAttachment: dto.has_attachment,
    submittedAt: dto.submitted_at,
  };
}

export function toOptions(dto: RegularizationOptionsDto): RegularizationOptions {
  const p = dto.policy;
  return {
    date: dto.date,
    timezone: dto.timezone,
    policy: { allowed: p.allowed, backDays: p.back_days, cutoffTime: p.cutoff_time, perMonth: p.per_month, used: p.used, remaining: p.remaining, needsApproval: p.needs_approval },
    deadlineAt: dto.deadline_at,
    eligible: dto.eligible,
    blockedReason: dto.blocked_reason,
    day: {
      dayType: dto.day.day_type,
      holiday: dto.day.holiday,
      recordedIn: dto.day.recorded_in_time,
      recordedOut: dto.day.recorded_out_time,
      shiftStart: dto.day.shift_start_time,
      shiftEnd: dto.day.shift_end_time,
    },
    kinds: kindsOf(dto.kinds || []),
    request: dto.request ? toRequest(dto.request) : null,
  };
}
