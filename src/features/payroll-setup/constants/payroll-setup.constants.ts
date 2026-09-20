export const PAYROLL_TABS = [
  { value: 'components', label: 'Salary Components' },
  { value: 'debits', label: 'Deduction Rules' },
  { value: 'tds', label: 'TDS & Form 16' },
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

export type DebitConfigValue = string | number | boolean | number[];

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
    fields: ['rate', 'wageCeiling', 'applyCeiling', 'componentName'],
    defaultName: 'EPF',
    defaults: { rate: 12, wageCeiling: 15000, applyCeiling: true, componentName: 'Basic' },
  },
  {
    value: 'esi',
    label: 'ESI (ESIC)',
    description: '0.75% of gross wages, only when monthly gross is within the ₹21,000 ceiling.',
    statutary: true,
    fields: ['rate', 'eligibilityCeiling'],
    defaultName: 'ESIC',
    defaults: { rate: 0.75, eligibilityCeiling: 21000 },
  },
  {
    value: 'professional_tax',
    label: 'Professional Tax (PT)',
    description: 'State-wise monthly slab (max ₹2,500/year).',
    statutary: true,
    fields: ['state', 'monthlyAmount', 'februaryAmount'],
    defaultName: 'Professional Tax',
    defaults: { state: 'Maharashtra', monthlyAmount: 200, februaryAmount: 200 },
  },
  {
    value: 'lwf',
    label: 'Labour Welfare Fund (LWF)',
    description: 'Small periodic statutory contribution.',
    statutary: true,
    fields: ['amount', 'frequency', 'months'],
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

export type DebitCategory = DebitCategoryMeta['value'];

export const DEBIT_CATEGORY_OPTIONS = DEBIT_CATEGORIES.map(({ value, label }) => ({ value, label }));

export const LWF_FREQ_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'half-yearly', label: 'Half-yearly' },
  { value: 'annual', label: 'Annual' },
] as const;

export type ComponentFieldName = 'component_name' | 'component_type' | 'display_order' | 'status';

export type DebitFieldName =
  | 'debit_name'
  | 'fixed_amount'
  | 'percentage_value'
  | 'reference_amount'
  | 'breakdown_item_id'
  | 'max_cap_amount'
  | 'additional_charge_value'
  | 'config';

export type TaxProfileFieldName = 'pan' | 'financial_year' | 'estimated_annual_tax' | 'declarations';
export type ChallanFieldName = 'amount' | 'quarter' | 'financial_year' | 'deposit_date';

export function currentFinancialYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const start = now.getMonth() + 1 >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export const FORM16_PREVIEW_LIMIT = 25;
