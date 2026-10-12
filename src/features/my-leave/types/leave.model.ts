import type { PolicyDto } from './leave.dto';

export type Session = 'full' | 'first_half' | 'second_half';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
export type Policy = PolicyDto;

export interface ExpiringLot { quantity: number; on: string }

export type SourceKind = 'leave_request' | 'absence_adjusted' | 'expired' | 'encashed' | 'other';
export interface BalanceSource { kind: SourceKind; ref: number | null; date: string; quantity: number }

export interface Balance {
  cycle: { start: string; end: string } | null;
  available: number; used: number; pending: number; credited: number; carriedIn: number; lapsed: number; adjusted: number; encashed: number;
  expiringLots: ExpiringLot[];
  /** What "credited" means for this type and the days it brings over, when its rule lets days carry. */
  creditScope: 'earned' | 'month' | 'quarter' | 'half_year' | 'year';
  creditedInScope: number;
  broughtForward: number | null;
  usedSources: BalanceSource[];
  pendingSources: BalanceSource[];
  /** Days payroll will still take for this month's absences; null when absences are not adjusted against this type. */
  absenceAdjust: { quantity: number; items: { date: string; quantity: number }[] } | null;
}

/** A leave type in the employee's policy: its balance (when it keeps one) and its rules. */
export interface LeaveType {
  id: number; code: string; name: string; color: string | null; isPaid: boolean; mode: string;
  balance: Balance | null; locked: boolean; policy: Policy;
}

/** Comp-off or paid time earned by working extra (overtime, a holiday, a week off). */
export interface Earned {
  id: number; date: string; reason: string; kind: 'comp_off' | 'paid'; units: number; minutes: number | null;
  state: string; expiresOn: string | null; canChoose: boolean;
}

export interface Overview {
  today: string;
  types: LeaveType[];
  pending: number;
  earned: Earned[];
}

export interface LeaveRequest {
  id: number;
  type: { id: number; name: string; color: string | null };
  startDate: string; endDate: string; startSession: Session; endSession: Session; unit: 'day' | 'hour'; hours: number | null;
  days: number; lopDays: number; status: LeaveStatus;
  reason: string | null; rejectionReason: string | null; cancelReason: string | null; attachmentUrl: string | null;
  createdAt: string; addedByHr: boolean;
}

export interface LeaveRequestDetail extends LeaveRequest {
  dayList: { date: string; slot: number; kind: string; charged: number; isLop: boolean }[];
  impact: { name: string; held: number; used: number }[];
  approvalId: number | null;
}

export interface RequestFilters {
  status: LeaveStatus | null;
  typeId: number | null;
  from: string;
  to: string;
}

export interface RequestsPage {
  rows: LeaveRequest[];
  counts: Partial<Record<LeaveStatus, number>>;
  total: number;
  pages: number;
}

export interface Violation { field: string; key: string; params: Record<string, number>; message: string }

export interface Quote {
  ok: boolean;
  violations: Violation[];
  days: number;
  lopDays: number;
  balance: { before: number; after: number } | null;
  hasBalance: boolean;
  allocations: { typeId: number; quantity: number; isLop: boolean }[];
  skipped: { date: string; kind: string }[];
}

export interface Timeline {
  entries: { kind: string; at: string; actor: string | null; step: string | null; note: string | null }[];
  waiting: { step: string | null; approvers: string[]; openToRole: boolean; since: string | null } | null;
}
