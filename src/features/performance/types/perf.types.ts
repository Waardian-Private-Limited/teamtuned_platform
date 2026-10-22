export type Status = 'active' | 'archived';
export type StatusFilter = 'active' | 'archived';

export type Unit = 'number' | 'percent' | 'currency' | 'duration_minutes' | 'count' | 'yes_no' | 'rating';
export type Direction = 'higher_better' | 'lower_better' | 'binary';
export type Aggregation = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'last';
export type ScoringMethod = 'linear' | 'range' | 'binary' | 'slab' | 'threshold';
export type EntryBy = 'self' | 'manager' | 'hr';
export type GoalMode = 'manager_sets' | 'employee_proposes' | 'both';
export type Source = 'manual' | 'import' | 'data_collection' | 'tasks' | 'attendance' | 'leave' | 'recruitment' | 'formula';
export type Section = 'kpi' | 'competency' | 'feedback';

export interface Paged<T> { items: T[]; total: number; page?: number; pageSize?: number }

interface Owned { id: number; sub_organization_id: number | null; status: Status }

export interface Kra extends Owned { name: string; description: string | null; category: string | null }
export interface Competency extends Owned { name: string; group_name: string | null; description: string | null; levels: { level: number; descriptor: string }[] }
export interface Band { code: string; label: string; min: number; max: number; color?: string | null }
export interface Scale extends Owned { code: string; name: string; bands: Band[]; is_default: boolean }

export interface Slab { from: number; to: number | null; score: number }
export interface ScoringConfig { cap?: number; threshold?: number; min?: number | null; max?: number | null; basis?: 'achievement' | 'actual'; slabs?: Slab[] }
export interface SourceConfig { measure?: string; form_id?: number; field_key?: string; expression?: string; refs?: Record<string, number>; priorities?: string[]; labels?: string[]; linked_only?: boolean }

export interface Kpi extends Owned {
  kra_id: number | null; name: string; description: string | null; unit: Unit; direction: Direction; aggregation: Aggregation;
  source: Source; source_config: SourceConfig; scoring_method: ScoringMethod; scoring_config: ScoringConfig;
  default_target: number | string | null; evidence_required: boolean; entry_by: EntryBy;
}

export interface TemplateItem {
  id?: number; item_type: 'kpi' | 'competency'; kpi_id: number | null; competency_id: number | null; weight: number; target: number | null; period_targets?: number[] | null;
  kpi_name?: string | null; competency_name?: string | null; kra_name?: string | null; kpi_unit?: Unit | null;
}
export interface Template extends Owned {
  name: string; description: string | null; section_weights: Partial<Record<Section, number>>; rating_scale_id: number | null; goal_mode: GoalMode;
  min_goals: number | null; max_goals: number | null; allow_custom_goals: boolean; item_count?: number; items?: TemplateItem[];
}

export type Dimensions = Partial<Record<'site_ids' | 'department_ids' | 'role_ids' | 'grade_ids' | 'employment_type_ids' | 'cost_centre_ids' | 'employee_ids', number[]>>;
export interface Rule extends Owned { template_id: number; template_name?: string | null; dimensions: Dimensions; priority: number }

export interface Named { id: number; name: string; code?: string }
export interface RuleOptions { sites: Named[]; departments: Named[]; roles: Named[]; grades: Named[]; employment_types: Named[]; cost_centres: Named[] }
export interface PersonOption { id: number; name: string; employee_code?: string }

export interface Meta {
  units: Unit[]; directions: Direction[]; aggregations: Aggregation[]; scoring_methods: ScoringMethod[]; entry_by: EntryBy[]; goal_modes: GoalMode[]; sections: Section[];
  sources: Record<Source, { measures: string[] | null }>; settings_defaults: Settings; can_configure: boolean;
}
export interface MetricOption { form_id: number; form_name: string; field_key: string; label: string; unit: string; agg: string }

export interface Settings {
  goal_setting: { employee_can_propose: boolean; require_goal_approval: boolean };
  reviews: { self_review: boolean; rating_visible_to_employee: 'after_release' | 'never'; require_acknowledgement: boolean; require_review_approval: boolean; dispute_window_days: number };
  scoring: { missing_actuals: 'skip' | 'zero'; allow_manager_override: boolean };
  sources: { enabled: Source[] };
  calibration: { distribution: { code: string; percent: number }[]; tolerance: number; enforce: boolean; min_group_size: number };
  pip: { require_approval: boolean; trigger_bands: string[]; default_days: number };
  feedback: { employee_nominates: boolean; anonymous: boolean; min_responses: number; max_reviewers: number; questions: string[]; allow_external: boolean; external_days: number };
}
export interface SettingsResult { sub_organization_id: number | null; saved: Partial<Settings>; effective: Settings }

export interface PresetMeta { key: string; name: string; description: string; kras: number; kpis: number; competencies: number }
export interface PresetResult { template_id: number; created: Record<string, number>; reused: Record<string, number> }

// ---- cycles and goal sheets ----

export type CycleStatus = 'draft' | 'goal_setting' | 'in_progress' | 'review' | 'calibration' | 'released' | 'closed';
export type CycleType = 'annual' | 'half_yearly' | 'quarterly' | 'monthly' | 'custom';
export type CheckIn = 'none' | 'monthly' | 'quarterly' | 'half_yearly' | 'custom';
export type ScoreBasis = 'whole_cycle' | 'average' | 'weighted' | 'last';
export type SheetStatus = 'draft' | 'submitted' | 'approved' | 'revision_requested';

export interface Eligibility {
  employment_type_ids?: number[]; department_ids?: number[]; site_ids?: number[]; role_ids?: number[]; grade_ids?: number[]; min_tenure_days?: number; joined_before?: string;
}
export interface SheetCounts { total: number; draft: number; submitted: number; approved: number; revision_requested: number }
export interface CyclePeriod { id: number; seq: number; label: string; period_start: string; period_end: string; weight?: number | null; closed_at?: string | null }
/** A break as typed in the cycle form (no id until saved). */
export interface BreakDraft { label: string; period_start: string; period_end: string; weight: number | null }
export interface Cycle {
  id: number; sub_organization_id: number | null; name: string; cycle_type: CycleType; period_start: string; period_end: string; check_in: CheckIn; score_basis: ScoreBasis; template_id: number | null;
  eligibility: Eligibility; status: CycleStatus; sheet_count?: number; approved_count?: number; periods?: CyclePeriod[]; sheets?: SheetCounts; template_name?: string | null;
}
export interface GenerateResult { eligible: number; created: number; already_had_sheet: number; without_template: { id: number; name: string }[] }

export interface SheetRow {
  id: number; cycle_id: number; cycle_name: string; cycle_status: CycleStatus; employee_id: number; employee_name: string; employee_code: string | null;
  reviewer_employee_id: number | null; reviewer_name: string | null; template_name: string | null; status: SheetStatus; period_start: string; period_end: string;
}
export interface GoalItem {
  id: number; item_type: 'kpi' | 'competency'; origin: 'template' | 'manager' | 'employee'; kpi_id: number | null; competency_id: number | null; name: string; kra_name: string | null;
  description: string | null; unit: Unit | null; direction: Direction | null; aggregation: Aggregation | null; source: Source | null; weight: number; target: number | null;
  period_targets: (number | null)[] | null;
  levels: { level: number; descriptor: string }[] | null;
}
export interface Sheet extends SheetRow {
  section_weights: Partial<Record<Section, number>>; goal_mode: GoalMode; min_goals: number | null; max_goals: number | null; allow_custom_goals: boolean; decision_note: string | null;
  items: GoalItem[]; periods: CyclePeriod[]; needs_approval: boolean; ready: { items?: string };
  permissions: { can_edit: boolean; can_submit: boolean; can_add_custom: boolean; can_withdraw: boolean; can_change_reviewer: boolean; is_manager: boolean };
}
export interface SheetOptions {
  kpis: { id: number; name: string; unit: Unit; kra_name: string | null; default_target: number | null }[];
  competencies: { id: number; name: string; group_name: string | null }[];
}

// ---- actual values and scores ----

export type ActualSource = 'auto' | 'manual' | 'import' | 'override';
export interface Cell { value: number | null; auto_value: number | null; source: ActualSource; note: string | null }
export interface ScoreItem {
  id: number; name: string; kra_name: string | null; unit: Unit | null; direction: Direction | null; source: Source | null; evidence_required: boolean; entry_by: EntryBy | null;
  weight: number; target: number | null; actual: number | null; score: number | null; right: 'enter' | 'override' | null;
  periods: { period_id: number; value: number | null; target: number | null; score: number | null }[]; cells: Record<string, Cell>;
  source_config?: SourceConfig; linked_tasks?: { open: number; done: number } | null;
}
export interface Scorecard {
  sheet: { id: number; employee_name: string; cycle_name: string; cycle_status: CycleStatus; status: SheetStatus };
  periods: CyclePeriod[]; scale: { name: string; bands: Band[] } | null; section_weights: Partial<Record<Section, number>>;
  items: ScoreItem[];
  sections: { kpi: { score: number | null; weightUsed: number; weightTotal: number; coverage: number } };
  overall: { score: number | null; partial: boolean; pending_sections: string[] };
  band: Band | null;
  basis: ScoreBasis;
  breaks: BreakScore[];
}
export interface BreakScore { period_id: number; label: string; score: number | null; coverage: number; closed: boolean }
export interface ScoreRow { final_status: FinalStatus; final_band: string | null; released: boolean; ack_status: AckStatus; sheet_id: number; employee_id: number; employee_name: string; employee_code: string | null; reviewer_name: string | null; score: number | null; partial: boolean; coverage: number; band: { code: string; label: string } | null }
export interface ImportResult { saved: number; error_count: number; errors: { row: number; message: string }[] }
export interface ComputeResult { goals: number; windows: number; written: number }

// ---- reviews and results ----

export type FinalStatus = 'pending' | 'submitted' | 'approved' | 'revision_requested';
export type AckStatus = 'none' | 'pending' | 'acknowledged' | 'disputed' | 'dispute_upheld' | 'dispute_rejected';
export interface ReviewItem { goal_item_id: number; rating: number | null; comment: string | null }
export interface ReviewForm {
  id: number; period_id: number | null; kind: 'self' | 'manager'; status: 'draft' | 'submitted'; comment: string | null; rating_code: string | null; adjustment_reason: string | null; items: ReviewItem[];
  /** Manager's view of potential, for the nine-box. Never sent to the employee. */
  potential?: Potential | null; potential_note?: string | null;
}
export type Potential = 'low' | 'medium' | 'high';
export interface ReviewView {
  sheet: { id: number; employee_name: string; cycle_name: string; cycle_status: CycleStatus; status: SheetStatus; final_status: FinalStatus; final_note: string | null; released_at: string | null };
  periods: (CyclePeriod & { started: boolean })[];
  goals: { id: number; item_type: 'kpi' | 'competency'; name: string; weight: number; description: string | null; levels: { level: number; descriptor: string }[] | null }[];
  self: ReviewForm | null; manager: ReviewForm | null; checkins: ReviewForm[];
  scorecard: { overall: Scorecard['overall']; sections: Record<string, { score: number | null; coverage: number }>; band: Band | null; breaks: BreakScore[]; basis: ScoreBasis; section_weights: Partial<Record<Section, number>> };
  scale: { name: string; bands: Band[] } | null; allow_override: boolean; needs_approval: boolean; self_review_enabled: boolean;
  /** Tuner (AI) can draft or polish review text for this organization. */
  ai_available: boolean;
  /** Thanks from colleagues during the cycle; for the employee and whoever reviews them. */
  kudos: { count: number; latest: { id: number; from_name: string; message: string; competency_name: string | null; created_at: string }[] } | null;
  result: { kpi_score: number | null; competency_score: number | null; feedback_score: number | null; overall_score: number | null; system_band: string | null; final_band: string | null; adjustment_reason: string | null; released_at: string; ack_status: AckStatus; ack_comment: string | null; ack_at: string | null } | null;
  permissions: { can_self: boolean; can_manager: boolean; can_checkin: boolean; can_acknowledge: boolean; can_dispute: boolean; can_withdraw_dispute: boolean; can_adjust: boolean; dispute_days_left: number };
}
export interface ReviewDraft { comment: string; items: { goal_item_id: number; comment: string }[] }
export interface ReleaseResult { released: number; not_ready: { id: number; employee_name: string; final_status: FinalStatus }[]; cycle_released: boolean }

// ---- 360 feedback ----

export type Relation = 'peer' | 'subordinate' | 'cross_team' | 'external';
export type FeedbackStatus = 'proposed' | 'pending' | 'declined' | 'submitted';
export interface FeedbackRequest {
  id: number; reviewer_employee_id: number | null; reviewer_name: string; relation: Relation; source: 'employee' | 'manager' | 'hr'; status: FeedbackStatus;
  /** Someone outside the company; address and link dates are shown only to the reviewer and HR. */
  external: boolean; external_email?: string; link_expires_at?: string | null; last_sent_at?: string | null;
}
export interface FeedbackSummary {
  count: number; visible: boolean; competencies: { goal_item_id: number; avg: number | null; count: number }[]; by_relation: Partial<Record<Relation, number>>;
  comments: { question: string; answer: string }[];
  responses?: { reviewer_name: string; relation: Relation; ratings: Record<string, number>; answers: { question: string; answer: string }[] }[];
}
export interface FeedbackView {
  sheet: { id: number; employee_name: string; cycle_name: string; cycle_status: CycleStatus };
  settings: { anonymous: boolean; min_responses: number; max_reviewers: number; questions: string[]; allow_external: boolean };
  competencies: { id: number; name: string }[];
  requests: FeedbackRequest[]; answered: number; summary: FeedbackSummary | null;
  permissions: { can_suggest: boolean; can_assign: boolean; can_decide: boolean };
}
/** The form an outside reviewer opens from the emailed link. */
export interface PublicFeedbackForm {
  company: string; reviewer_name: string; subject_name: string; cycle_name: string; status: FeedbackStatus; open: boolean; anonymous: boolean;
  competencies: FeedbackForm['competencies']; questions: string[];
}
export interface FeedbackToGive { id: number; relation: Relation; sheet_id: number; cycle_name: string; subject_name: string }
export interface FeedbackForm {
  id: number; status: FeedbackStatus; relation: Relation; subject_name: string; cycle_name: string; anonymous: boolean; open: boolean;
  competencies: { id: number; name: string; description: string | null; levels: { level: number; descriptor: string }[] | null }[];
  questions: string[]; response: { ratings: Record<string, number>; answers: { question: string; answer: string }[] } | null;
}

// ---- calibration ----

export interface SpreadBlock { violations: { code: string; count: number; percent: number; target: number | null; flag: 'over' | 'under' }[]; total: number; can_override: boolean; message: string }

export interface CalibrationSessionRow { id: number; name: string; status: 'open' | 'closed'; scope: Dimensions }
export interface CalibrationMember {
  sheet_id: number; employee_id: number; employee_name: string; employee_code: string | null; reviewer_name: string | null; score: number | null;
  system_band: string | null; chosen_band: string | null; calibrated_band: string | null; calibration_reason: string | null; band: string | null; original_band: string | null;
  final_status: FinalStatus; released: boolean; adjustable: boolean;
}
export interface CalibrationView {
  session: { id: number; cycle_id: number; cycle_name: string; cycle_status: CycleStatus; name: string; scope: Dimensions; status: 'open' | 'closed'; closed_at: string | null };
  bands: Band[]; mixed_scales: boolean; members: CalibrationMember[];
  distribution: { total: number; rows: { code: string; count: number; percent: number; target: number | null; diff: number | null; flag: 'over' | 'under' | null }[] };
  guide: boolean; tolerance: number;
  changes: { id: number; goal_sheet_id: number; employee_name: string; from_band: string | null; to_band: string; reason: string; created_at: string; changed_by_name: string | null }[];
  can_adjust: boolean;
}

// ---- improvement plans ----

export type PipStatus = 'draft' | 'pending_start' | 'active' | 'pending_outcome' | 'closed';
export interface PipItem { id: number; objective: string; measure: string | null; due_date: string | null; status: 'open' | 'met' | 'not_met'; note: string | null }
export interface PipEvent { id: number; kind: 'checkin' | 'extension'; note: string; created_at: string; author_name: string | null }
export interface Pip {
  id: number; employee_id: number; employee_name: string; employee_code: string | null; owner_employee_id: number | null; owner_name: string | null; goal_sheet_id: number | null;
  title: string; reason: string | null; start_date: string; end_date: string; status: PipStatus; outcome: 'passed' | 'failed' | null; outcome_note: string | null; decision_note: string | null;
  items?: PipItem[]; events?: PipEvent[]; needs_approval?: boolean;
  permissions?: { can_edit: boolean; can_submit: boolean; can_withdraw: boolean; can_checkin: boolean; can_mark_items: boolean; can_extend: boolean; can_close: boolean; can_cancel: boolean };
}
export interface PipSuggestion { sheet_id: number; employee_id: number; employee_name: string; employee_code: string | null; final_band: string; overall_score: number | null; cycle_name: string }

// ---- cycle reports ----

export interface ReportTally { total: number; goals_approved: number; reviews_approved: number; released: number; acknowledged: number }
export interface CycleReport {
  cycle: { id: number; name: string; status: CycleStatus; period_start: string; period_end: string; score_basis: ScoreBasis };
  breaks: { period_id: number; label: string; period_start: string; period_end: string; weight: number | null; closed: boolean; average: number | null; scored: number }[];
  progress: ReportTally & {
    goal_status: Record<string, number>; review_status: Record<string, number>; acknowledgement: Record<string, number>;
    departments: (ReportTally & { department_id: number; name: string })[];
  };
  distribution: {
    overall: CalibrationView['distribution']; codes: string[]; guide: boolean;
    departments: { department_id: number; name: string; total: number; bands: Record<string, number> }[];
  };
  heatmap: {
    departments: { department_id: number; name: string }[];
    rows: { kind: 'kpi' | 'competency'; group: string | null; name: string; average: number | null; scored: number; cells: { department_id: number; average: number | null; scored: number }[] }[];
  };
  teams: { reviewer_id: number | null; reviewer_name: string | null; size: number; scored: number; average_score: number | null; released: number; bands: Record<string, number> }[];
  people_count: number;
}

// ---- kudos ----

export interface Kudos {
  id: number; from_employee_id: number; to_employee_id: number; from_name: string; to_name: string; message: string;
  competency_id: number | null; competency_name: string | null; created_at: string; like_count: number; liked_by_me: boolean; can_delete: boolean;
}
export interface KudosWall { items: Kudos[]; next: number | null; values?: { id: number; name: string }[]; can_give?: boolean }

// ---- one-on-ones ----

export type MeetingStatus = 'scheduled' | 'done' | 'cancelled';
export interface OneOnOneRow {
  id: number; manager_employee_id: number; employee_id: number; manager_name: string; employee_name: string; scheduled_at: string; status: MeetingStatus;
  open_actions: number; i_am: 'manager' | 'employee'; with: { id: number; name: string };
}
export interface OneOnOneItem { id: number; kind: 'agenda' | 'action'; text: string; owner_employee_id: number | null; owner_name: string | null; due_date: string | null; done: boolean }
export interface OneOnOne extends OneOnOneRow { shared_notes: string; private_notes: string; items: OneOnOneItem[]; can_edit: boolean }
export interface OneOnOneList { items: OneOnOneRow[]; my_manager: { id: number; name: string } | null }

// ---- OKRs ----

export type OkrLevel = 'company' | 'department' | 'person';
export type KrKind = 'number' | 'percent' | 'yes_no';
export type KrSource = 'manual' | 'goal_item' | 'children';
export type Confidence = 'on_track' | 'at_risk' | 'off_track';
export type OkrStatus = 'draft' | 'active' | 'done' | 'dropped';
export interface KeyResult {
  id: number; objective_id: number; title: string; kind: KrKind; start_value: number; target_value: number; current_value: number | null;
  confidence: Confidence | null; weight: number; source: KrSource; goal_item_id: number | null; progress: number | null;
}
export interface Objective {
  id: number; level: OkrLevel; title: string; description: string | null; department_id: number | null; department_name: string | null;
  owner_employee_id: number | null; owner_name: string | null; parent_objective_id: number | null; parent_key_result_id: number | null;
  period_start: string; period_end: string; status: OkrStatus; progress: number | null; can_edit: boolean; key_results: KeyResult[];
}
export interface OkrTree { on: string; items: Objective[]; permissions: { can_manage: boolean; can_add_own: boolean }; departments: { id: number; name: string }[]; me: number | null }
export interface KrCheckin { id: number; value: number | null; confidence: Confidence | null; note: string | null; by_name: string | null; created_at: string }
export interface GoalOption { id: number; name: string; unit: string | null; target: number | null; cycle_name: string }

// ---- talent ----

export interface NineBoxPerson { sheet_id: number; employee_id: number; name: string; employee_code: string | null; reviewer_name: string | null; band: string | null; band_label: string | null; performance: Potential | null; potential: Potential | null; released: boolean }
export interface NineBox {
  cycle: { id: number; name: string; status: CycleStatus }; draft: boolean; total: number;
  boxes: { box: number; name: string; hint: string; performance: Potential; potential: Potential; people: NineBoxPerson[] }[]; unplaced: NineBoxPerson[];
}
export type Readiness = 'ready_now' | 'one_two_years' | 'three_plus';
export interface Successor { employee_id: number; name: string; employee_code: string | null; readiness: Readiness; notes: string | null; active: boolean; cell: { box: number; name: string; cycle_name: string } | null }
export interface KeyPosition {
  id: number; title: string; department_id: number | null; department_name: string | null; role_id: number | null; incumbent_employee_id: number | null; incumbent_name: string | null;
  criticality: Potential; vacancy_risk: Potential; notes: string | null; status: 'active' | 'archived'; successors: Successor[]; bench: { ready_now: number; total: number };
}

// ---- dashboard ----

export interface DashPerson { sheet_id: number; employee_id: number; employee_name: string; employee_code: string | null; department_name: string | null }
export interface DashPayCycle {
  id: number; name: string; status: string; effective_from: string | null; budget_percent: number | null; bonus_configured: boolean;
  rating_scale: { rating: string; label: string; percent: number; bonus_percent: number | null }[];
  summary: { proposals: number; approved: number; applied: number; pending: number; promotions: number; increase: number; increase_percent: number; budget_used_percent: number | null };
  bonus: { payouts: number; employees: number; amount: number; by_status: { status: string; payouts: number; employees: number; amount: number }[] };
}
export interface PerformanceDashboard {
  cycles: { id: number; name: string; status: CycleStatus; period_start: string; period_end: string }[];
  cycle: CycleReport['cycle'] | null;
  headcount?: number;
  funnel?: { key: string; label: string; count: number; percent: number | null }[];
  progress?: CycleReport['progress'];
  performers?: { scored: number; average: number | null; top: (DashPerson & { score: number; band: string | null; released: boolean })[]; bottom: (DashPerson & { score: number; band: string | null; released: boolean })[] };
  acknowledgements?: { released: number; acknowledged: number; pending: number; disputed: number; rate: number | null };
  distribution?: CycleReport['distribution'];
  calibration?: { guide: boolean; rated: number; within: boolean | null; off_guide: { code: string; flag: 'over' | 'under'; percent: number; target: number | null }[] };
  heatmap?: CycleReport['heatmap'];
  teams?: CycleReport['teams'];
  breaks?: CycleReport['breaks'];
  audit?: {
    missing: (DashPerson & { reviewer_name: string | null; issue: 'goals' | 'review' | 'acknowledgement'; detail: string })[];
    changes: { kind: 'manager_override' | 'calibration' | 'dispute_adjustment'; sheet_id: number; employee_id: number; employee_name: string; employee_code: string | null; from_band: string | null; to_band: string | null; reason: string | null; changed_by_name?: string | null; session_name?: string; changed_at: string | null }[];
    disputes: (DashPerson & { band: string | null; ack_status: string })[];
  };
  pulse?: {
    pips: { draft: number; pending_start: number; active: number; pending_outcome: number; passed: number; failed: number; cancelled: number };
    feedback: { asked: number; submitted: number; declined: number; waiting: number; proposed: number; response_rate: number | null };
  };
  culture: {
    one_on_ones: { done_30: number; done_90: number; cancelled_90: number; upcoming: number; overdue: number; managers_90: number };
    kudos: { given_30: number; receivers_30: number; givers_30: number };
    okrs: { objectives: number; key_results: number; average_progress: number | null; company_progress: number | null; confidence: { on_track: number; at_risk: number; off_track: number } };
  };
  pay?: DashPayCycle[];
}
