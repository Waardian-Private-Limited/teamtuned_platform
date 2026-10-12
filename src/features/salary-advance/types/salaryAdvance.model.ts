import type {
  AdvanceKindDto,
  AdvanceSourceDto,
  AdvanceStatusDto,
  DisbursementModeDto,
  InstallmentStatusDto,
  InterestModeDto,
  UploadedFileDto,
} from './salaryAdvance.dto';

export type AdvanceStatus = AdvanceStatusDto;
export type InstallmentStatus = InstallmentStatusDto;
export type InterestMode = InterestModeDto;
export type DisbursementMode = DisbursementModeDto;
export type AdvanceKind = AdvanceKindDto;
export type UploadedFile = UploadedFileDto;

export type AdvanceListTab = 'pending' | 'to_disburse' | 'active' | 'closed' | 'all';

export type AdvanceSortKey = 'name' | 'amount' | 'status' | 'created_at';

export interface AdvanceSort {
  key: AdvanceSortKey;
  dir: 'asc' | 'desc';
}

export interface Advance {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  typeId: number;
  typeName: string;
  typeCode: string;
  kind: AdvanceKind;
  status: AdvanceStatus;
  requestedAmount: number;
  approvedAmount: number | null;
  amount: number;
  installments: number;
  installmentAmount: number;
  interestMode: InterestMode;
  interestRate: number;
  interestAmount: number;
  totalRepayable: number;
  startMonth: string | null;
  disbursementMode: DisbursementMode;
  plan: RepaymentPlan;
  mergedIntoId: number | null;
  mergedFrom: { advanceId: number; outstanding: number }[];
  recovered: number;
  outstanding: number;
  progress: number;
  nextDue: { month: string; amount: number } | null;
  createdAt: string;
  decidedAt: string | null;
  disbursedAt: string | null;
  closedAt: string | null;
  source: AdvanceSourceDto;
  site: string | null;
  department: string | null;
}

export interface RepaymentPlan {
  installments: number;
  startMonth: string | null;
  mergeAdvanceIds: number[];
}

export interface MergeableAdvance {
  id: number;
  typeName: string;
  amount: number;
  installmentAmount: number;
  outstanding: number;
  nextDue: { month: string; amount: number } | null;
}

export interface PlanPreview {
  approvedAmount: number;
  installments: number;
  disbursementMode: DisbursementMode;
  startMonth: string;
  startMonthPlanned: string | null;
  mergeAdvanceIds: number[];
  mergedOutstanding: number;
  interestAmount: number;
  totalRepayable: number;
  installmentAmount: number;
  monthlyDeduction: number;
  schedule: Installment[];
}

export interface PlanContext {
  currentMonth: string;
  requestedAmount: number;
  earliestStart: { manual: string; payroll: string };
  maxInstallments: number;
  mergeable: MergeableAdvance[];
  plan: PlanPreview;
  errors: Record<string, string>;
}

export interface PlanInput {
  approvedAmount: number;
  installments: number;
  startMonth: string | null;
  disbursementMode: DisbursementMode;
  mergeAdvanceIds: number[];
}

export interface Installment {
  key: string;
  id: number | null;
  seq: number;
  month: string;
  principal: number;
  interest: number;
  amount: number;
  recovered: number;
  status: InstallmentStatus;
  payrollItemId: number | null;
  payrollRunId: number | null;
  reference: string | null;
  note: string | null;
}

export interface AdvanceEvent {
  key: string;
  action: string;
  at: string;
  actor: string | null;
  data: Record<string, unknown> | null;
}

export interface AdvanceAttachment {
  index: number;
  name: string;
  size: number;
  type: string;
}

export interface AdvanceCan {
  cancel: boolean;
  disburse: boolean;
  adjust: boolean;
  repay: boolean;
  waive: boolean;
  plan: boolean;
}

export interface AdvanceDetail extends Advance {
  reason: string | null;
  attachments: AdvanceAttachment[];
  disbursementReference: string | null;
  hasProof: boolean;
  schedule: Installment[];
  events: AdvanceEvent[];
  approval: { requestId: number; status: string } | null;
  can: AdvanceCan;
  planContext: PlanContext | null;
}

export interface Eligibility {
  eligible: boolean;
  reasons: string[];
  maxAmount: number | null;
  minAmount: number | null;
  earnedSoFar: number | null;
  outstanding: number | null;
  maxInstallments: number;
  interestMode: InterestMode;
  interestRate: number;
  disbursementMode: DisbursementMode;
  hideLimits: boolean;
  canChooseInstallments: boolean;
  reasonRequired: boolean;
  attachmentRequired: boolean;
  earliestStart: string | null;
  defaultStart: string | null;
  mergeable: MergeableAdvance[];
}

export interface MyAdvanceType {
  id: number;
  code: string;
  name: string;
  kind: AdvanceKind;
  eligibility: Eligibility;
}

export interface MyOverview {
  enabled: boolean;
  types: MyAdvanceType[];
  outstanding: number;
  active: Advance[];
  pending: Advance[];
}

export interface SchedulePreview {
  schedule: Installment[];
  totalRepayable: number;
  interestAmount: number;
  installmentAmount: number;
  startMonth: string | null;
  errors: string[];
  fieldErrors: Record<string, string>;
}

export interface OverviewKpis {
  outstanding: number;
  activeCount: number;
  pendingCount: number;
  toDisburseCount: number;
  disbursedThisMonth: number;
  recoveredThisMonth: number;
  carriedThisMonth: number;
}

export interface TrendPoint {
  month: string;
  disbursed: number;
  recovered: number;
}

export interface Overview {
  kpis: OverviewKpis;
  trend: TrendPoint[];
  dueNextPayroll: { month: string; amount: number; employees: number } | null;
}

export interface AdvanceType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  kind: AdvanceKind;
  status: 'active' | 'inactive';
  subOrganizationId: number | null;
}

export interface AdvanceTypeFormInput {
  code: string;
  name: string;
  description: string;
  kind: AdvanceKind;
  status: 'active' | 'inactive';
  subOrganizationId: number | null;
}

export type AdvanceTypeFieldName = 'code' | 'name' | 'description';
export type AdvanceTypeFieldErrors = Partial<Record<AdvanceTypeFieldName, string>>;

export interface HrAdvanceFormInput {
  employeeId: number | null;
  typeId: number | null;
  amount: number;
  installments: number;
  reason: string;
  disbursementMode: DisbursementMode | null;
  skipApproval: boolean;
  startMonth: string | null;
  mergeAdvanceIds: number[];
}

export type HrAdvanceFieldName = 'employee_id' | 'advance_type_id' | 'amount' | 'installments' | 'reason' | 'start_month' | 'merge_advance_ids';
export type HrAdvanceFieldErrors = Partial<Record<HrAdvanceFieldName, string>>;

export interface MyAdvanceFormInput {
  typeId: number | null;
  amount: number;
  installments: number;
  startMonth: string | null;
  reason: string;
  attachments: UploadedFile[];
}

export type MyAdvanceFieldName = 'advance_type_id' | 'amount' | 'installments' | 'reason' | 'attachments' | 'start_month';
export type MyAdvanceFieldErrors = Partial<Record<MyAdvanceFieldName, string>>;

export interface AdvanceListFilters {
  tab: AdvanceListTab;
  typeId: number | null;
  siteId: number | null;
  departmentId: number | null;
  search: string;
  subOrgId: number | null;
  sort: AdvanceSort;
}
