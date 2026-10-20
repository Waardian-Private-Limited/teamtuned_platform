export interface SalaryComponentDto {
  id: number;
  component_name: string;
  component_type: 'credit' | 'debit';
  description: string | null;
  is_system: number;
  display_order: number;
  status: 'active' | 'inactive';
  calculation_type?: 'flat' | 'percentage' | 'balance';
  is_basic?: number;
  percentage_value?: string | number | null;
  percentage_basis?: 'basic' | 'gross' | 'component' | null;
  basis_component_id?: number | null;
  tax_treatment?: TaxTreatmentDto | null;
  sub_organization_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type TaxTreatmentDto = 'taxable' | 'hra' | 'exempt_old' | 'exempt_both' | 'employer_nps';

export interface DebitRuleDto {
  id: number;
  debit_name: string;
  description: string | null;
  status: 'active' | 'inactive';
  category: string;
  is_statutory: number;
  sub_organization_id?: number | null;
  frequency?: 'monthly' | 'selected_months' | 'one_time';
  applicable_months?: number[] | string | null;
  one_time_month?: string | null;
  config: Record<string, unknown> | null;
  debit_type: 'fixed' | 'percentage' | 'slab';
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

/** The amount settings that change by date; name, description and company do not. */
export interface DebitVersionSettingsDto {
  active: boolean;
  frequency: 'monthly' | 'selected_months' | 'one_time' | null;
  applicable_months: number[] | string | null;
  one_time_month: string | null;
  config: Record<string, unknown> | null;
  debit_type: 'fixed' | 'percentage' | 'slab' | null;
  fixed_amount: string | number | null;
  percentage_value: string | number | null;
  reference_amount: 'net' | 'before_deduction' | 'after_deduction' | 'breakdown_item' | null;
  breakdown_item_id: number | null;
  enable_max_cap: boolean | number;
  max_cap_amount: string | number | null;
  enable_additional_charges: boolean | number;
  additional_charge_type: 'fixed' | 'percentage' | null;
  additional_charge_value: string | number | null;
}

export interface DebitVersionDto {
  id: number;
  /** null = since the start. */
  effective_from: string | null;
  settings: DebitVersionSettingsDto;
  reason: string | null;
  created_by_name: string | null;
  created_at: string | null;
  can_delete: boolean;
}

export interface DebitVersionsResponseDto {
  default_effective_from: string;
  last_finalized_day: string | null;
  versions: DebitVersionDto[];
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
  effective_from?: string | null;
  effective_to?: string | null;
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
  rent_paid_annual?: number | null;
  metro_city?: boolean;
  previous_employer?: PreviousEmployerDto | null;
  /** Form 12BB: needed when rent passes 1,00,000 a year. */
  landlord?: TaxPartyDto | null;
  home_loan_lender?: TaxPartyDto | null;
  /** Last time the employee saved it themselves; null when only payroll has. */
  submitted_at?: string | null;
  /** Payroll only; absent for an employee viewing their own profile. */
  proofs?: TaxProofsDto | null;
  proofs_verified_at?: string | null;
  /** Payroll only: relief under section 89 from the employee's Form 10E. */
  relief_89?: number | null;
  estimated_annual_gross: number | null;
  estimated_annual_tax: number | null;
  monthly_tds: number | null;
}

/** Form 12B: salary and tax from an earlier employer in the same year. */
export interface PreviousEmployerDto {
  income?: number | null;
  tds?: number | null;
  professionalTax?: number | null;
  providentFund?: number | null;
  employerName?: string | null;
  employerTan?: string | null;
}

/** A landlord or home-loan lender as Form 12BB names them. */
export interface TaxPartyDto {
  name: string | null;
  pan: string | null;
}

/** Form 12BB amounts HR has checked against the employee's proofs. */
export interface TaxProofsDto {
  section80C?: number | null;
  section80CCD1B?: number | null;
  section80D?: number | null;
  housingLoanInterest?: number | null;
  section80CCD2?: number | null;
  other?: number | null;
  hra?: number | null;
  rent?: number | null;
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
  oneTimeIncome?: number;
  /** Taxable salary for the year before exemptions. */
  salaryAnnual?: number;
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
  exemptAllowances?: number;
  hraExemption?: number;
  autoDeductions?: { epf?: number; professionalTax?: number; employerNps?: number };
  previousEmployerIncome?: number;
  previousTds?: number;
  noPanRateApplied?: boolean;
  proofMode?: boolean;
  /** Taxable value of perquisites (Form 12BA) added to income. */
  perquisites?: number;
  otherIncome?: number;
  relief89?: number;
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
  proof_cutoff_month?: number | null;
  // When employees may declare and upload proofs (YYYY-MM-DD); null = no limit that side.
  declaration_opens_on?: string | null;
  declaration_closes_on?: string | null;
  proof_opens_on?: string | null;
  proof_closes_on?: string | null;
  sub_organization_id?: number;
}

export interface TdsIdentityEntityDto {
  subOrganizationId: number;
  name: string;
  isPrimary: boolean;
  complete: boolean;
  missing: string[];
  employerTan: string | null;
}

export interface TdsChallanDto {
  id: number;
  financial_year: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  bsr_code: string | null;
  challan_serial_no: string | null;
  deposit_date: string | null;
  amount: number;
  sub_organization_id: number | null;
}

export interface Form16CompaniesDto {
  company: number | null;
  companies: Array<number | null>;
  employer?: { name?: string; tan?: string | null };
}

/** A financial year's Form 16 opened to a company's employees for self-download. */
export interface Form16ReleaseDto {
  financial_year: string;
  sub_organization_id: number | null;
  company_name: string | null;
  released_at: string;
}

export interface Form16ReleasesResponseDto {
  releases: Form16ReleaseDto[];
}

export interface TdsReadinessDto {
  financialYear: string;
  employerIdentity: {
    complete: boolean;
    missing: string[];
    entities: TdsIdentityEntityDto[];
    incompleteCount: number;
  };
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

export type TaxProofSectionDto = 'rent' | 'section80C' | 'section80CCD1B' | 'section80D' | 'housingLoanInterest' | 'other' | 'previousEmployer';
export type TaxProofStatusDto = 'pending' | 'accepted' | 'rejected';

/** One Form 12BB proof file an employee uploaded. */
export interface TaxProofDocumentDto {
  id: number;
  section: TaxProofSectionDto;
  file_name: string;
  mime: string;
  size_bytes: number;
  status: TaxProofStatusDto;
  remarks: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

export interface TaxProofDocumentsDto {
  financial_year: string;
  documents: TaxProofDocumentDto[];
}

export interface ProofQueueEmployeeDto {
  employee_id: number;
  employee_code: string | null;
  name: string;
  pending: number;
  accepted: number;
  rejected: number;
  last_upload: string | null;
}

export interface ProofQueueDto {
  financial_year: string;
  employees: ProofQueueEmployeeDto[];
}

/** A short-lived link to a private file; opened, never stored. */
export interface FileLinkDto {
  url: string;
  file_name: string;
  expires_in?: number;
}

export interface PartAEmployeeDto {
  employee_id: number;
  employee_code: string | null;
  name: string;
  tds: number;
  part_a: { file_name: string; uploaded_at: string } | null;
}

export interface PartAListDto {
  financial_year: string;
  company: number | null;
  employees: PartAEmployeeDto[];
  /** Employees with TDS this year and no Part A yet. */
  missing: number;
}

export interface PartAUploadResultDto {
  matched: Array<{ file_name: string; employee_id: number; name: string }>;
  unmatched: Array<{ file_name: string; reason: string }>;
}

export interface PerquisiteDto {
  id: number;
  perk_type: string;
  label: string;
  description: string | null;
  value: number | string;
  recovered: number | string;
  taxable: number;
  sub_organization_id: number | null;
}

export interface PerquisiteListDto {
  financial_year: string;
  types: Array<{ code: string; label: string }>;
  perquisites: PerquisiteDto[];
  total_taxable: number;
}
