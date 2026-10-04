export type Session = 'full' | 'first_half' | 'second_half';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Expired';

export interface LeaveRequest {
  id: number;
  employee: { id: number; name: string; code: string | null; department_id: number | null };
  leave_type: { id: number; name: string; code: string | null; color: string | null; is_paid: boolean | null };
  sub_organization_id: number | null;
  start_date: string;
  end_date: string;
  start_session: Session;
  end_session: Session;
  unit: 'day' | 'hour';
  hours: number | null;
  charged_days: number;
  lop_days: number;
  status: LeaveStatus;
  reason: string | null;
  rejection_reason: string | null;
  cancel_reason: string | null;
  created_at: string;
}

export interface LeaveRequestDetail extends LeaveRequest {
  days: { date: string; slot: number; kind: string; charged: number; leave_type_id: number | null; is_lop: boolean; state: string }[];
  balance_impact: { leave_type_id: number; name?: string; held: number; used: number }[];
  timeline: { level_name?: string; level_number?: number; action: string; approver_name?: string; remarks?: string | null; action_taken_at?: string | null }[];
}

export interface RequestsResponse {
  requests: LeaveRequest[];
  stats: { pending: number; on_leave_today: number; approved_this_month: number; rejected: number } | null;
  page: number; pageSize: number; total: number; pages: number;
}

export interface Violation { field: string; code: string; message: string }

export interface Quote {
  ok: boolean;
  violations: Violation[];
  charged_days: number;
  working_days: number;
  lop_days: number;
  slots: { date: string; slot: number; kind: string; charged: number; leave_type_id: number | null; is_lop: boolean }[];
  skipped: { date: string; slot: number; kind: string }[];
  allocations: { leave_type_id: number | null; quantity: number; is_lop: boolean; negative: boolean }[];
  balance: { before: number; after: number } | null;
  has_balance: boolean;
}

export interface Balance {
  leave_type_id: number;
  code: string;
  name: string;
  color: string | null;
  is_paid: boolean | null;
  cycle: { id: number; start: string; end: string } | null;
  mode?: string | null;
  days_per_event?: number | null;
  opening?: number; credited?: number; carried_in?: number; carried_out?: number; used?: number; pending?: number;
  encashed?: number; lapsed?: number; adjusted?: number;
  available: number | null;
  locked?: number;
  expiring?: { quantity: number; on: string } | null;
}

export interface BalanceCard { employee: { id: number; name: string }; policy_version_id: number | null; balances: Balance[] }

export interface LedgerEntry {
  id: number; leave_type_id: number; leave_type_name: string; entry_type: string; quantity: number;
  source_type: string; effective_date: string; expires_on: string | null; note: string | null; created_at: string;
}

export interface BalanceGrid {
  types: { id: number; code: string; name: string; color: string | null }[];
  rows: { employee: { id: number; name: string; code: string | null; department_id: number | null; sub_organization_id: number | null };
    balances: Record<string, { available: number; used: number; pending: number; locked: number; credited: number }> }[];
  page: number; pageSize: number; total: number; pages: number;
}

export interface CalendarResponse {
  leaves: { employee_id: number; employee_name: string; date: string; slot: number; is_lop: boolean; application_id: number; status: string;
    leave_type_name: string | null; short_code: string | null; color: string | null }[];
  holidays: { id: number; date: string; name: string; session: Session; is_optional: boolean }[];
}

export interface ApplyInput {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  start_session: Session;
  end_session: Session;
  unit: 'day' | 'hour';
  hours?: number | null;
  reason?: string;
  employee_id?: number;
}
