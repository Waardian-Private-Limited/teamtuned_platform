export type RunStatus = 'draft' | 'finalized' | 'paid' | 'not_started';
export type RunStage =
  | 'not_started'
  | 'not_calculated'
  | 'calculating'
  | 'failed'
  | 'review'
  | 'awaiting_finalize_approval'
  | 'finalized'
  | 'released'
  | 'paid';
export type ComputeState = 'idle' | 'queued' | 'running' | 'failed';
export type ItemStatus = 'ok' | 'warning' | 'error' | 'held';
export type PayslipState = 'draft' | 'not_generated' | 'visible' | 'held';

export interface RunTotals {
  employees: number;
  held: number;
  warnings: number;
  errors: number;
  gross: number | null;
  deductions: number | null;
  employer: number | null;
  net: number | null;
}

export interface Run {
  key: string;
  id: number | null;
  subOrganizationId: number | null;
  companyName: string;
  frequency: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  month: string;
  payDate: string | null;
  releaseMode: 'after_pay_day' | 'manual' | null;
  releaseOn: string | null;
  status: RunStatus;
  stage: RunStage;
  pendingAction: 'finalize' | 'reopen' | null;
  pendingNote: string | null;
  compute: { state: ComputeState; error: string | null; done: number; total: number };
  computedAt: string | null;
  totals: RunTotals;
  finalizedAt: string | null;
  releasedAt: string | null;
  paidOn: string | null;
  paidReference: string | null;
  source: 'engine' | 'legacy_import' | null;
  statusCounts: Record<ItemStatus, number> | null;
  finalizeNeedsApproval: boolean | null;
}

export interface Warning {
  code: string;
  level: 'error' | 'warning' | 'info';
  message: string;
}

export interface LateDeduction {
  days: number;
  minutes: number;
  chargeableMinutes: number;
  freeMinutes: number;
  amount: number;
}

export interface PayItem {
  id: number;
  runId: number;
  employee: { id: number; code: string | null; name: string };
  site: string | null;
  siteId: number | null;
  department: string | null;
  departmentId: number | null;
  isPrimaryCompany: boolean;
  status: ItemStatus;
  holdReason: string | null;
  cycleDays: number;
  payableDays: number;
  lopDays: number;
  lopBreakdown: LopBreakdown | null;
  lateDeduction: LateDeduction | null;
  leaveDays: number;
  monthlyGross: number | null;
  earnings: number;
  deductions: number;
  employer: number;
  netPay: number;
  warnings: Warning[];
  payslipNumber: string | null;
  payslipState: PayslipState | null;
  publishedAt: string | null;
}

export interface ItemPage {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: PayItem[];
}

export type LineSource = 'component' | 'grant' | 'payout' | 'rule' | 'advance' | 'rounding' | 'legacy';

export interface PayLine {
  key: string;
  label: string;
  amount: number;
  fullAmount: number | null;
  category: string | null;
  source: LineSource | null;
  badge: string | null;
  steps: Array<{ step: string; value: string }>;
}

export interface DayCell {
  date: string;
  key: string;
  label: string;
  tone: string;
  payableUnits: number | null;
  leave: string | null;
  leaveName: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
}

export interface LopBreakdown {
  absent: number;
  halfDay: number;
  other: number;
  unpaidLeave: number;
  sandwich: number;
  lateDeduction: number;
}

export interface LeaveTypeDays {
  code: string | null;
  name: string;
  isPaid: boolean;
  days: number;
  coveredAbsenceDays: number;
}

export interface Attendance {
  leaveByType: LeaveTypeDays[];
  sandwichLeave: { days: number; byType: LeaveTypeDays[] };
  cycleDays: number;
  payableDays: number;
  lopDays: number;
  lop: LopBreakdown;
  present: number;
  halfDays: number;
  absent: number;
  leaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  holidays: number;
  weekOffs: number;
  overtimeHours: number;
  lateMarks: number;
  joinedMidCycle: boolean;
  notJoined: boolean;
  cells: DayCell[];
}

export interface SalarySegment {
  revisionId: number | null;
  from: string;
  to: string;
  gross: number;
  weight: number;
}

export interface PayDetail extends PayItem {
  revisionId: number | null;
  earningLines: PayLine[];
  deductionLines: PayLine[];
  employerLines: PayLine[];
  attendance: Attendance | null;
  segments: SalarySegment[];
  hasLegacyPayslip: boolean;
}

export interface OtherCompany {
  runId: number;
  companyName: string;
  status: RunStatus;
  netPay: number | null;
  isPrimaryCompany: boolean;
}

export interface Preview {
  state: 'running' | 'done' | 'failed';
  done: number;
  total: number;
  error: string | null;
  computedAt: string | null;
  totals: RunTotals | null;
  items: PayItem[];
}

export interface EmployeePay {
  run: Run;
  /** A preview: calculated for a payroll that is not started, nothing saved. */
  preview: boolean;
  item: PayDetail;
  otherCompanies: OtherCompany[];
}

export type ItemStatusFilter = 'all' | 'error' | 'warning' | 'held' | 'ok';
export type ItemSortKey = 'name' | 'net_pay' | 'payable_days' | 'lop_days';
export type SortDir = 'asc' | 'desc';

export interface ItemFilters {
  search: string;
  status: ItemStatusFilter;
  siteId: number | null;
  departmentId: number | null;
  sort: ItemSortKey;
  dir: SortDir;
}

export interface FilterOption {
  value: number;
  label: string;
}
