import type {
  PreviousEmployer,
  RegimeComparison,
  TaxParty,
  TaxProofs,
  TdsEstimate,
} from '@/features/payroll-setup/types/payroll-setup.model';

export type { RegimeComparison, TdsEstimate };

export type Regime = 'old' | 'new';

/** Amount fields on the form, keyed as the server's declarations are. */
export type AmountKey = 'section80C' | 'section80CCD1B' | 'section80D' | 'housingLoanInterest' | 'other' | 'otherIncome';

export type PreviousKey = 'income' | 'tds' | 'professionalTax' | 'providentFund' | 'employerName' | 'employerTan';

export interface Form16Entry {
  key: string;
  financialYear: string;
  /** null = the organization itself. */
  company: number | null;
  companyName: string;
  releasedAt: string;
}

export interface MyTaxProfile {
  regime: Regime;
  pan: string;
  declarations: Partial<Record<AmountKey | 'section80CCD2' | 'hra', number>>;
  rentPaidAnnual: number | null;
  metroCity: boolean;
  landlord: TaxParty | null;
  homeLoanLender: TaxParty | null;
  previousEmployer: PreviousEmployer | null;
  /** HR-verified amounts, by declaration key plus `rent`. */
  proofs: TaxProofs | null;
  proofsVerifiedAt: string | null;
  submittedAt: string | null;
}

export interface TaxWindow {
  open: boolean;
  opensOn: string | null;
  closesOn: string | null;
}

export interface MyPerquisite {
  label: string;
  description: string;
  taxable: number;
}

export interface MyTax {
  eligible: boolean;
  financialYear: string;
  form16: Form16Entry[];
  profile: MyTaxProfile | null;
  estimate: TdsEstimate | null;
  comparison: RegimeComparison | null;
  estimateError: string | null;
  regimeLocked: boolean;
  /** False until payroll assigns the TDS rule: the declaration is kept, nothing is deducted yet. */
  tdsAssigned: boolean;
  tdsDeducted: number;
  joinedThisYear: boolean;
  windows: { declaration: TaxWindow; proof: TaxWindow };
  perquisites: MyPerquisite[];
}

/** What the employee is editing: every input as typed. */
export interface TaxForm {
  regime: Regime;
  pan: string;
  amounts: Record<AmountKey, string>;
  rent: string;
  metroCity: boolean;
  landlordName: string;
  landlordPan: string;
  lenderName: string;
  lenderPan: string;
  previous: Record<PreviousKey, string>;
}

/** Form keys a message can sit under. */
export type TaxFieldName = 'regime' | 'pan' | 'declarations' | 'rent' | 'landlord' | 'home_loan_lender' | 'previous_employer' | AmountKey;
