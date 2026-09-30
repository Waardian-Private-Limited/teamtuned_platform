export type RevisionStatus = 'draft' | 'pending' | 'approved' | 'applied' | 'rejected' | 'cancelled';
export type PayoutStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
export type CycleStatus = 'draft' | 'in_review' | 'approved' | 'closed';
export type ChangeMode = 'percent' | 'ctc' | 'gross';
export type AmountMode = 'fixed' | 'percent_basic' | 'percent_gross' | 'percent_ctc';

export interface BreakdownItem {
  component_id: number;
  name?: string | null;
  amount: number;
}

export interface EmployeeRef {
  id: number;
  name: string;
  employee_code: string | null;
  department_name?: string | null;
  designation?: string | null;
}

export interface RevisionDto {
  id: number;
  employee: EmployeeRef;
  sub_organization_id: number | null;
  appraisal_cycle_id: number | null;
  revision_type: string;
  revision_type_label: string;
  effective_from: string;
  switch_on: string | null;
  rating: string | null;
  change_percent: number | null;
  previous_ctc: number | null;
  new_ctc: number | null;
  previous_gross: number | null;
  new_gross: number | null;
  previous_breakdown: BreakdownItem[] | null;
  new_breakdown: BreakdownItem[] | null;
  previous_designation: string | null;
  new_designation: string | null;
  new_role_id: number | null;
  new_role_name: string | null;
  arrears_amount: number | null;
  reason: string | null;
  status: RevisionStatus;
  decision_note: string | null;
  created_by: number | null;
  decided_at: string | null;
  applied_at: string | null;
  created_at: string | null;
}

export interface PayoutDto {
  id: number;
  employee: EmployeeRef;
  batch_id: string | null;
  payout_type: string;
  payout_type_label: string;
  title: string;
  amount: number;
  taxable: 0 | 1;
  payout_month: string;
  installment_no: number;
  installment_count: number;
  clawback_until: string | null;
  source_type: string;
  source_id: number | null;
  calculation: Record<string, unknown> | null;
  notes: string | null;
  status: PayoutStatus;
  locked: boolean;
  created_by: number | null;
  created_at: string | null;
}

export interface Paged<T> {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  counts?: Record<string, number>;
  rows: T[];
}

export interface RatingLevel {
  rating: string;
  label: string;
  percent: number;
}

export interface CycleSummaryDto {
  proposals: number;
  drafts: number;
  pending: number;
  approved: number;
  applied: number;
  rejected: number;
  promotions: number;
  current_ctc: number;
  proposed_ctc: number;
  increase: number;
  increase_percent: number;
  budget: number | null;
  budget_used_percent: number | null;
}

export interface CycleDto {
  id: number;
  sub_organization_id: number | null;
  name: string;
  period_start: string;
  period_end: string;
  effective_from: string;
  eligibility: {
    joinedOnOrBefore: string;
    minServiceMonths: number;
    includeProbation: boolean;
    workTypes: string[];
    departmentIds: number[];
  };
  rating_scale: RatingLevel[];
  budget_percent: number | null;
  status: CycleStatus;
  proposals?: number;
  created_by: number | null;
  approved_at: string | null;
  summary?: CycleSummaryDto;
}

export interface PayoutTypeConfig {
  code: string;
  label: string;
  taxable: boolean;
  active: boolean;
}

export interface CompensationSettings {
  approval: { revisions: boolean; payouts: boolean; allowSelfApproval: boolean };
  arrears: { enabled: boolean; midMonth: 'prorate' | 'next_month' };
  gratuity: {
    eligibilityYears: number;
    continuousServiceDays: number | null;
    divisor: number;
    roundUpAfterMonths: number;
    cap: number;
    wageComponents: string[];
    waiveForDeathDisablement: boolean;
    provisionPercent: number;
  };
  statutoryBonus: {
    rate: number;
    eligibilityWage: number;
    calculationCeiling: number;
    minWorkingDays: number;
    wageComponents: string[];
  };
  payoutTypes: PayoutTypeConfig[];
  letters: {
    includeStructure: boolean;
    signatory: string;
    increment: { title: string; body: string };
    promotion: { title: string; body: string };
  };
  ratingScale: RatingLevel[];
}

export interface SettingsResponseDto {
  sub_organization_id: number | null;
  inherited: boolean;
  settings: CompensationSettings;
  defaults: CompensationSettings;
  catalog: {
    letter_placeholders: string[];
    revision_types: { value: string; label: string }[];
    payout_types: { value: string; label: string; taxable: boolean }[];
    all_payout_types: { value: string; label: string }[];
  };
}

export interface CompEmployeeDto {
  id: number;
  name: string;
  employee_code: string | null;
  designation: string | null;
  sub_organization_id: number | null;
  ctc: number | null;
  monthly_gross: number | null;
}

export interface RevisionPreviewDto {
  previous_ctc: number | null;
  previous_gross: number | null;
  new_ctc: number;
  new_gross: number;
  change_percent: number | null;
  previous_breakdown: BreakdownItem[];
  new_breakdown: BreakdownItem[];
}

export interface HistoryDto {
  employee: { id: number; name: string; employee_code: string | null; designation: string | null; joining_date: string | null; status: string };
  current: { ctc: number | null; monthly_gross: number | null; breakdown: BreakdownItem[]; gratuity_provision?: number };
  stats: { revisions: number; growth_percent: number | null; last_revision_on: string | null; one_time_total: number };
  revisions: RevisionDto[];
  payouts: PayoutDto[];
}

export interface BonusRowDto {
  employee: { id: number; name: string; employee_code: string | null; status: string };
  already_generated: boolean;
  eligible: boolean;
  reason: string;
  monthly_wage: number;
  months_counted: number;
  wage_considered?: number;
  amount: number;
}

export interface GratuityRowDto {
  employee: { id: number; name: string; employee_code: string | null; status: string };
  joining_date: string | null;
  service: { years: number; months: number; days: number };
  monthly_wage: number;
  eligible: boolean;
  payable_today: number;
  accrued_liability: number;
  monthly_provision: number;
}

export interface GratuityCalcDto {
  employee: { id: number; name: string; employee_code: string | null; status: string };
  joining_date: string | null;
  as_of: string;
  reason: string;
  eligible: boolean;
  service: { years: number; months: number; days: number };
  counted_years: number;
  monthly_wage: number;
  wage_components: string[];
  formula: string;
  calculated: number;
  amount: number;
  capped: boolean;
  cap: number;
  monthly_provision: number;
}
