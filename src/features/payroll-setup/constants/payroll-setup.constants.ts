import type { DebitConfigValue, TaxProofSection, TaxTreatment } from '../types/payroll-setup.model';
import { orgToday } from '@/lib/datetime';

export const PAYROLL_TABS = [
  { value: 'components', label: 'Salary Components' },
  { value: 'debits', label: 'Deduction Rules' },
] as const;

export type PayrollTab = (typeof PAYROLL_TABS)[number]['value'];

export const COMPONENT_TYPES = [
  { value: 'credit', label: 'Earning' },
  { value: 'debit', label: 'Deduction' },
] as const;

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]['value'];

export const SEARCH_DEBOUNCE_MS = 500;
export const DEFAULT_PAGE_SIZE = 10;

export const COMPONENT_PERMISSIONS = {
  VIEW: 'SALARY_CONFIG_VIEW',
  ADD: 'SALARY_CONFIG_ADD',
  EDIT: 'SALARY_CONFIG_EDIT',
  DELETE: 'SALARY_CONFIG_DELETE',
} as const;

export const DEBIT_PERMISSIONS = {
  VIEW: 'DEBIT_RULE_VIEW',
  ADD: 'DEBIT_RULE_ADD',
  EDIT: 'DEBIT_RULE_EDIT',
  DELETE: 'DEBIT_RULE_DELETE',
} as const;

export type { DebitConfigValue };

export interface DebitCategoryMeta {
  value: string;
  label: string;
  description: string;
  statutary: boolean;
  fields: string[];
  /** Pre-filled rule name when this category is picked. Always editable. */
  defaultName: string;
  /** Pre-filled statutory settings. Mirrors the backend StatutoryPresets defaults. */
  defaults: Record<string, DebitConfigValue>;
}

export const DEBIT_CATEGORIES: DebitCategoryMeta[] = [
  {
    value: 'epf',
    label: 'Provident Fund (EPF)',
    description: '12% of Basic wages, capped at the ₹15,000 wage ceiling.',
    statutary: true,
    fields: ['rate', 'employerRate', 'employerInCtc', 'wageCeiling', 'applyCeiling', 'componentName'],
    defaultName: 'EPF',
    defaults: { rate: 12, employerRate: 12, employerInCtc: true, wageCeiling: 15000, applyCeiling: true, componentName: 'Basic' },
  },
  {
    value: 'esi',
    label: 'ESI (ESIC)',
    description: '0.75% of gross wages, only when monthly gross is within the ₹21,000 ceiling.',
    statutary: true,
    fields: ['rate', 'employerRate', 'employerInCtc', 'eligibilityCeiling'],
    defaultName: 'ESIC',
    defaults: { rate: 0.75, employerRate: 3.25, employerInCtc: true, eligibilityCeiling: 21000 },
  },
  {
    value: 'professional_tax',
    label: 'Professional Tax (PT)',
    description: 'State-wise slabs on monthly gross, with one special month (max ₹2,500/year).',
    statutary: true,
    fields: ['state', 'specialMonth', 'slabs'],
    defaultName: 'Professional Tax',
    defaults: {
      state: 'Maharashtra',
      specialMonth: 2,
      slabs: [
        { gender: 'all', minGross: 0, amount: 0, specialAmount: null },
        { gender: 'all', minGross: 7501, amount: 175, specialAmount: null },
        { gender: 'all', minGross: 10001, amount: 200, specialAmount: 300 },
        { gender: 'female', minGross: 0, amount: 0, specialAmount: null },
        { gender: 'female', minGross: 25001, amount: 200, specialAmount: 300 },
      ],
    },
  },
  {
    value: 'lwf',
    label: 'Labour Welfare Fund (LWF)',
    description: 'Small periodic statutory contribution.',
    statutary: true,
    fields: ['state', 'amount', 'frequency', 'months'],
    defaultName: 'Labour Welfare Fund',
    defaults: { amount: 12, frequency: 'monthly', months: [6, 12] },
  },
  {
    value: 'tds',
    label: 'TDS (Income Tax)',
    description: 'Income tax on salary per employee tax regime, projected income and declarations.',
    statutary: true,
    fields: [],
    defaultName: 'TDS',
    defaults: {},
  },
  {
    value: 'insurance',
    label: 'Employee Insurance',
    description: 'Group insurance premium share.',
    statutary: false,
    fields: [],
    defaultName: 'Insurance Premium',
    defaults: {},
  },
  {
    value: 'mediclaim',
    label: 'Mediclaim',
    description: 'Health cover contribution.',
    statutary: false,
    fields: [],
    defaultName: 'Mediclaim',
    defaults: {},
  },
  {
    value: 'canteen',
    label: 'Meal / Canteen',
    description: 'Canteen or meal subscription deduction.',
    statutary: false,
    fields: [],
    defaultName: 'Canteen Deduction',
    defaults: {},
  },
  {
    value: 'transport',
    label: 'Transport',
    description: 'Company transport deduction.',
    statutary: false,
    fields: [],
    defaultName: 'Transport Deduction',
    defaults: {},
  },
  {
    value: 'accommodation',
    label: 'Accommodation',
    description: 'Housing or hostel deduction.',
    statutary: false,
    fields: [],
    defaultName: 'Accommodation Deduction',
    defaults: {},
  },
  {
    value: 'custom',
    label: 'Custom Deduction',
    description: 'Any other deduction — fixed amount or a percentage of a salary reference.',
    statutary: false,
    fields: [],
    defaultName: '',
    defaults: {},
  },
];

/** Months an LWF contribution is due in, when the admin picks a non-monthly frequency. */
export const LWF_FREQUENCY_MONTHS: Record<string, number[]> = {
  'half-yearly': [6, 12],
  annual: [12],
};

/**
 * States and union territories for PT and LWF rules. Same list and spelling as the server
 * (teamtuned_backend/src/shared/constants/IndianStates.js), which payroll matches against
 * each employee's work state.
 */
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export type DebitCategory = DebitCategoryMeta['value'];

export const DEBIT_CATEGORY_OPTIONS = DEBIT_CATEGORIES.map(({ value, label }) => ({ value, label }));

export const LWF_FREQ_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'half-yearly', label: 'Half-yearly' },
  { value: 'annual', label: 'Annual' },
] as const;

export const COMPONENT_FIELD_NAMES = [
  'component_name',
  'component_type',
  'display_order',
  'status',
  'percentage_value',
  'tax_treatment',
] as const;

export type ComponentFieldName = (typeof COMPONENT_FIELD_NAMES)[number];

export const DEBIT_FIELD_NAMES = [
  'debit_name',
  'category',
  'fixed_amount',
  'percentage_value',
  'reference_amount',
  'breakdown_item_id',
  'max_cap_amount',
  'additional_charge_value',
  'applicable_months',
  'one_time_month',
  'config',
  'effective_from',
  'change_reason',
] as const;

export type DebitFieldName = (typeof DEBIT_FIELD_NAMES)[number];

/** How an earning is taxed. Only earnings carry this; deductions are always 'taxable'. */
export const TAX_TREATMENT_OPTIONS: { value: TaxTreatment; label: string; short: string }[] = [
  { value: 'taxable', label: 'Taxable', short: 'Taxable' },
  { value: 'hra', label: 'House rent allowance — exempt by rent in old regime', short: 'HRA' },
  { value: 'exempt_old', label: 'Exempt in old regime only', short: 'Exempt (old)' },
  { value: 'exempt_both', label: 'Exempt in both regimes', short: 'Exempt' },
  { value: 'employer_nps', label: 'Employer NPS — taxable, deducted under 80CCD(2) in both regimes', short: 'Employer NPS' },
];

/** What a percentage deduction is taken of. 'after_deduction' is a legacy alias of 'net'. */
export const REFERENCE_AMOUNT_OPTIONS = [
  { value: 'before_deduction', label: 'Gross earnings' },
  { value: 'net', label: 'Net pay (after statutory deductions)' },
  { value: 'breakdown_item', label: 'A salary component' },
] as const;

export const CHANGE_REASON_MAX = 300;

/** Financial-year order, April first, for month pickers. */
export const FY_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3] as const;

export type TaxProfileFieldName =
  | 'pan'
  | 'regime'
  | 'financial_year'
  | 'estimated_annual_tax'
  | 'declarations'
  | 'rent_paid_annual'
  | 'previous_employer'
  | 'landlord'
  | 'home_loan_lender'
  | 'relief_89'
  | 'proofs';
export type ChallanFieldName = 'amount' | 'quarter' | 'financial_year' | 'deposit_date';

export function currentFinancialYear(): string {
  const today = orgToday();
  const y = Number(today.slice(0, 4));
  const start = Number(today.slice(5, 7)) >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export const FORM16_PREVIEW_LIMIT = 25;

/** What a Form 12BB proof file is for, in the words employees and HR both see. */
export const PROOF_SECTION_LABELS: Record<TaxProofSection, string> = {
  rent: 'House rent',
  section80C: 'Section 80C',
  section80CCD1B: 'Own NPS — 80CCD(1B)',
  section80D: 'Health insurance — 80D',
  housingLoanInterest: 'Home loan interest',
  other: 'Other deductions',
  previousEmployer: 'Previous employer',
};

export const PROOF_SECTION_ORDER: TaxProofSection[] = [
  'rent', 'section80C', 'section80CCD1B', 'section80D', 'housingLoanInterest', 'other', 'previousEmployer',
];
