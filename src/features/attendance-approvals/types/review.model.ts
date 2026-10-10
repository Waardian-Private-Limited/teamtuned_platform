import type { RegularizationKind } from '@/features/my-attendance/types/regularization.model';

/** Assigned: what the approval flows put on me. All: everything in my reach, to follow. */
export type ReviewScope = 'assigned' | 'all';
export type ReviewStatusFilter = 'waiting' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all';
/** The kinds of attendance request a reviewer works through, each its own tab. */
export type RequestType = 'regularize' | 'verification';
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

/** One request in the reviewer's list: a regularization (kinds and times) or an attendance review (punches). */
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
