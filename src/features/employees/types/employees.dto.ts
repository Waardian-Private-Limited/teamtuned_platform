export type EmployeeStatus = 'Active' | 'Inactive' | 'Invited' | 'Terminated';
export type Gender = 'Male' | 'Female' | 'Other';
export type WeekDay = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
export type PaymentMode = 'bank' | 'cash' | 'cheque';
export type TimingMode = 'fixed_time' | 'flexible' | 'roster';
export type ShiftSource = 'policy' | 'template' | 'custom';
export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DayOffConfig {
  offType: string;
  halfDaySession?: string;
  pattern?: string;
  specificWeek1?: boolean;
  specificWeek2?: boolean;
  specificWeek3?: boolean;
  specificWeek4?: boolean;
  specificWeek5?: boolean;
}

export type WeekOffConfig = { weeklyOffMode: string; flexibleDaysPerMonth: number } & Record<DayKey, DayOffConfig>;

export interface SchemaField {
  type: string;
  values?: string[];
  default?: unknown;
  label?: string;
  help?: string;
  min?: number;
  max?: number;
}

export interface EmployeeListItemDto {
  id: number;
  employee_code: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  department_name: string | null;
  role_name: string | null;
  primary_site_name: string | null;
  work_type: string | null;
  joining_date: string | null;
  sub_organization_id: number | null;
  status: EmployeeStatus;
}

export interface EmployeeListResponseDto {
  employees: EmployeeListItemDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  counts: Record<'all' | EmployeeStatus, number>;
}

export interface PolicyWeekOffDto {
  day: WeekDay;
  offType: 'full_off' | 'half_off';
  pattern: string;
}

export interface PolicyScheduleDto {
  timingMode: TimingMode;
  shiftStart: string | null;
  shiftEnd: string | null;
  flexibleHours: number | null;
  breakMinutes: number | null;
  weeklyOffMode: 'fixed_days' | 'flexible' | 'roster';
  flexibleDaysPerMonth: number | null;
  rosterOffDaysPerWeek: number | null;
  weekOffs: PolicyWeekOffDto[];
  weekOffConfig: Record<DayKey, DayOffConfig>;
}

export interface PolicyOptionDto {
  id: number;
  name: string;
  code: string | null;
  is_default: 0 | 1;
  sub_organization_id: number | null;
  schedule: PolicyScheduleDto;
}

export interface ShiftTemplateOptionDto {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  is_night: 0 | 1;
}

export interface SalaryComponentOptionDto {
  id: number;
  name: string;
  calculation_type: 'flat' | 'percentage' | 'balance';
  is_basic: 0 | 1;
  percentage_value: number | null;
  percentage_basis: 'basic' | 'gross' | 'component';
  basis_component_id: number | null;
  is_system: 0 | 1;
}

export interface DebitRuleOptionDto {
  id: number;
  name: string;
  category: string;
  is_statutory: 0 | 1;
  frequency: string;
  debit_type: string | null;
  fixed_amount: number | null;
  percentage_value: number | null;
  reference_amount: string | null;
  breakdown_item_id: number | null;
  max_cap: number | null;
  config: Record<string, unknown>;
}

export interface TaxThresholdDto {
  financial_year: string;
  regime: string;
  tax_free_up_to: number | null;
}

export interface EmploymentTypeOptionDto {
  id: number;
  name: string;
  code: string;
  default_probation_months: number | null;
  default_notice_days: number | null;
}

export interface FormOptionsDto {
  sub_organization_id: number | null;
  next_employee_code: string | null;
  code_editable: boolean;
  employment_types: EmploymentTypeOptionDto[];
  departments: { id: number; name: string }[];
  roles: { id: number; name: string; department_id: number | null }[];
  sites: { id: number; name: string; code: string | null; city: string | null; state: string | null; is_head_office: 0 | 1 }[];
  shift_templates: ShiftTemplateOptionDto[];
  policies: PolicyOptionDto[];
  salary_components: SalaryComponentOptionDto[];
  debit_rules: DebitRuleOptionDto[];
  tax: TaxThresholdDto | null;
  location_access: { value: string; label: string; description: string }[];
  week_off_schema: Record<string, Record<string, SchemaField> | SchemaField>;
}

export interface EmployeeDetailDto {
  id: number;
  employee_code: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string | null;
  phone: string | null;
  gender: Gender | null;
  date_of_birth: string | null;
  sub_organization_id: number | null;
  department_id: number | null;
  role_id: number | null;
  designation: string | null;
  reporting_manager: { id: number; name: string | null; employee_code: string | null } | null;
  work_type: string | null;
  employment_type_id: number | null;
  employment_start_date: string | null;
  probation_months: number | null;
  notice_period_days: number | null;
  site_ids: number[];
  primary_site_id: number | null;
  policy_id: number | null;
  policy_overridden: 0 | 1;
  shift_template_id: number | null;
  shift_source: ShiftSource;
  shift_start: string | null;
  shift_end: string | null;
  shift_break_minutes: number | null;
  week_off_config: WeekOffConfig | null;
  location_access: string;
  ctc: number | null;
  monthly_gross: number | null;
  salary_breakdown: { component_id: number; name: string; amount: number }[];
  debit_ids: number[];
  payment_mode: PaymentMode;
  esic_ip_number: string | null;
  bank_account_no: string | null;
  ifsc_code: string | null;
  bank_name: string | null;
  branch_name: string | null;
  pan_number: string | null;
  aadhaar_number: string | null;
  pf_uan: string | null;
  status: EmployeeStatus | 'Deleted';
}

export interface ManagerDto {
  id: number;
  name: string;
  employee_code: string | null;
  designation: string | null;
}

export interface IfscDto {
  ifsc: string;
  bank: string | null;
  branch: string | null;
  city: string | null;
  state: string | null;
}

export interface PolicyPreviewDto {
  policy_id: number | null;
  source: string | null;
}

export interface HistoryChangeDto {
  field: string;
  label: string;
  from: string | number | null;
  to: string | number | null;
}

export interface JobEventDto {
  id: number;
  event_type: string;
  effective_date: string;
  changes: HistoryChangeDto[];
  source: string;
  source_id: number | null;
  reason: string | null;
  by: string | null;
  at: string;
}

export interface AuditEntryDto {
  id: number;
  action: string;
  changes: HistoryChangeDto[];
  by: string | null;
  ip: string | null;
  at: string;
}

export interface HistoryPageDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}
