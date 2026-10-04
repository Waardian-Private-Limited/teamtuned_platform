export type ApprovalLevelType = 'unit_manager' | 'reporting_manager' | 'permission' | 'employee' | 'peer';

export interface ApprovalLevel {
  type: ApprovalLevelType;
  employeeId?: number | null;
}

export type CellKind = 'shift' | 'off' | 'leave' | 'holiday' | 'comp_off' | 'unavailable';
export type RosterStatus = 'draft' | 'generating' | 'review' | 'published' | 'archived' | 'failed';

export interface UnitFilters {
  siteIds: number[];
  departmentIds: number[];
  roleIds: number[];
  employmentTypeIds: number[];
}

export interface UnitSettings {
  weights?: Partial<Record<'nights' | 'weekends' | 'holidays' | 'shifts' | 'preference' | 'continuity' | 'overtime' | 'weekOffWork' | 'holidayWork' | 'minHours', number>>;
  allowOvertimeToCover?: boolean;
  optimizeSeconds?: number;
  autoGenerate?: { enabled: boolean; daysBefore: number; periodLengthDays: number | null };
}

export interface RosterUnit {
  id: number;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
  parent_unit_id: number | null;
  sub_organization_id: number | null;
  sub_organization_name: string | null;
  filters: UnitFilters;
  settings: UnitSettings;
  approval_chain: ApprovalLevel[] | null;
  effective_approval_chain: ApprovalLevel[];
  effective_settings: UnitSettings;
  depth: number;
  include_count?: number;
  child_count?: number;
}

export interface UnitMember {
  employee_id: number;
  name: string;
  employee_code: string | null;
  mode: 'include' | 'exclude';
  pattern_id: number | null;
  pattern_offset: number;
  fixed_template_id: number | null;
}

export interface UnitDemand {
  id?: number;
  kind: 'shift' | 'interval';
  shift_template_id: number | null;
  start_time: string | null;
  end_time: string | null;
  days_mask: number;
  specific_date: string | null;
  role_id: number | null;
  skill_id: number | null;
  min_headcount: number;
  max_headcount: number | null;
  priority: number;
}

export interface RosterUnitDetail extends RosterUnit {
  members: UnitMember[];
  managers: { employee_id: number; name: string }[];
  demands: UnitDemand[];
}

export interface UnitInput {
  name: string;
  description?: string | null;
  sub_organization_id?: number | null;
  parent_unit_id?: number | null;
  filters?: UnitFilters;
  settings?: UnitSettings;
  approval_chain?: ApprovalLevel[] | null;
  status?: 'active' | 'inactive';
}

export interface MemberInput {
  employeeId: number;
  mode: 'include' | 'exclude';
  patternId?: number | null;
  patternOffset?: number;
  fixedTemplateId?: number | null;
}

export interface DemandInput {
  kind: 'shift' | 'interval';
  shiftTemplateId?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  daysMask: number;
  specificDate?: string | null;
  roleId?: number | null;
  skillId?: number | null;
  minHeadcount: number;
  maxHeadcount?: number | null;
  priority?: number;
}

export interface PreviewEmployee {
  id: number;
  name: string;
  employee_code: string | null;
  role_name: string | null;
  department_name: string | null;
}

export interface EmployeeLite {
  id: number;
  employee_code: string | null;
  first_name: string;
  last_name: string;
  role_id: number | null;
  role_name: string | null;
  department_id: number | null;
  sub_organization_id: number | null;
}

export interface Pattern {
  id: number;
  name: string;
  cycle: (number | 'OFF')[];
  cycle_days: number;
  status: 'active' | 'inactive';
  sub_organization_id: number | null;
  usage_count?: number;
}

export interface PatternPreset {
  key: string;
  name: string;
  kind: 'weekly' | 'rotating';
}

export interface Skill {
  id: number;
  name: string;
  status: string;
  sub_organization_id: number | null;
  employee_count?: number;
}

export interface Violation {
  type: 'rule' | 'coverage';
  severity: 'error' | 'warning' | 'info';
  code: string;
  employeeId?: number;
  date: string;
  templateId?: number | null;
  roleId?: number | null;
  skillId?: number | null;
  slots?: number;
}

export interface RosterSummary {
  coverage: { required: number; filled: number; percent: number };
  fairness: number;
  overtimeMinutes: number;
  preferenceHitRate: number | null;
  violationCount: number;
  violationsByCode: Record<string, number>;
  employees: number;
  days: number;
  violations?: Violation[];
}

export interface RosterRow {
  id: number;
  unit_id: number;
  unit_name: string;
  sub_organization_id: number | null;
  period_start: string;
  period_end: string;
  status: RosterStatus;
  version: number;
  published_version: number;
  summary: RosterSummary | null;
  job: { error?: string } | null;
  generated_at: string | null;
  published_at: string | null;
}

export interface ShiftInfo {
  id: number;
  name: string;
  code: string;
  start_min: number;
  duration_min: number;
  break_min: number;
  crosses_midnight: boolean;
  is_night: boolean;
  status: string;
}

export interface BoardEmployee {
  id: number;
  name: string;
  employee_code: string | null;
  role_id: number | null;
  role_name: string | null;
  department_name: string | null;
}

export interface Assignment {
  id: number;
  employee_id: number;
  work_date: string;
  seq: number;
  kind: CellKind;
  shift_template_id: number | null;
  start_at: string | null;
  end_at: string | null;
  break_minutes: number;
  source: 'generated' | 'pattern' | 'fixed' | 'manual' | 'swap' | 'open_pickup' | 'leave_sync';
  locked: boolean;
  is_overtime: boolean;
  planned_ot_minutes: number;
  earns_comp_off: boolean;
  leave_application_id: number | null;
  explain: { reason: string; cost: number; alternatives: { employeeId: number; cost: number; overtime: boolean }[] } | null;
}

export interface OpenShift {
  id: number;
  unit_id?: number;
  unit_name?: string;
  roster_id?: number | null;
  work_date: string;
  shift_template_id: number;
  shift_name?: string;
  short_code?: string;
  start_time?: string;
  end_time?: string;
  role_id: number | null;
  skill_id: number | null;
  needed: number;
  filled: number;
  status: 'open' | 'filled' | 'closed';
  source: string;
  is_overtime: number | boolean;
  eligible?: boolean;
  reasons?: string[];
  claim?: ClaimRow | null;
  claims?: ClaimRow[];
}

export interface RosterBoard {
  roster: RosterRow;
  unit: { id: number; name: string; settings: UnitSettings; approval_chain: ApprovalLevel[] };
  employees: BoardEmployee[];
  templates: ShiftInfo[];
  assignments: Assignment[];
  open_shifts: OpenShift[];
}

export interface CellChange {
  employeeId: number;
  date: string;
  seq?: number;
  kind?: CellKind;
  templateId?: number | null;
  locked?: boolean;
  isOvertime?: boolean;
  plannedOtMinutes?: number;
  clear?: boolean;
}

export interface Candidate {
  employeeId: number;
  name: string;
  cost: number;
  overtime: boolean;
}

export interface DiffChange {
  employeeId: number;
  date: string;
  before: { kind: CellKind; templateId: number | null; start: string | null; end: string | null; ot: boolean } | null;
  after: { kind: CellKind; templateId: number | null; start: string | null; end: string | null; ot: boolean } | null;
}

export interface ScheduleDay {
  id: number;
  work_date: string;
  seq: number;
  kind: CellKind;
  shift_template_id: number | null;
  start_at: string | null;
  end_at: string | null;
  break_minutes: number;
  is_overtime: number;
  earns_comp_off: number;
  unit_id: number | null;
  shift_name: string | null;
  short_code: string | null;
  unit_name: string | null;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';

export interface HistoryEntry {
  level: number;
  decision: 'approved' | 'rejected';
  byEmployeeId: number | null;
  note: string | null;
  at: string;
}

export interface SwapRequest {
  id: number;
  unit_id: number;
  unit_name: string;
  type: 'swap' | 'give_away' | 'drop_to_open';
  from_employee_id: number;
  from_name: string;
  from_date_str: string;
  from_seq: number;
  from_shift_name: string | null;
  from_shift_code: string | null;
  to_shift_name: string | null;
  to_shift_code: string | null;
  to_employee_id: number | null;
  to_name: string | null;
  to_date_str: string | null;
  to_seq: number;
  reason: string | null;
  status: RequestStatus;
  chain_snapshot: ApprovalLevel[];
  current_level: number;
  history: HistoryEntry[];
  can_decide?: boolean;
  created_at: string;
}

export interface ClaimRow {
  id: number;
  open_shift_id: number;
  employee_id: number;
  employee_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  chain_snapshot: ApprovalLevel[];
  current_level: number;
}

export interface Colleague {
  employee_id: number;
  name: string;
  work_date: string;
  seq: number;
  shift_name: string;
  short_code: string | null;
}

export interface AvailabilityRow {
  id: number;
  employee_id: number;
  employee_name: string;
  kind: 'unavailable' | 'prefer' | 'avoid';
  from_date: string;
  to_date: string;
  days_mask: number;
  shift_template_id: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  note: string | null;
}

export interface InsightEmployee {
  employee_id: number;
  name: string;
  shifts: number;
  hours: number;
  nights: number;
  weekends: number;
  holidays: number;
  off_days: number;
  leave_days: number;
  overtime_minutes: number;
  comp_off_days: number;
}

export interface Insights {
  employees: InsightEmployee[];
  days: { date: string; staffed: number }[];
  totals: { employees: number; shifts: number; hours: number; overtime_minutes: number; comp_off_days: number };
  inequality: { shifts: number; nights: number; weekends: number; holidays: number; hours: number };
}
