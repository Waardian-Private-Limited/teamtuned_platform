export type RevisionStatus = 'draft' | 'pending' | 'approved' | 'applied' | 'rejected' | 'cancelled' | 'voided';
export type PayoutStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
export type CycleStatus = 'draft' | 'in_review' | 'approved' | 'closed';
export type ChangeMode = 'percent' | 'ctc' | 'gross';
export type AmountMode = 'fixed' | 'percent_basic' | 'percent_gross' | 'percent_ctc';

export interface BreakdownItem {
  component_id: number;
  name?: string | null;
  amount: number;
}

export interface AllocationSnapshot {
  sub_organization_id: number | null;
  is_primary: boolean;
  ctc: number | null;
  gross: number;
  breakdown: BreakdownItem[];
  debit_ids: number[];
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
  /** Market range from the newest salary survey, on appraisal proposals only. */
  market?: { p25: number | null; p50: number; p75: number | null; compa_before: number | null; compa_after: number | null };
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
  previous_allocations?: AllocationSnapshot[] | null;
  new_allocations?: AllocationSnapshot[] | null;
  previous_designation: string | null;
  new_designation: string | null;
  new_role_id: number | null;
  new_role_name: string | null;
  arrears_amount: number | null;
  reason: string | null;
  status: RevisionStatus;
  decision_note: string | null;
  void_reason?: string | null;
  voided_at?: string | null;
  replaces_revision_id?: number | null;
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
  /** One-time bonus this rating earns, as % of the base picked when bonus payouts are created. Absent = no bonus. */
  bonus_percent?: number;
}

export type BonusBase = 'basic' | 'gross' | 'ctc';

export interface CycleBonusSummaryDto {
  payouts: number;
  employees: number;
  amount: number;
  by_status: { status: string; payouts: number; employees: number; amount: number }[];
}

export type BonusPersonStatus = 'new' | 'already_created' | 'no_rating' | 'unknown_rating' | 'no_bonus' | 'zero_base';

export interface BonusPayoutsDto {
  dry_run: boolean;
  base: BonusBase;
  payout_type: string;
  payout_month: string;
  title: string;
  total: number;
  counts: Partial<Record<BonusPersonStatus, number>>;
  groups: { rating: string; label: string | null; bonus_percent: number; amount: number; employees: number }[];
  people: { employee_id: number; employee_name: string | null; employee_code: string | null; rating: string | null; rating_label: string | null; bonus_percent: number | null; base: number | null; amount: number; status: BonusPersonStatus }[];
  batches?: { rating: string; batch_id: string; created: number; employees: number; status: string }[];
  existing: CycleBonusSummaryDto;
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
  performance_cycle_id: number | null;
  status: CycleStatus;
  proposals?: number;
  created_by: number | null;
  approved_at: string | null;
  summary?: CycleSummaryDto;
  bonus?: CycleBonusSummaryDto;
}

export interface PayoutTypeConfig {
  code: string;
  label: string;
  taxable: boolean;
  active: boolean;
}

export interface CompensationSettings {
  approval: { revisions: boolean; payouts: boolean; deductions: boolean; allowSelfApproval: boolean };
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
  previous_allocations?: AllocationSnapshot[] | null;
  new_allocations?: AllocationSnapshot[] | null;
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

export interface LinkablePerformanceCycleDto {
  id: number;
  name: string;
  status: string;
  released: number;
}

export interface PerformanceImportDto {
  performance_cycle: { id: number; name: string; status: string };
  imported: number;
  applied: number;
  without_rating: number;
  unmatched_bands: { band: string; employees: number }[];
  scale_codes: string[];
  summary: CycleSummaryDto;
}

// ---- salary benchmarking ----

export interface MarketSurveyDto { id: number; sub_organization_id: number | null; name: string; source: string | null; effective_date: string; currency: string; row_count: number }
export type MarketBand = 'below_p25' | 'p25_p50' | 'p50_p75' | 'above_p75';
export interface MarketRangeDto { job: string; level: string | null; location: string | null; p10: number | null; p25: number | null; p50: number; p75: number | null; p90: number | null }
export interface BenchmarkRowDto {
  employee_id: number; name: string; employee_code: string | null; designation: string | null; role_name: string | null; grade: string | null; location: string | null;
  department_name: string | null; ctc: number | null; matched_on: string | null; market: MarketRangeDto | null; compa_ratio: number | null; band: MarketBand | null;
}
export interface BenchmarkDto {
  survey: MarketSurveyDto | null; rows: BenchmarkRowDto[];
  summary: { total: number; bands: Record<MarketBand | 'unmatched', number>; median_compa_ratio: number | null };
}
export interface MarketImportDto { survey: MarketSurveyDto; saved: number; error_count: number; errors: { row: number; message: string }[] }
