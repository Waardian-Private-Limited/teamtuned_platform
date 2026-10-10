import type { RegularizationKind } from '@/features/my-attendance/types/regularization.model';

export type ReviewStatusFilter = 'waiting' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all';
export type SortKey = 'submitted_desc' | 'submitted_asc' | 'date_desc' | 'date_asc' | 'name_asc';
export type RowStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** One regularization request in the reviewer's list. */
export interface RequestRow {
  id: number;
  /** The approval request behind it; opening and deciding go through it. */
  approvalId: number;
  employee: { id: number; name: string; code: string | null; department: string | null; role: string | null };
  date: string;
  status: RowStatus;
  waitingForMe: boolean;
  kinds: RegularizationKind[];
  inTime: string | null;
  outTime: string | null;
  recordedInTime: string | null;
  recordedOutTime: string | null;
  reason: string | null;
  hasAttachment: boolean;
  submittedAt: string | null;
}

export interface RowPage {
  rows: RequestRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReviewFilters {
  status: ReviewStatusFilter;
  siteId: number | null;
  departmentId: number | null;
  roleId: number | null;
  from: string;
  to: string;
  search: string;
  sort: SortKey;
}
