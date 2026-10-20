import type { PtSlab } from '../utils/professionalTax';
import type { TaxProofSectionDto, TaxProofStatusDto } from './payroll-setup.dto';

export type DebitSlabBasis = 'gross' | 'basic' | 'component';

/** One band of a slab rule. It runs from `from` up to the next band's `from`. */
export interface DebitSlabBand {
  from: number;
  type: 'fixed' | 'percentage';
  value: number;
}

export interface DebitSlab {
  basis: DebitSlabBasis;
  componentId: number | null;
  bands: DebitSlabBand[];
}

export type DebitConfigValue = string | number | boolean | number[] | PtSlab[] | null;

export type TaxTreatment = 'taxable' | 'hra' | 'exempt_old' | 'exempt_both' | 'employer_nps';
export type DebitType = 'fixed' | 'percentage' | 'slab';

export type ComponentType = 'credit' | 'debit';
export type Status = 'active' | 'inactive';

export interface SalaryComponent {
  id: number;
  name: string;
  type: ComponentType;
  description: string | null;
  isSystem: boolean;
  displayOrder: number;
  status: Status;
  calculationType: 'flat' | 'percentage' | 'balance';
  isBasic: boolean;
  percentageValue: number | null;
  percentageBasis: 'basic' | 'gross' | 'component' | null;
  basisComponentId: number | null;
  taxTreatment: TaxTreatment;
  subOrganizationId: number | null;
}

export interface ComponentFormInput {
  name: string;
  type: ComponentType;
  description: string;
  displayOrder: string;
  status: Status;
  calculationType: 'flat' | 'percentage' | 'balance';
  isBasic: boolean;
  percentageValue: string;
  percentageBasis: 'basic' | 'gross' | 'component';
  basisComponentId: number | null;
  taxTreatment: TaxTreatment;
  subOrganizationId?: number | null;
}

export interface DebitRule {
  id: number;
  name: string;
  description: string | null;
  status: Status;
  category: string;
  isStatutory: boolean;
  subOrganizationId: number | null;
  frequency: 'monthly' | 'selected_months' | 'one_time';
  applicableMonths: number[] | null;
  oneTimeMonth: string | null;
  config: Record<string, unknown> | null;
  debitType: DebitType;
  fixedAmount: number | null;
  percentageValue: number | null;
  referenceAmount: 'net' | 'before_deduction' | 'after_deduction' | 'breakdown_item' | null;
  breakdownItemId: number | null;
  breakdownItemName: string | null;
  enableMaxCap: boolean;
  maxCapAmount: number | null;
  enableAdditionalCharges: boolean;
  additionalChargeType: 'fixed' | 'percentage' | null;
  additionalChargeValue: number | null;
  assignedEmployeeCount: number;
}

export interface DebitListResult {
  debits: DebitRule[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface DebitFormInput {
  name: string;
  description: string;
  category: string;
  subOrganizationId?: number | null;
  frequency: 'monthly' | 'selected_months' | 'one_time';
  applicableMonths: number[];
  oneTimeMonth: string;
  debitType: DebitType;
  fixedAmount: string;
  percentageValue: string;
  referenceAmount: 'net' | 'before_deduction' | 'breakdown_item';
  breakdownItemId: number | null;
  enableMaxCap: boolean;
  maxCapAmount: string;
  enableAdditionalCharges: boolean;
  additionalChargeType: 'fixed' | 'percentage';
  additionalChargeValue: string;
  // number[] carries the LWF month list alongside the scalar statutory settings.
  config: Record<string, DebitConfigValue>;
  /** Non-statutory rules: charge a fixed or slab amount only for payable days. */
  prorateByAttendance: boolean;
  slab: DebitSlab;
  status: Status;
  /** Edit only: the date the new amount settings start. Blank = the server default. */
  effectiveFrom: string;
  changeReason: string;
}

/** A dated version of a rule's amount settings. */
export interface DebitRuleVersion {
  id: number;
  /** null = since the start. */
  effectiveFrom: string | null;
  active: boolean;
  debitType: DebitType;
  fixedAmount: number | null;
  percentageValue: number | null;
  referenceAmount: 'net' | 'before_deduction' | 'after_deduction' | 'breakdown_item' | null;
  breakdownItemId: number | null;
  config: Record<string, unknown> | null;
  frequency: 'monthly' | 'selected_months' | 'one_time';
  applicableMonths: number[] | null;
  oneTimeMonth: string | null;
  enableMaxCap: boolean;
  maxCapAmount: number | null;
  enableAdditionalCharges: boolean;
  additionalChargeType: 'fixed' | 'percentage' | null;
  additionalChargeValue: number | null;
  reason: string | null;
  createdByName: string | null;
  createdAt: string | null;
  canDelete: boolean;
}

export interface DebitVersionHistory {
  defaultEffectiveFrom: string;
  lastFinalizedDay: string | null;
  versions: DebitRuleVersion[];
}

export interface AssignedEmployee {
  employeeId: number;
  name: string;
  email: string | null;
  designation: string | null;
  /** null = since the start. */
  effectiveFrom: string | null;
  /** null = ongoing. */
  effectiveTo: string | null;
}

export interface TaxDeclarations {
  section80C?: number;
  section80CCD1B?: number;
  section80D?: number;
  hra?: number;
  housingLoanInterest?: number;
  other?: number;
  /** Interest, rent from property: added to income, not deducted. */
  otherIncome?: number;
}

export interface TaxParty {
  name: string;
  pan: string;
}

export interface PreviousEmployer {
  income: number | null;
  tds: number | null;
  professionalTax: number | null;
  providentFund: number | null;
  employerName: string;
  employerTan: string;
}

export interface TaxProofs {
  section80C?: number;
  section80CCD1B?: number;
  section80D?: number;
  housingLoanInterest?: number;
  section80CCD2?: number;
  other?: number;
  hra?: number;
  rent?: number;
}

export interface TaxProfile {
  employeeId: number;
  employeeName?: string;
  financialYear: string;
  regime: 'old' | 'new';
  pan: string;
  declarations: TaxDeclarations;
  rentPaidAnnual: number | null;
  metroCity: boolean;
  previousEmployer: PreviousEmployer | null;
  landlord: TaxParty | null;
  homeLoanLender: TaxParty | null;
  /** When the employee last submitted it themselves. */
  submittedAt: string | null;
  /** null when the server did not send proofs (an employee's own view). */
  proofs: TaxProofs | null;
  proofsVerifiedAt: string | null;
  relief89: number | null;
  estimatedAnnualTax: number | null;
  monthlyTds: number | null;
}

export type AgeBand = 'default' | 'senior' | 'super_senior';

export interface TdsEstimate {
  financialYear: string;
  regime: 'old' | 'new';
  oneTimeIncome: number;
  salaryAnnual: number;
  /** Total income: salary less exempt allowances, plus earlier employer, other income and perquisites. */
  projectedAnnualGross: number;
  standardDeduction: number;
  declarationTotal: number;
  /** Per-section amounts actually allowed after this regime's statutory caps. */
  declarationsApplied: Record<string, number>;
  /** Sections declared but not claimable under this regime (e.g. 80C under new). */
  declarationsIgnored: string[];
  taxableIncome: number;
  ageBand: AgeBand;
  slabTax: number;
  rebate: number;
  rebateRelief: number;
  surchargeRate: number;
  surcharge: number;
  surchargeRelief: number;
  taxBeforeCess: number;
  cess: number;
  annualTax: number;
  /** TDS already deducted earlier in this financial year. */
  deductedBeforeCycle: number;
  monthlyTds: number;
  remainingMonths: number;
  isProvisional: boolean;
  /** Earnings exempt by their tax treatment, HRA excluded. */
  exemptAllowances: number;
  hraExemption: number;
  /** PF (employee share) and professional tax, deducted automatically under the old regime. */
  autoDeductions: { epf: number; professionalTax: number; employerNps: number };
  previousEmployerIncome: number;
  previousTds: number;
  /** Tax was raised to the 20% no-PAN rate. */
  noPanRateApplied: boolean;
  /** Verified proofs were used instead of declarations. */
  proofMode: boolean;
  perquisites: number;
  otherIncome: number;
  relief89: number;
}

export interface RegimeComparison {
  financialYear: string;
  old: TdsEstimate | null;
  new: TdsEstimate | null;
  cheaper: 'old' | 'new' | 'equal' | null;
  saving: number;
}

export interface TdsSettings {
  employerTan: string;
  employerPan: string;
  signatoryName: string;
  signatoryDesignation: string;
  place: string;
  /** Month (1-12) from which TDS uses verified proofs only; null = declarations all year. */
  proofCutoffMonth: number | null;
  /** Declaration and proof windows, 'YYYY-MM-DD' or '' for no limit. Read from the organization default. */
  declarationOpensOn: string;
  declarationClosesOn: string;
  proofOpensOn: string;
  proofClosesOn: string;
  subOrganizationId: number;
}

export interface TdsChallan {
  id: number;
  financialYear: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  bsrCode: string;
  challanSerialNo: string;
  depositDate: string;
  amount: number;
  subOrganizationId: number | null;
}

export type ChallanCompanyFilter = 'all' | number | null;

export interface Form16Release {
  financialYear: string;
  /** null = the organization-level employer. */
  subOrganizationId: number | null;
  releasedAt: string;
}

export type TaxProofSection = TaxProofSectionDto;
export type TaxProofStatus = TaxProofStatusDto;

export interface TaxProofDocument {
  id: number;
  section: TaxProofSection;
  fileName: string;
  status: TaxProofStatus;
  remarks: string;
  uploadedAt: string;
}

export interface ProofQueueEmployee {
  employeeId: number;
  code: string | null;
  name: string;
  pending: number;
  accepted: number;
  rejected: number;
}

export interface PartAEmployee {
  employeeId: number;
  code: string | null;
  name: string;
  tds: number;
  /** null = not uploaded yet. */
  partA: { fileName: string; uploadedAt: string } | null;
}

export interface Perquisite {
  id: number;
  perkType: string;
  label: string;
  description: string;
  value: number;
  recovered: number;
  taxable: number;
  subOrganizationId: number | null;
}
