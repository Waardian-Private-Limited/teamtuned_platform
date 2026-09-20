export interface SalaryComponentDto {
  id: number;
  component_name: string;
  component_type: 'credit' | 'debit';
  description: string | null;
  is_system: number;
  display_order: number;
  status: 'active' | 'inactive';
  calculation_type?: 'flat' | 'percentage';
  percentage_value?: string | number | null;
  percentage_basis?: 'basic' | 'gross' | 'component' | null;
  basis_component_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DebitRuleDto {
  id: number;
  debit_name: string;
  description: string | null;
  status: 'active' | 'inactive';
  category: string;
  is_statutory: number;
  frequency?: 'monthly' | 'selected_months' | 'one_time';
  applicable_months?: number[] | string | null;
  one_time_month?: string | null;
  config: Record<string, unknown> | null;
  debit_type: 'fixed' | 'percentage';
  fixed_amount: string | number | null;
  percentage_value: string | number | null;
  reference_amount: 'net' | 'before_deduction' | 'after_deduction' | 'breakdown_item' | null;
  breakdown_item_id: number | null;
  breakdown_item_name: string | null;
  is_dynamic_reference: number;
  enable_max_cap: number;
  max_cap_amount: string | number | null;
  enable_additional_charges: number;
  additional_charge_type: 'fixed' | 'percentage' | null;
  additional_charge_value: string | number | null;
  assigned_employee_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DebitListResponseDto {
  debits: DebitRuleDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface AssignedEmployeeDto {
  employee_id: number;
  employee_name: string | null;
  email: string | null;
  designation: string | null;
  is_active: number;
  assigned_at: string | null;
}

export interface AssignmentListResponseDto {
  employees: AssignedEmployeeDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface EmployeeSearchResultDto {
  employees: Array<{ id: number; name: string; designation: string | null; email: string | null }>;
}

export interface TaxProfileDto {
  id: number;
  employee_id: number;
  employee_name?: string;
  financial_year: string;
  regime: 'old' | 'new';
  pan: string | null;
  declarations: Record<string, number> | null;
  estimated_annual_gross: number | null;
  estimated_annual_tax: number | null;
  monthly_tds: number | null;
}

export interface TaxProfileResponseDto {
  profile: TaxProfileDto | null;
  estimate?: TdsEstimateDto;
  financial_year: string;
}

export type AgeBandDto = 'default' | 'senior' | 'super_senior';

export interface TdsEstimateDto {
  financialYear: string;
  regime?: string;
  profile?: { regime: 'old' | 'new' };
  projectedAnnualGross: number;
  standardDeduction: number;
  declarationTotal: number;
  declarationsApplied?: Record<string, number>;
  declarationsIgnored?: string[];
  taxableIncome: number;
  ageBand?: AgeBandDto;
  slabTax?: number;
  rebate?: number;
  rebateRelief?: number;
  surchargeRate?: number;
  surcharge?: number;
  surchargeRelief?: number;
  taxBeforeCess: number;
  cess: number;
  annualTax: number;
  deductedBeforeCycle: number;
  remainingMonths: number;
  monthlyTds: number;
  isProvisional?: boolean;
}

export interface TdsPreviewResponseDto {
  estimate: TdsEstimateDto;
}

export interface RegimeComparisonDto {
  financialYear: string;
  old: TdsEstimateDto | null;
  new: TdsEstimateDto | null;
  cheaper: 'old' | 'new' | 'equal' | null;
  saving: number;
}

export interface RegimeComparisonResponseDto {
  comparison: RegimeComparisonDto;
}

export interface TdsSettingsDto {
  employer_tan: string | null;
  employer_pan: string | null;
  signatory_name: string | null;
  signatory_designation: string | null;
  place: string | null;
}

export interface TdsChallanDto {
  id: number;
  financial_year: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  bsr_code: string | null;
  challan_serial_no: string | null;
  deposit_date: string | null;
  amount: number;
}

export interface TdsReadinessDto {
  financialYear: string;
  employerIdentity: { complete: boolean; missing: string[] };
  taxRates: { configured: boolean; configuredYears: string[] };
  deductionRule: {
    exists: boolean;
    active: boolean;
    ruleId: number | null;
    ruleName: string | null;
    assignedEmployees: number;
  };
  taxProfiles: { assigned: number; withProfile: number; missing: number };
  challans: { count: number; totalDeposited: number };
  form16: { ready: boolean; blockedBy: string[] };
}

export interface TdsReadinessResponseDto {
  readiness: TdsReadinessDto;
}

/** [upperLimit, ratePercent]; a null limit marks the open-ended top slab. */
export type TaxSlabDto = [number | null, number];

export interface TaxConfigDto {
  financial_year: string;
  regime: 'old' | 'new';
  standard_deduction: number;
  cess_rate: number;
  slabs_by_age: Record<string, TaxSlabDto[]>;
  rebate: { limit: number; max: number; marginalRelief: boolean } | null;
  surcharge: { cap: number | null; bands: Array<{ over: number; rate: number }> } | null;
  declaration_limits: Record<string, number | null | { percentOfBasic: number }>;
  is_provisional: boolean;
  notes: string | null;
  updated_at?: string | null;
}

export type TaxConfigInputDto = Omit<TaxConfigDto, 'financial_year' | 'regime' | 'updated_at'>;

export interface TaxConfigListResponseDto {
  financial_year: string;
  configs: TaxConfigDto[];
}
