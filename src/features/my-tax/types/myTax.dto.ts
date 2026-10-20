import type {
  PreviousEmployerDto,
  RegimeComparisonDto,
  TaxPartyDto,
  TaxProofsDto,
  TdsEstimateDto,
} from '@/features/payroll-setup/types/payroll-setup.dto';

export interface MyTaxEligibilityDto {
  eligible: boolean;
  financial_year: string;
  deducted: number;
}

export interface MyForm16Dto {
  financial_year: string;
  /** null = issued by the organization itself, not a sub-company. */
  sub_organization_id: number | null;
  company_name: string | null;
  released_at: string;
}

export interface MyTaxDeclarationsDto {
  section80C?: number | null;
  section80CCD1B?: number | null;
  section80D?: number | null;
  housingLoanInterest?: number | null;
  /** Employer NPS; set by payroll, kept as is when the employee saves. */
  section80CCD2?: number | null;
  other?: number | null;
  otherIncome?: number | null;
  /** Typed in before HRA was calculated from rent. Kept, no longer used. */
  hra?: number | null;
}

export interface MyTaxProfileDto {
  financial_year: string;
  regime: 'old' | 'new';
  pan: string | null;
  declarations: MyTaxDeclarationsDto | null;
  rent_paid_annual: number | null;
  metro_city: boolean;
  landlord: TaxPartyDto | null;
  home_loan_lender: TaxPartyDto | null;
  previous_employer: PreviousEmployerDto | null;
  /** HR-verified amounts; read-only here. */
  proofs: TaxProofsDto | null;
  proofs_verified_at: string | null;
  submitted_at: string | null;
  monthly_tds: number | null;
}

export interface MyTaxDto {
  eligible: boolean;
  financial_year: string;
  form16: MyForm16Dto[];
  // Present only when eligible.
  profile?: MyTaxProfileDto | null;
  estimate?: TdsEstimateDto | null;
  comparison?: RegimeComparisonDto | null;
  /** Estimate could not be worked out (e.g. no tax rates yet); the form still works. */
  estimate_error?: { code: string; message: string } | null;
  /** TDS already deducted this year, so only payroll can switch the regime. */
  regime_locked?: boolean;
  tds_assigned?: boolean;
  tds_deducted?: number;
  joined_this_year?: boolean;
  proof_cutoff_month?: number | null;
  /** When declarations can change and proofs can be uploaded. */
  windows?: { declaration: TaxWindowDto; proof: TaxWindowDto };
  /** Perquisites payroll recorded for this year (Form 12BA); read-only here. */
  perquisites?: Array<{ label: string; description: string | null; taxable: number }>;
}

export interface TaxWindowDto {
  open: boolean;
  /** YYYY-MM-DD, null = no limit that side. */
  opens_on: string | null;
  closes_on: string | null;
}

export interface SaveMyTaxBodyDto {
  regime: 'old' | 'new';
  pan: string | null;
  declarations: MyTaxDeclarationsDto;
  rent_paid_annual: number | null;
  metro_city: boolean;
  landlord: TaxPartyDto | null;
  home_loan_lender: TaxPartyDto | null;
  previous_employer: PreviousEmployerDto | null;
}

export interface SaveMyTaxResponseDto {
  profile: MyTaxProfileDto;
  estimate: TdsEstimateDto;
}
