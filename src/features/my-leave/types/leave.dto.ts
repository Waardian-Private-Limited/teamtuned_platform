/** Wire shapes of the signed-in employee's leave (`/leave/me/...`). */

export interface ExpiringLotDto { quantity: number; on: string }

export interface BalanceSourceDto { kind: 'leave_request' | 'absence_adjusted' | 'expired' | 'encashed' | 'other'; ref: number | null; date: string; quantity: number }

export interface BalanceDto {
  cycle: { id: number; start: string; end: string } | null;
  opening: number; credited: number; carried_in: number; carried_out: number; used: number; pending: number;
  encashed: number; lapsed: number; adjusted: number; available: number; locked: number;
  expiring: ExpiringLotDto | null;
  expiring_lots: ExpiringLotDto[];
  credit_view?: { scope: 'earned' | 'month' | 'quarter' | 'half_year' | 'year'; period: { start: string; end: string }; credited: number; brought_forward: number | null };
  used_breakdown?: BalanceSourceDto[];
  pending_breakdown?: BalanceSourceDto[];
  /** Null: absences are not adjusted against this type. */
  absence_adjust?: { pending_quantity: number; items: { date: string; quantity: number; status: string }[] } | null;
}

/** One leave type's rules as the employee reads them; a null limit is switched off. */
export interface PolicyDto {
  credit: {
    mode: string; days_per_year: number | null; days_per_month: number | null; worked_days_per_credit: number | null;
    credit_per_block: number | null; days_per_event: number | null; max_balance: number | null; advance_use: number | null;
  };
  request: {
    smallest_unit: 'full_day' | 'half_day' | 'hour'; min_days: number | null; max_days: number | null; notice_days: number | null;
    longer_notice: { longer_than_days: number; notice_days: number }[];
    past_days: number | null; future_days: number | null;
    attachment: 'never' | 'always' | 'longer_than'; attachment_after_days: number | null;
    needs_approval: boolean; auto_approve_up_to: number | null;
    block: { rule: string; days: number | null } | null;
  };
  limits: {
    requests_per_month: number | null; requests_per_quarter: number | null; requests_per_year: number | null; requests_lifetime: number | null;
    days_per_month: number | null; days_lifetime: number | null; gap_days: number | null;
  };
  counting: {
    week_offs_inside: boolean; holidays_inside: boolean; sandwich_week_off: boolean; sandwich_holiday: boolean;
    next_to_holiday_blocked: boolean; clubbing: string;
  };
  when_exhausted: { strategy: string; max_negative_days: number | null };
  year_end: { carry_forward: string | null; carry_max_days: number | null; carry_expiry_months: number | null; encash_max_days: number | null };
  eligibility: { waiting_days: number | null; during_probation: string; during_notice_period: string; notice_period_max_days: number | null };
}

export interface LeaveTypeDto {
  leave_type_id: number; code: string; name: string; color: string | null; is_paid: boolean; mode: string;
  balance: BalanceDto | null; locked: boolean; policy: PolicyDto;
}

export interface EarnedDto {
  id: number; date: string; reason: string; kind: 'comp_off' | 'paid'; units: number; minutes: number | null;
  state: string; expires_on: string | null; can_choose: boolean;
}

export interface OverviewDto {
  today: string;
  policy_version_id: number | null;
  types: LeaveTypeDto[];
  requests: { pending: number; approved: number };
  earned: EarnedDto[];
}

export interface ApplicationDto {
  id: number;
  leave_type: { id: number; name: string; code: string | null; color: string | null; is_paid: boolean | null };
  start_date: string; end_date: string; start_session: string; end_session: string; unit: string; hours: number | null;
  charged_days: number; lop_days: number; status: string; reason: string | null; rejection_reason: string | null; attachment_url: string | null;
  approved_at: string | null; cancel_reason: string | null; cancelled_at: string | null; created_at: string; added_by: number | null;
}

export interface RequestsPageDto {
  requests: ApplicationDto[];
  counts: Record<string, number> | null;
  page: number; pageSize: number; total: number; pages: number;
}

export interface RequestDetailDto extends ApplicationDto {
  days: { date: string; slot: number; kind: string; charged: number; leave_type_id: number | null; is_lop: boolean; state: string }[];
  balance_impact: { leave_type_id: number; name: string; held: number; used: number }[];
  approval_id: number | null;
}

export interface ViolationDto { field: string; code: string; key?: string; params?: Record<string, number>; message: string }

export interface QuoteDto {
  ok: boolean;
  violations: ViolationDto[];
  charged_days: number; working_days: number; lop_days: number;
  skipped: { date: string; slot: number; kind: string }[];
  allocations: { leave_type_id: number; quantity: number; is_lop: boolean; negative: boolean }[];
  balance: { before: number; after: number } | null;
  has_balance: boolean;
}

export interface TimelineDto {
  id: number; status: string;
  entries: { kind: string; at: string; actor: string | null; step: string | null; note: string | null; override: boolean }[];
  waiting: { step: string | null; approvers: string[]; open_to_role: boolean; since: string | null } | null;
  step_count: number; current_step: number | null;
}

/** What a request asks for; the same body is checked by preview and sent by apply. */
export interface LeaveInputDto {
  leave_type_id: number; start_date: string; end_date: string; start_session: string; end_session: string;
  unit: 'day' | 'hour'; hours: number | null; has_attachment: boolean;
}
