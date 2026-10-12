export type AdvanceStatusDto = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'active' | 'closed' | 'written_off' | 'merged';
export type InstallmentStatusDto = 'scheduled' | 'deducted' | 'partial' | 'carried' | 'skipped' | 'waived' | 'paid_manually' | 'moved';
export type InterestModeDto = 'none' | 'flat' | 'reducing';
export type DisbursementModeDto = 'payroll' | 'manual';
export type AdvanceKindDto = 'advance' | 'loan';
export type AdvanceSourceDto = 'employee' | 'hr' | 'legacy_import';

export interface AdvanceEmployeeRefDto {
  id: number;
  code: string | null;
  name: string;
}

export interface AdvanceTypeRefDto {
  id: number;
  code: string;
  name: string;
  kind: AdvanceKindDto;
}

export interface RepaymentPlanDto {
  installments: number;
  start_month: string | null;
  merge_advance_ids: number[];
}

export interface MergeableAdvanceDto {
  id: number;
  type: { id: number; name: string };
  amount: number;
  installment_amount: number;
  outstanding: number;
  next_due: NextDueDto | null;
}

export interface PlanPreviewDto {
  approved_amount: number;
  installments: number;
  disbursement_mode: DisbursementModeDto;
  start_month: string;
  start_month_planned: string | null;
  merge_advance_ids: number[];
  merged_outstanding: number;
  interest_amount: number;
  total_repayable: number;
  installment_amount: number;
  monthly_deduction: number;
  schedule: InstallmentDto[];
}

export interface PlanContextDto {
  current_month: string;
  requested_amount: number;
  earliest_start: { manual: string; payroll: string };
  max_installments: number;
  mergeable: MergeableAdvanceDto[];
  plan: PlanPreviewDto;
  errors?: Record<string, string>;
}

export interface PlanRequestDto {
  approved_amount?: number;
  installments?: number;
  start_month?: string | null;
  disbursement_mode?: DisbursementModeDto;
  merge_advance_ids?: number[];
}

export interface NextDueDto {
  month_key: string;
  amount: number;
}

export interface AdvanceDto {
  id: number;
  employee: AdvanceEmployeeRefDto;
  type: AdvanceTypeRefDto;
  status: AdvanceStatusDto;
  requested_amount: number;
  approved_amount: number | null;
  installments: number;
  installment_amount: number;
  interest_mode: InterestModeDto;
  interest_rate: number;
  interest_amount: number;
  total_repayable: number;
  start_month: string | null;
  disbursement_mode: DisbursementModeDto;
  plan?: RepaymentPlanDto;
  merged_into_id?: number | null;
  merged_from?: { advance_id: number; outstanding: number }[];
  recovered: number;
  outstanding: number;
  next_due: NextDueDto | null;
  created_at: string;
  decided_at: string | null;
  disbursed_at: string | null;
  closed_at: string | null;
  source: AdvanceSourceDto;
}

export type NamedRefDto = { id: number; name: string } | string | null;

export interface AdvanceListItemDto extends AdvanceDto {
  site: NamedRefDto;
  department: NamedRefDto;
}

export interface InstallmentDto {
  id: number | null;
  seq: number;
  month_key: string;
  principal: number;
  interest: number;
  amount: number;
  recovered: number;
  status: InstallmentStatusDto;
  payroll_item_id: number | null;
  payroll_run_id?: number | null;
  reference: string | null;
  note: string | null;
}

export interface AdvanceAttachmentDto {
  index: number;
  name: string;
  size: number;
  type: string | null;
}

export interface AdvanceEventDto {
  action: string;
  at: string;
  actor_name: string | null;
  data: Record<string, unknown> | null;
}

export interface AdvanceApprovalDto {
  request_id: number;
  status: string;
  steps?: unknown;
}

export interface AdvanceCanDto {
  cancel: boolean;
  disburse: boolean;
  adjust: boolean;
  repay: boolean;
  waive: boolean;
  plan?: boolean;
}

export interface AdvanceDetailDto extends AdvanceDto {
  reason: string | null;
  attachments: AdvanceAttachmentDto[];
  disbursement_reference: string | null;
  has_proof: boolean;
  schedule: InstallmentDto[];
  events: AdvanceEventDto[];
  approval: AdvanceApprovalDto | null;
  can: AdvanceCanDto;
  plan_context?: PlanContextDto;
}

export interface AdvanceListResponseDto {
  items: AdvanceListItemDto[];
  total: number;
  counts: Record<string, number>;
}

export interface EligibilityInterestDto {
  mode?: InterestModeDto;
  annual_rate?: number;
  rate?: number;
}

export interface EligibilityDto {
  eligible: boolean;
  reasons: string[];
  max_amount: number | null;
  earned_so_far: number | null;
  outstanding: number | null;
  max_installments: number;
  interest: EligibilityInterestDto | InterestModeDto | null;
  disbursement_mode: DisbursementModeDto;
  hide_limits: boolean;
  min_amount?: number | null;
  can_choose_installments?: boolean;
  reason_required?: boolean;
  attachment_required?: boolean;
  request?: { reason_required?: boolean; attachment_required?: boolean; employee_can_choose_installments?: boolean; earliest_start?: string | null; default_start?: string | null };
  mergeable?: MergeableAdvanceDto[];
}

export interface MyAdvanceTypeDto {
  id: number;
  code: string;
  name: string;
  kind: AdvanceKindDto;
  eligibility: EligibilityDto;
}

export interface MyOverviewDto {
  enabled?: boolean;
  types: MyAdvanceTypeDto[];
  outstanding: number;
  active: AdvanceDto[];
  pending: AdvanceDto[];
}

export interface PagedAdvancesDto {
  items: AdvanceDto[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface PreviewRequestDto {
  advance_type_id: number;
  amount: number;
  installments: number;
  start_month?: string;
}

export interface PreviewResponseDto {
  schedule: InstallmentDto[];
  total_repayable: number;
  interest_amount: number;
  installment_amount: number;
  start_month: string | null;
  errors?: string[] | Record<string, string>;
}

export interface UploadedFileDto {
  key: string;
  name: string;
  size: number;
  type: string;
}

export interface CreateMyAdvanceRequestDto {
  advance_type_id: number;
  amount: number;
  installments: number;
  start_month?: string;
  reason: string;
  attachments?: UploadedFileDto[];
}

export interface CreateHrAdvanceRequestDto {
  employee_id: number;
  advance_type_id: number;
  amount: number;
  installments: number;
  reason: string;
  disbursement_mode?: DisbursementModeDto;
  skip_approval?: boolean;
  start_month?: string | null;
  merge_advance_ids?: number[];
}

export interface DisburseRequestDto {
  reference: string;
  proof?: UploadedFileDto;
  disbursed_on?: string;
  start_month?: string;
}

export interface OverviewKpisDto {
  outstanding: number;
  active_count: number;
  pending_count: number;
  to_disburse_count: number;
  disbursed_this_month: number;
  recovered_this_month: number;
  carried_this_month: number;
}

export interface TrendPointDto {
  month: string;
  disbursed: number;
  recovered: number;
}

export interface DueNextPayrollDto {
  month: string;
  amount: number;
  employees: number;
}

export interface OverviewDto {
  kpis: OverviewKpisDto;
  trend: TrendPointDto[];
  due_next_payroll: DueNextPayrollDto | null;
}

export interface AdvanceTypeDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
  kind: AdvanceKindDto;
  status: 'active' | 'inactive';
  sort_order?: number;
  sub_organization_id: number | null;
  created_at?: string;
}

export type AdvanceTypeListResponseDto =
  | AdvanceTypeDto[]
  | { types?: AdvanceTypeDto[]; items?: AdvanceTypeDto[]; total?: number; page?: number; pageSize?: number; pages?: number };

export interface AdvanceTypeRequestDto {
  code: string;
  name: string;
  description: string | null;
  kind: AdvanceKindDto;
  status: 'active' | 'inactive';
  sub_organization_id: number | null;
}

export interface ExportAdvancesRequestDto {
  status?: string;
  type?: number;
  from?: string;
  to?: string;
}
