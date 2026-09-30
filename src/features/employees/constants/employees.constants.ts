import type { EmployeeStatus, Gender, PaymentMode } from '../types/employees.dto';

export const EMPLOYEE_PERMISSIONS = {
  VIEW: 'EMP_VIEW',
  ADD: 'EMP_ADD',
  EDIT: 'EMP_EDIT',
  DELETE: 'EMP_DELETE',
} as const;

export const SEARCH_DEBOUNCE_MS = 400;
export const DEFAULT_PAGE_SIZE = 10;

export type StatusFilter = 'all' | EmployeeStatus;

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Active', label: 'Active' },
  { value: 'Invited', label: 'Invited' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Terminated', label: 'Terminated' },
];

export const GENDERS: Gender[] = ['Male', 'Female', 'Other'];
export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
];

export const FORM_STEPS = [
  { key: 'basic', label: 'Basic', description: 'Name and contact' },
  { key: 'job', label: 'Job', description: 'Role, team and sites' },
  { key: 'schedule', label: 'Attendance', description: 'Policy, shift, week off' },
  { key: 'salary', label: 'Salary', description: 'CTC and deductions' },
  { key: 'bank', label: 'Bank & IDs', description: 'Account, PAN, Aadhaar' },
] as const;

export type FormStepKey = (typeof FORM_STEPS)[number]['key'];

export const FIELD_STEP: Record<string, FormStepKey> = {
  employee_code: 'basic',
  first_name: 'basic',
  middle_name: 'basic',
  last_name: 'basic',
  email: 'basic',
  phone: 'basic',
  gender: 'basic',
  date_of_birth: 'basic',
  sub_organization_id: 'job',
  department_id: 'job',
  role_id: 'job',
  designation: 'job',
  reporting_manager_id: 'job',
  employment_type_id: 'job',
  employment_start_date: 'job',
  probation_months: 'job',
  notice_period_days: 'job',
  site_ids: 'job',
  primary_site_id: 'job',
  policy_id: 'schedule',
  shift_template_id: 'schedule',
  week_off_config: 'schedule',
  shift_source: 'schedule',
  shift_start: 'schedule',
  shift_end: 'schedule',
  shift_break_minutes: 'schedule',
  location_access: 'job',
  ctc: 'salary',
  monthly_gross: 'salary',
  salary_breakdown: 'salary',
  debit_ids: 'salary',
  payment_mode: 'salary',
  esic_ip_number: 'bank',
  bank_account_no: 'bank',
  ifsc_code: 'bank',
  bank_name: 'bank',
  branch_name: 'bank',
  pan_number: 'bank',
  aadhaar_number: 'bank',
  pf_uan: 'bank',
};

export const STATUS_TONE: Record<EmployeeStatus, 'active' | 'inactive' | 'terminated' | 'neutral'> = {
  Active: 'active',
  Inactive: 'inactive',
  Invited: 'neutral',
  Terminated: 'terminated',
};

export const JOB_EVENT_LABELS: Record<string, string> = {
  joining: 'Joined',
  promotion: 'Promotion',
  demotion: 'Demotion',
  transfer: 'Transfer',
  role_change: 'Role change',
  manager_change: 'Manager change',
  employment_type_change: 'Employment type change',
  site_change: 'Site change',
  status_change: 'Status change',
  job_update: 'Job update',
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  status: 'Status changed',
  delete: 'Deleted',
  salary_revision: 'Salary revision applied',
};

export type TimelineTab = 'job' | 'salary' | 'audit';
