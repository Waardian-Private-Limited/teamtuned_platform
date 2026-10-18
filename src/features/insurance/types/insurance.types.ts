/** Shapes of `/insurance` responses and bodies, as the API sends them. */

export type PlanType = 'health' | 'life' | 'accident' | 'other';
export type RecoveryMode = 'none' | 'monthly' | 'one_time' | 'installments';
export type CoverStatus = 'active' | 'ending_soon' | 'expired' | 'ended';
export type Relation = 'spouse' | 'child' | 'parent' | 'parent_in_law' | 'sibling' | 'other';
export type MemberRole = 'dependent' | 'nominee';

export interface PlanCovers {
  spouse: boolean;
  children: boolean;
  maxChildren: number;
  parents: boolean;
  parentsInLaw: boolean;
}

export interface PlanPremium {
  basis: 'per_employee' | 'per_member';
  amount: number;
  employer: { type: 'percent' | 'fixed'; value: number };
}

export interface PlanRecovery {
  mode: RecoveryMode;
  installments: number;
  calendarMonths: number[];
  recoverOnExit: boolean;
}

export interface Plan {
  id: number;
  sub_organization_id: number | null;
  name: string;
  type: PlanType;
  insurer: string;
  policy_number: string | null;
  tpa: string | null;
  start_date: string;
  end_date: string;
  status: 'active' | 'archived';
  sum_insured: number;
  covers: PlanCovers;
  premium: PlanPremium;
  recovery: PlanRecovery;
  has_document: boolean;
  document_name: string | null;
  renewed_from_id: number | null;
  notes: string | null;
  employees: number;
  premium_employee: number;
  premium_employer: number;
}

export interface PlanBody {
  name: string;
  type: PlanType;
  insurer: string;
  policy_number: string;
  tpa: string;
  start_date: string;
  end_date: string;
  sum_insured: number | '';
  covers: PlanCovers;
  premium: PlanPremium;
  recovery: PlanRecovery;
  notes: string;
  sub_organization_id?: number | null;
}

export interface Member {
  id?: number;
  role: MemberRole;
  name: string;
  relation: Relation;
  dob: string | null;
  gender: 'male' | 'female' | 'other' | null;
  member_no: string | null;
  nominee_share: number | null;
}

export interface Due {
  id: number;
  month_key: string;
  amount: number;
  status: 'scheduled' | 'deducted' | 'cancelled';
}

export interface Enrollment {
  id: number;
  plan: { id: number; name: string; type: PlanType; insurer: string; policy_number: string | null; tpa: string | null; has_document: boolean; covers: PlanCovers };
  employee: { id: number; code: string; name: string; department: string | null; sub_organization_id: number | null; exit_date: string | null };
  start_date: string;
  end_date: string;
  status: CoverStatus;
  sum_insured: number;
  annual_premium: number;
  employer_share: number;
  employee_share: number;
  recovery: { mode: RecoveryMode; months: number; recover_on_exit: boolean };
  member_no: string | null;
  has_card: boolean;
  card_name: string | null;
  ended_reason: string | null;
  dependents: Member[];
  nominees: Member[];
  dues?: Due[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Summary {
  active_plans: number;
  covered_employees: number;
  dependents: number;
  uncovered_employees: number;
  ending_soon: number;
  premium_employer: number;
  premium_employee: number;
  plans_ending_soon: Array<{ id: number; name: string; end_date: string; employees: number }>;
}

export interface Preview {
  annual_premium: number;
  full_premium: number;
  employer_share: number;
  employee_share: number;
  lives: number;
  schedule: Array<{ month_key: string; amount: number }>;
  recovery: PlanRecovery;
}

export interface EnrollBody {
  plan_id: number;
  employee_ids: number[];
  start_date?: string;
  member_no?: string;
  members?: Member[];
}

export interface EnrollResult {
  created: number;
  ids: number[];
  skipped: Array<{ employee_id: number; reason: string }>;
}

export interface FileLink {
  url: string;
  name: string;
  expires_in: number;
}

export interface CoverFilters {
  planId: number | null;
  status: CoverStatus | 'all';
  search: string;
  subOrgId: number | null;
}
