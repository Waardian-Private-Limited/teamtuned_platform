import type { CoverStatus, PlanBody, PlanType, Relation } from '../types/insurance.types';

export const INSURANCE_FEATURE = 'INSURANCE_FEATURE';

export const INSURANCE_PERMISSIONS = {
  VIEW: 'INS_VIEW',
  PLANS: 'INS_MANAGE_PLANS',
  ENROLL: 'INS_MANAGE_ENROLLMENTS',
} as const;

export const INSURANCE_ACCESS = [INSURANCE_PERMISSIONS.VIEW, INSURANCE_PERMISSIONS.PLANS, INSURANCE_PERMISSIONS.ENROLL];

export const ILLUSTRATIONS = {
  health: { src: '/vectors/health.svg', width: 1105, height: 783, alt: 'Health cover illustration' },
};

export const TYPE_LABEL: Record<PlanType, string> = { health: 'Health', life: 'Life', accident: 'Accident', other: 'Other' };

export const TYPE_OPTIONS = (Object.keys(TYPE_LABEL) as PlanType[]).map((value) => ({ value, label: TYPE_LABEL[value] }));

export const RELATION_LABEL: Record<Relation, string> = {
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  parent_in_law: 'Parent-in-law',
  sibling: 'Sibling',
  other: 'Other',
};

export const STATUS_LABEL: Record<CoverStatus, string> = { active: 'Active', ending_soon: 'Ending soon', expired: 'Expired', ended: 'Ended' };

export const STATUS_TABS: ReadonlyArray<{ value: CoverStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'ending_soon', label: 'Ending soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'ended', label: 'Ended' },
];

export const RECOVERY_OPTIONS = [
  { value: 'none', label: 'Company pays all', description: 'Nothing is deducted from salary' },
  { value: 'monthly', label: 'Monthly', description: 'Spread over every month of the plan year' },
  { value: 'installments', label: 'Installments', description: 'A fixed number of months' },
  { value: 'one_time', label: 'One time', description: 'All in the first payroll' },
] as const;

export const MAX_INSTALLMENTS = 24;
export const PAGE_SIZE = 25;
export const SEARCH_DEBOUNCE_MS = 300;

export const EMPTY_PLAN: PlanBody = {
  name: '',
  type: 'health',
  insurer: '',
  policy_number: '',
  tpa: '',
  start_date: '',
  end_date: '',
  sum_insured: '',
  covers: { spouse: true, children: true, maxChildren: 2, parents: false, parentsInLaw: false },
  premium: { basis: 'per_employee', amount: 0, employer: { type: 'percent', value: 100 } },
  recovery: { mode: 'none', installments: 1, calendarMonths: [], recoverOnExit: true },
  notes: '',
  sub_organization_id: null,
};
