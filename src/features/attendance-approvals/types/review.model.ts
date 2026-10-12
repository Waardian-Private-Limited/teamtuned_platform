import type { RegularizationKind } from '@/features/my-attendance/types/regularization.model';

/** Assigned: what the approval flows put on me. All: everything in my reach, to follow. */
export type ReviewScope = 'assigned' | 'all';
export type ReviewStatusFilter = 'waiting' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all';
/** The kinds of request a reviewer works through here, each its own tab. */
export type RequestType = 'regularize' | 'verification' | 'leave' | 'compoff' | 'absence_cover';
export type RowStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** Where a recorded punch was made; outside means beyond the site's boundary. */
export interface Place {
  name: string | null;
  outside: boolean;
  distanceM: number | null;
}

/** A punch sent for review: when, where and what about it needs a look. */
export interface ReviewedPunch {
  direction: 'in' | 'out';
  time: string;
  place: string | null;
  outside: boolean;
  distanceM: number | null;
  /** location, face, face_unavailable. */
  issues: string[];
  reason: string | null;
  /** pending, approved or rejected. */
  reviewState: string;
}

/** What a leave request covers: the type, the dates and day parts, and the days it takes. */
export interface LeaveInfo {
  type: { id: number; name: string; color: string | null };
  endDate: string;
  startSession: string;
  endSession: string;
  unit: 'day' | 'hour';
  hours: number | null;
  days: number;
  lopDays: number;
}

/** What a comp-off request earned: the reason, the days (or pay minutes) and when unused comp-off expires. */
export interface CompOffInfo {
  reason: string;
  kind: 'comp_off' | 'paid';
  units: number;
  minutes: number | null;
  expiresOn: string | null;
}

/** An absence to be paid from a balance: the balance it comes from and the days. */
export interface AbsenceCoverInfo {
  type: { id: number; name: string; color: string | null };
  days: number;
  isCompOff: boolean;
  isPenalty: boolean;
}

/** One request in the reviewer's list: a regularization (kinds and times), an attendance review (punches) or a leave. */
export interface RequestRow {
  id: number;
  /** The approval request behind it; opening and deciding go through it. Null when it never went to approval. */
  approvalId: number | null;
  employee: { id: number; name: string; code: string | null; department: string | null; role: string | null };
  date: string;
  status: RowStatus;
  waitingForMe: boolean;
  /** For a waiting request: the step, who holds it, and since when. */
  waitingOn: { step: string | null; approvers: string[]; openToRole: boolean; since: string | null } | null;
  kinds: RegularizationKind[];
  inTime: string | null;
  outTime: string | null;
  recordedInTime: string | null;
  recordedOutTime: string | null;
  recordedInPlace: Place | null;
  recordedOutPlace: Place | null;
  reason: string | null;
  hasAttachment: boolean;
  punches: ReviewedPunch[];
  /** Set for a leave request. */
  leave: LeaveInfo | null;
  /** Set for a comp-off request. */
  compoff: CompOffInfo | null;
  /** Set for an absence cover request. */
  absenceCover: AbsenceCoverInfo | null;
  submittedAt: string | null;
}

export interface RowPage {
  rows: RequestRow[];
  total: number;
  counts: Partial<Record<RowStatus, number>>;
  access: { canTrack: boolean; allSites: boolean };
  /** What the server applied: the list it showed and its status filter. */
  scope: ReviewScope;
  status: ReviewStatusFilter;
  page: number;
  pageSize: number;
}

export interface ReviewFilters {
  /** Null: whatever the server starts this list with (waiting for me, or pending when following all). */
  status: ReviewStatusFilter | null;
  siteId: number | null;
  departmentId: number | null;
  from: string;
  to: string;
  search: string;
}
