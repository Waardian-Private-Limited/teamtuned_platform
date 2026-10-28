/** Wire shapes of the exit module (contract sections 1 and 5). Dates are YYYY-MM-DD, money is in rupees. */

export type ExitType = 'resignation' | 'termination' | 'contract_end' | 'retirement' | 'absconding' | 'mutual' | 'death';
export type ExitInitiator = 'employee' | 'hr';
export type ExitStatus =
  | 'submitted' | 'retention' | 'accepted' | 'serving_notice' | 'clearance' | 'settlement'
  | 'exited' | 'retained' | 'rejected' | 'withdrawn';
export type ReasonCategory =
  | 'better_opportunity' | 'compensation' | 'career_growth' | 'manager' | 'work_culture' | 'relocation' | 'higher_studies'
  | 'health' | 'personal' | 'contract_end' | 'performance' | 'misconduct' | 'absconding' | 'retirement' | 'death' | 'other';
export type ShortfallAction = 'recover' | 'waive' | 'buyout_by_employee';
export type RehireEligibility = 'yes' | 'no' | 'conditional';
export type OfferKind = 'hike' | 'retention_bonus' | 'hike_and_bonus' | 'role_change' | 'other';
export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'withdrawn';
export type HikeMode = 'percent' | 'ctc' | 'gross';

export interface ExitOffer {
  id: number;
  kind: OfferKind;
  status: OfferStatus;
  hike: { mode: HikeMode; value: number; effective_from: string; previous_ctc: number | null; new_ctc: number | null; percent_change: number | null } | null;
  bonus: { amount: number; month: string; clawback_months: number } | null;
  salary_revision_id: number | null;
  payout_id: number | null;
  expires_at: string | null;
  responded_at: string | null;
  note: string | null;
}

export interface ExitCase {
  id: number;
  employee_id: number;
  type: ExitType;
  initiated_by: ExitInitiator;
  status: ExitStatus;
  reason_category: ReasonCategory | null;
  reason_text: string | null;
  resigned_on: string | null;
  notice_days: number | null;
  notice_end: string | null;
  requested_lwd: string | null;
  agreed_lwd: string | null;
  shortfall_days: number | null;
  shortfall_action: ShortfallAction | null;
  regrettable: boolean | null;
  rehire_eligibility: RehireEligibility | null;
  rehire_note: string | null;
  withdraw_requested: boolean;
  approval_request_id: number | null;
  approval: { requestId: number; status: string } | null;
  offers: ExitOffer[];
  created_at: string;
  updated_at: string;
  exited_at: string | null;
}

export interface ExitEmployee {
  id: number;
  code: string | null;
  name: string;
  department: string | null;
  designation: string | null;
  avatar?: string | null;
}

export interface ExitCaseSummary extends ExitCase {
  employee: ExitEmployee;
  /** Phase 2 list chips, present once the case reaches clearance. */
  clearance_pending?: number | null;
  clearance_total?: number | null;
  settlement_status?: SettlementStatus | null;
  settlement_overdue?: boolean;
}

export interface ExitDocument {
  id: number;
  doc_type: ExitDocType;
  label: string;
  reference: string | null;
  generated_at: string;
  generated_by: string | null;
  size_bytes: number | null;
}

export type ExitDocType = 'resignation_acceptance' | 'relieving_letter' | 'experience_letter' | 'noc' | 'fnf_statement';

export interface ExitCaseDetail extends ExitCase {
  employee: ExitEmployee;
  documents: ExitDocument[];
  can?: { manage?: boolean };
  /** Phase 2. Absent until the case reaches clearance. */
  clearance?: ClearanceItem[] | null;
  settlement?: ExitSettlement | null;
  /** Phase 3. Answers, already filtered by the server for hide_from_manager. */
  interview?: InterviewResponse | null;
}

export interface ExitTimelineEvent { at: string; actor: string | null; kind: string; detail: string | null }

export interface ExitList {
  items: ExitCaseSummary[];
  total: number;
  counts: { submitted: number; retention: number; serving_notice: number; clearance: number; settlement: number; exited: number };
}

export interface MyExit { case: ExitCase | null; eligible: boolean; blocked_reason: string | null; notice_days: number }

export interface ExitPreview {
  notice_days: number;
  resigned_on: string;
  notice_end: string;
  requested_lwd: string;
  shortfall_days: number;
  leave_balance_days: number;
  advance_outstanding: number;
  warnings: string[];
}

export interface HikeInput { mode: HikeMode; value: number; effective_from: string }
export interface OfferInput {
  kind: OfferKind;
  hike?: HikeInput;
  bonus?: { amount: number; month: string; clawback_months: number };
  note?: string;
  expires_at: string;
}

/** The compensation preview the offer builder reuses (same shape as a salary revision preview). */
export interface HikePreview {
  previous_ctc: number | null;
  new_ctc: number | null;
  previous_gross: number | null;
  new_gross: number | null;
  change_percent: number | null;
}

export interface StartExitInput {
  employee_id: number;
  type: ExitType;
  reason_category: ReasonCategory;
  reason_text?: string;
  last_working_day: string;
  notice_waived?: boolean;
}

export interface PublicExitDocuments {
  employee_name: string;
  org_name: string;
  documents: { id: number; label: string; doc_type: string; generated_at: string }[];
}

// Phase 2: clearance and settlement (contract section 7)
export type ClearanceOwnerType = 'role' | 'permission' | 'manager' | 'employee';
export type ClearanceStatus = 'pending' | 'cleared' | 'waived';

export interface ClearanceTemplate {
  id: number;
  name: string;
  owner_type: ClearanceOwnerType;
  owner_ref: string | null;
  order: number;
  active: boolean;
  sub_organization_id?: number | null;
}
export interface ClearanceTemplateInput { name: string; owner_type: ClearanceOwnerType; owner_ref?: string | null; order?: number; active?: boolean }

export interface ClearanceItem {
  id: number;
  case_id: number;
  template_id: number | null;
  title: string;
  owner_type: ClearanceOwnerType;
  owner_ref: string | null;
  owner_label?: string | null;
  status: ClearanceStatus;
  recovery_amount: number | null;
  auto?: boolean;
  note: string | null;
  cleared_by: string | null;
  cleared_at: string | null;
  can_act?: boolean;
}

export type SettlementStatus = 'draft' | 'pending_approval' | 'approved' | 'paid';
export type PayMode = 'next_run' | 'off_cycle';
export interface SettlementLine {
  id: number;
  code: string;
  label: string;
  kind: 'earning' | 'deduction';
  amount: number;
  source: string | null;
  override_reason?: string | null;
  computed_amount?: number | null;
  calculation?: Record<string, unknown> | null;
}
export interface ExitSettlement {
  id: number;
  case_id: number;
  status: SettlementStatus;
  total_earnings: number;
  total_deductions: number;
  net_payable: number;
  due_on: string | null;
  paid_on: string | null;
  overdue?: boolean;
  payroll_run_id: number | null;
  pay_mode: PayMode | null;
  lines: SettlementLine[];
  approval?: { requestId: number; status: string } | null;
}

// Phase 3: exit interview, insights, career and rehire (contract sections 8 and 9)
export type QuestionType = 'text' | 'rating' | 'choice' | 'yes_no';
export interface InterviewQuestion { id: string; label: string; type: QuestionType; required?: boolean; options?: (string | { value: string; label: string })[] }
export interface InterviewForm { questions: InterviewQuestion[] }
export interface InterviewResponse {
  answers: Record<string, string | number | boolean | null>;
  hide_from_manager: boolean;
  submitted_at?: string | null;
  /** Form questions, when the server includes them with the answers. */
  questions?: InterviewQuestion[];
  /** Set by the server when the viewer may not see the answers. */
  hidden?: boolean;
}
export interface MyInterview { form: InterviewForm; response: InterviewResponse | null }

export interface InsightCount { key: string; label?: string; count: number }
export interface ExitInsights {
  totals: { exits: number; voluntary: number; involuntary: number; regrettable: number; boomerangs: number; notice_buyout_total: number };
  by_reason: InsightCount[];
  by_tenure_band: InsightCount[];
  by_department: InsightCount[];
  by_manager: InsightCount[];
  retention: { offers: number; accepted: number; success_rate: number | null; cost: number };
  monthly: { month: string; voluntary: number; involuntary: number }[];
}

export interface CareerStint {
  employee_id: number;
  employee_code: string | null;
  joined_on: string | null;
  left_on: string | null;
  status: string;
  exit_type: ExitType | null;
  exit_reason: string | null;
  rehire_eligibility: RehireEligibility | null;
  current?: boolean;
  jobHistory?: { event_type?: string; effective_on?: string; designation?: string | null; department?: string | null; summary?: string | null }[];
  job_history?: { event_type?: string; effective_on?: string; designation?: string | null; department?: string | null; summary?: string | null }[];
  salary?: { first_ctc: number | null; last_ctc: number | null; revisions: number | null } | null;
  salary_summary?: { first_ctc: number | null; last_ctc: number | null; revisions: number | null } | null;
}

export interface RehireInput {
  joining_date: string;
  employee_code?: string;
  employment_type_id: number;
  count_past_service?: boolean;
  override_reason?: string;
  salary: { ctc: number };
}
