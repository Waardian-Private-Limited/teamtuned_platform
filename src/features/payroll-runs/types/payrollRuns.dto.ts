export type RunStatusDto = 'draft' | 'finalized' | 'paid' | 'not_started';
export type RunStageDto =
  | 'not_started'
  | 'not_calculated'
  | 'calculating'
  | 'failed'
  | 'review'
  | 'awaiting_finalize_approval'
  | 'finalized'
  | 'released'
  | 'paid';
export type ComputeStateDto = 'idle' | 'queued' | 'running' | 'failed';
export type ItemStatusDto = 'ok' | 'warning' | 'error' | 'held';
export type PayslipStateDto = 'draft' | 'not_generated' | 'visible' | 'held';

export interface RunTotalsDto {
  employees?: number | null;
  held?: number | null;
  warnings?: number | null;
  errors?: number | null;
  gross?: number | null;
  deductions?: number | null;
  employer?: number | null;
  net?: number | null;
}

export interface RunDto {
  id: number | null;
  sub_organization_id: number | null;
  company_name: string | null;
  frequency: string;
  period_start: string;
  period_end: string;
  period_label: string;
  month: string;
  pay_date?: string | null;
  release_mode?: 'after_pay_day' | 'manual' | null;
  release_on?: string | null;
  status: RunStatusDto;
  stage: RunStageDto;
  pending_action?: 'finalize' | 'reopen' | null;
  pending_note?: string | null;
  compute?: { state: ComputeStateDto; error: string | null; done: number; total: number } | null;
  computed_at?: string | null;
  totals: RunTotalsDto;
  company?: Record<string, unknown> | null;
  finalized_at?: string | null;
  released_at?: string | null;
  paid_at?: string | null;
  paid_on?: string | null;
  paid_reference?: string | null;
  reopen_count?: number | null;
  source?: 'engine' | 'legacy_import' | null;
  status_counts?: Partial<Record<ItemStatusDto, number>>;
  payslip_counts?: { generated: number; not_generated: number; held: number } | null;
  finalize_needs_approval?: boolean;
}

export interface RunListResponseDto {
  month: string;
  runs: RunDto[];
}

export interface WarningDto {
  code: string;
  level: 'error' | 'warning' | 'info';
  message: string;
}

export interface LopBreakdownDto {
  absent?: number | null;
  half_day?: number | null;
  other?: number | null;
  unpaid_leave?: number | null;
  sandwich?: number | null;
  late_deduction?: number | null;
}

export interface LateDeductionDto {
  days: number;
  minutes: number;
  chargeable_minutes: number;
  free_minutes: number;
  amount: number;
}

export interface ItemDto {
  id: number;
  run_id: number;
  employee: { id: number; code: string | null; name: string };
  site: string | null;
  department: string | null;
  sub_organization_id: number | null;
  is_primary_company: boolean;
  status: ItemStatusDto;
  hold_reason: string | null;
  cycle_days: number | null;
  payable_days: number | null;
  lop_days: number | null;
  lop_breakdown?: LopBreakdownDto | null;
  late_deduction?: LateDeductionDto | null;
  leave_days: number | null;
  monthly_gross: number | null;
  earnings: number | null;
  deductions: number | null;
  employer: number | null;
  net_pay: number | null;
  warnings: WarningDto[];
  payslip_number: string | null;
  payslip_state?: PayslipStateDto | null;
  published_at?: string | null;
  computed_at: string | null;
}

export interface ItemListResponseDto {
  page: number;
  page_size: number;
  total: number;
  items: ItemDto[];
}

export interface LineDto {
  key: string;
  kind: 'earning' | 'deduction' | 'employer';
  label: string;
  amount: number;
  full_amount?: number;
  taxable?: boolean;
  is_basic?: boolean;
  category?: string | null;
  employer_share?: number;
  source?: { type: 'component' | 'grant' | 'payout' | 'rule' | 'advance' | 'rounding' | 'legacy'; id: number | null } | null;
  steps?: Array<{ step: string; value: number | string | null }>;
}

export interface CellDto {
  date: string;
  key: string | null;
  label: string | null;
  tone: string | null;
  payable_units: number | null;
  leave: string | { code: string | null; name: string | null; units: number | null; is_paid: boolean | null } | null;
  late_minutes: number | null;
  overtime_minutes: number | null;
}

export interface LeaveTypeDaysDto {
  code: string | null;
  name: string | null;
  is_paid: boolean;
  days: number;
  covered_absence_days?: number;
}

export interface AttendanceDto {
  leave_by_type?: LeaveTypeDaysDto[] | null;
  leave_sandwich?: { days: number; by_type: LeaveTypeDaysDto[] } | null;
  cycle_days?: number | null;
  raw_calendar_days?: number | null;
  employed_days?: number | null;
  basis?: string | null;
  payable_days?: number | null;
  lop_days?: number | null;
  lop?: LopBreakdownDto | null;
  present?: number | null;
  half_days?: number | null;
  absent?: number | null;
  leave_days?: number | null;
  paid_leave_days?: number | null;
  unpaid_leave_days?: number | null;
  holidays?: number | null;
  week_offs?: number | null;
  late?: { marks?: number; minutes?: number; hours?: number } | null;
  overtime?: { minutes?: number; hours?: number } | null;
  night_ot?: { minutes?: number; hours?: number } | null;
  joined_mid_cycle?: boolean | null;
  not_joined?: boolean | null;
  late_deduction?: { enabled?: boolean; days?: number; minutes?: number; chargeable_minutes?: number; free_minutes?: number } | null;
  cells?: CellDto[];
}

export interface InputsDto {
  period?: { start: string; end: string };
  segments?: Array<{ revision_id: number | null; from: string; to: string; gross: number; weight: number }>;
  ctc?: number | null;
  payable_ratio?: number | null;
  payouts?: number[];
  grants?: number[];
  rules?: number[];
  paying_companies?: Array<number | null>;
}

export interface ItemDetailDto extends ItemDto {
  revision_id: number | null;
  earnings_lines: LineDto[];
  deduction_lines: LineDto[];
  employer_lines: LineDto[];
  attendance: AttendanceDto | null;
  inputs: InputsDto;
  has_legacy_payslip: boolean;
}

export interface OtherCompanyDto {
  run_id: number;
  company_name: string | null;
  status: RunStatusDto;
  net_pay: number | null;
  is_primary_company: boolean;
}

export interface ItemDetailResponseDto {
  run: RunDto;
  item: ItemDetailDto;
  other_companies: OtherCompanyDto[];
}

/** Company named on payslips and letters: the employee's own (or paying) sub-organization, the main organization, or the primary sub-organization. */
export type DocumentNameDto = 'assigned' | 'organization' | 'primary';

export interface PayrollSettingsDto {
  finalizeApproval: boolean;
  /** Organization-wide: false runs one payroll for the whole organization instead of one per sub-organization. */
  payrollBySubOrg: boolean;
  documentName: DocumentNameDto;
}

export interface PayrollSettingsPatchDto {
  finalize_approval?: boolean;
  payroll_by_sub_org?: boolean;
  document_name?: DocumentNameDto;
}
