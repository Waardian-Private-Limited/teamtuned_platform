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
  calculationType: 'flat' | 'percentage';
  percentageValue: number | null;
  percentageBasis: 'basic' | 'gross' | 'component' | null;
  basisComponentId: number | null;
}

export interface ComponentFormInput {
  name: string;
  type: ComponentType;
  description: string;
  displayOrder: string;
  status: Status;
  calculationType: 'flat' | 'percentage';
  percentageValue: string;
  percentageBasis: 'basic' | 'gross' | 'component';
  basisComponentId: number | null;
}

export interface DebitRule {
  id: number;
  name: string;
  description: string | null;
  status: Status;
  category: string;
  isStatutory: boolean;
  frequency: 'monthly' | 'selected_months' | 'one_time';
  applicableMonths: number[] | null;
  oneTimeMonth: string | null;
  config: Record<string, unknown> | null;
  debitType: 'fixed' | 'percentage';
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
  frequency: 'monthly' | 'selected_months' | 'one_time';
  applicableMonths: number[];
  oneTimeMonth: string;
  debitType: 'fixed' | 'percentage';
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
  config: Record<string, string | number | boolean | number[]>;
  status: Status;
}

export interface AssignedEmployee {
  employeeId: number;
  name: string;
  email: string | null;
  designation: string | null;
}

export interface TaxDeclarations {
  section80C?: number;
  section80D?: number;
  hra?: number;
  housingLoanInterest?: number;
  other?: number;
}

export interface TaxProfile {
  employeeId: number;
  employeeName?: string;
  financialYear: string;
  regime: 'old' | 'new';
  pan: string;
  declarations: TaxDeclarations;
  estimatedAnnualTax: number | null;
  monthlyTds: number | null;
}

export type AgeBand = 'default' | 'senior' | 'super_senior';

export interface TdsEstimate {
  financialYear: string;
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
}

export interface TdsChallan {
  id: number;
  financialYear: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  bsrCode: string;
  challanSerialNo: string;
  depositDate: string;
  amount: number;
}
