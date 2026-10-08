export type BadgeTone = 'good' | 'warn' | 'bad' | 'info' | 'muted';

export interface BadgeDto {
  key: string;
  label: string;
  tone: BadgeTone;
  note: string | null;
  overridden: boolean;
}

export interface ListEmployeeDto {
  employee_id: number;
  employee_code: string | null;
  name: string;
  department: string | null;
  role: string | null;
  day: {
    badge: BadgeDto;
    in_at: string | null;
    out_at: string | null;
    worked_minutes: number;
    site: string | null;
    off_site: boolean;
    locked: boolean;
  };
  night_ot_yesterday_minutes: number;
  month: { payable_days: number; present: number; half_days: number; absent: number; leave_days: number; late_marks: number };
}

export interface ListResponseDto {
  date: string;
  today: string;
  timezone: string;
  total: number;
  employees: ListEmployeeDto[];
}

export interface EmployeeHeaderDto {
  id: number;
  code: string | null;
  name: string;
  department: string | null;
  role: string | null;
  status: string;
  joining_date: string | null;
  exit_date: string | null;
}

export interface MonthCellDto {
  date: string;
  weekday: number;
  badge: BadgeDto;
  in_at: string | null;
  out_at: string | null;
  worked_minutes: number;
  payable_units: number;
  late_minutes: number;
  overtime_minutes: number;
  leave: { code: string; name: string; units: number; is_paid: boolean } | null;
  locked: boolean;
}

export interface MonthSummaryDto {
  calendar_days: number;
  payable_days: number;
  payable_days_before_late_deduction: number;
  lop_days: number;
  lop: { absent: number; half_day: number; other: number; unpaid_leave: number; sandwich: number; late_deduction: number };
  present: number;
  half_days: number;
  absent: number;
  leave_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  holidays: number;
  week_offs: number;
  late: { marks: number; minutes: number; hours: number };
  early: { marks: number; exit_minutes: number };
  overtime: { minutes: number; hours: number };
  night_ot: { minutes: number; hours: number };
  worked: { minutes: number; hours: number };
  late_deduction: { enabled: boolean; minutes: number; chargeable_minutes: number; free_minutes: number; days: number };
  consecutive_absence: { days: number; action: string } | null;
}

export interface BalanceDto {
  code: string;
  name: string;
  kind: 'leave' | 'comp_off';
  color: string | null;
  is_paid: boolean | null;
  available: number;
  used: number;
  pending: number;
  credited: number;
  cycle: { start: string; end: string } | null;
  period: 'monthly' | 'cycle';
  earned: { units: number; pending_units: number; paid_minutes: number } | null;
}

export interface MonthResponseDto {
  employee: EmployeeHeaderDto;
  month: string;
  timezone: string;
  from: string;
  to: string;
  today: string;
  policy: { resolved: boolean; late_deduction: boolean; sandwich: boolean };
  cells: MonthCellDto[];
  summary: MonthSummaryDto;
  balances: BalanceDto[];
}

export interface DayRecordDto {
  status: string;
  payable_units: number;
  day_type: string;
  shift_start_at: string | null;
  shift_end_at: string | null;
  first_in_at: string | null;
  last_out_at: string | null;
  open_session: boolean;
  expected_minutes: number;
  worked_minutes: number;
  break_minutes: number;
  late_minutes: number;
  late_beyond_grace_minutes: number;
  late_excused_minutes: number;
  early_minutes: number;
  early_exit_minutes: number;
  overtime_minutes: number;
  night_ot_minutes: number;
  late_mark: boolean;
  early_mark: boolean;
  late_penalty: 'half_day' | 'full_day' | null;
  early_penalty: 'half_day' | 'full_day' | null;
  late_mark_number: number;
  early_mark_number: number;
  flags: string[];
  review_state: string;
  overridden: boolean;
  locked: boolean;
}

export interface ShiftDto {
  start: string;
  end: string;
  ends_next_day: boolean;
  break_minutes: number;
  expected_minutes: number;
}

export interface DayDetailDto {
  employee: EmployeeHeaderDto;
  date: string;
  today: string;
  timezone: string;
  badge: BadgeDto;
  day: DayRecordDto | null;
  schedule: { kind: 'absent' | 'week_off' | 'holiday' | 'leave' | 'unscheduled' | 'working'; roster: boolean; flexible: boolean; shift: ShiftDto | null } | null;
  form: { in_time: string | null; out_time: string | null; from: 'recorded' | 'shift' | 'empty'; forced_status: string | null };
  holiday: { name: string; half: boolean } | null;
  leave: { code: string; name: string; units: number; is_paid: boolean } | null;
  night_ot_yesterday_minutes: number;
  override: { status: string | null; units: number | null; reason: string | null; by: string | null; at: string | null; in_time: string | null; out_time: string | null } | null;
  punches: Array<{
    id: number;
    direction: 'in' | 'out';
    kind: 'work' | 'night_ot';
    at: string;
    source: string;
    place: string | null;
    location: string;
    distance_m: number | null;
    lat: number | null;
    lng: number | null;
    accuracy_m: number | null;
    face: string;
    has_image: boolean;
    flags: string[];
    review_state: string;
    voided: boolean;
    void_reason: string | null;
  }>;
  breaks: Array<{ id: number; started_at: string; ended_at: string | null; source: string }>;
  comp_off: Array<{ reason: string; kind: 'comp_off' | 'paid'; units: number; minutes: number | null; state: string; expires_on: string | null }>;
  history: Array<{ id: number; at: string; kind: string; summary: string | null; reason: string | null; by: string | null }>;
  can_override: boolean;
  locked: boolean;
}

interface Pair<T> {
  from: T;
  to: T;
  changed: boolean;
}

export interface ImpactDto {
  status: Pair<string | null>;
  payable_units: Pair<number>;
  worked_minutes: Pair<number>;
  late: { mark: Pair<boolean>; minutes: Pair<number>; penalty: Pair<string | null> };
  early: { mark: Pair<boolean>; minutes: Pair<number>; penalty: Pair<string | null> };
  overtime_minutes: Pair<number>;
  night_ot_minutes: Pair<number>;
  flags_added: string[];
  flags_removed: string[];
  compoff: Array<{ key: string; reason: string; kind: 'comp_off' | 'paid'; action: 'new' | 'more' | 'less' | 'removed'; units_from: number; units_to: number; minutes: number | null; needs_approval: boolean }>;
  leave: { balance_returned: boolean; fraction: number | null };
  other_days: Array<{ date: string; status: Pair<string | null>; payable_units: Pair<number> }>;
  changed: boolean;
}

export interface OverridePreviewDto {
  before: DayRecordDto | null;
  after: DayRecordDto | null;
  impact: ImpactDto;
}

export type OverrideStatus = 'Present' | 'Half-Day' | 'Absent';

export interface OverrideBody {
  in_time: string;
  out_time: string;
  status?: OverrideStatus | null;
}

export type OnlyKey = 'present' | 'half_day' | 'absent' | 'leave' | 'late' | 'no_checkout' | 'overridden';

export interface ExportRequest {
  report?: 'daily' | 'monthly' | 'data';
  month?: string;
  from: string;
  to: string;
  format: 'xlsx' | 'csv' | 'pdf';
  subOrgId?: number | null;
  siteId?: number | null;
  departmentId?: number | null;
  roleId?: number | null;
  employeeIds?: number[];
  only?: OnlyKey[];
  emails?: string[];
}
