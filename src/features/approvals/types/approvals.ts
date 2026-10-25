export type Dimension = 'site' | 'department' | 'employment_type' | 'role' | 'roster_unit';
export type StepMode = 'any' | 'all' | 'quorum';
export type Operator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';

export interface Approver {
  type: string;
  levels?: number;
  roleId?: number;
  sameSite?: boolean;
  sameSubOrg?: boolean;
  employeeIds?: number[];
  permission?: string;
}

export interface Condition { fact: string; op: Operator; value: string | number | boolean | (string | number)[] }

export interface FlowStep {
  name: string;
  approver: Approver;
  mode: StepMode;
  quorum: number | null;
  when: Condition[] | null;
  ifNobody: 'skip' | 'org_admins';
  /** Petty cash: what this step's approvers must do before approving. */
  receives?: { goods?: boolean; paper?: boolean };
}

export interface FlowSla { remindAfterHours: number; escalateAfterHours?: number }

export interface Flow {
  id: number;
  subOrganizationId: number | null;
  requestType: string;
  name: string;
  priority: number;
  isActive: boolean;
  version: number;
  steps: FlowStep[];
  sla: FlowSla | null;
  scopes: Partial<Record<Dimension, number[]>>;
}

export interface FlowInput {
  requestType: string;
  subOrganizationId: number | null;
  name: string;
  priority: number;
  steps: FlowStep[];
  sla: FlowSla | null;
  scopes: Partial<Record<Dimension, number[]>>;
}

export interface FactDef { key: string; type: 'number' | 'string' | 'boolean'; label: string }
export interface RequestTypeDef {
  type: string;
  label: string;
  description: string | null;
  fallbackPermission: string;
  permissionOptions: { code: string; label: string }[];
  approverTypes: { type: string; label: string }[];
  scopeDimensions: Dimension[];
  /** Actions a step can be marked with (petty cash: `goods`, `paper`). */
  stepActions?: string[];
  facts: FactDef[];
  global?: boolean;
}
export interface Catalog { operators: Operator[]; dimensions: Dimension[]; requestTypes: RequestTypeDef[] }

export interface NamedRef { id: number; name: string }
export interface Lookups {
  sites: NamedRef[]; departments: NamedRef[]; roles: NamedRef[]; employmentTypes: NamedRef[]; rosterUnits: NamedRef[];
}
export interface EmployeeRef { id: number; name: string; code: string | null; department: string | null }

export interface PreviewStep {
  index: number; name: string; mode: StepMode; quorum: number | null; approverType: string;
  state: 'active' | 'skipped' | 'conditional';
  approvers: { employeeId: number; name: string; delegatedFrom: string | null }[];
  permission: string | null;
  warning: string | null;
  when: Condition[] | null;
}
export interface Preview {
  employee: { id: number; name: string };
  flow: { id: number | null; name: string; draft?: boolean } | null;
  fallback: boolean;
  sla: FlowSla | null;
  steps: PreviewStep[];
}

export interface CoverageRow { employeeId: number; name: string; employeeCode: string | null; flowName: string | null; step: string; reason: string }
export interface Coverage { total: number; covered: number; uncovered: number; rows: CoverageRow[] }

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'sent_back' | 'withdrawn';

export interface TaskView {
  id: number; status: string; assignee: { id: number; name: string } | null; permission: string | null;
  delegatedFrom: { id: number; name: string } | null; actedAt: string | null; note: string | null;
}
export interface RegularizationTime { recorded: string | null; asked: string | null; current: string | null; editable: boolean }
export interface RegularizationTrailStep { by: 'employee' | 'approver'; name: string | null; step: string | null; at: string | null; in_time: string | null; out_time: string | null }

/** One punch behind an attendance request: when, where, what failed, and whether it has a selfie and a map point. */
export interface PunchEvidence {
  id: number | null; kind: 'work' | 'night_ot'; direction: 'in' | 'out'; time: string; place: string | null;
  lat: number | null; lng: number | null; accuracy_m: number | null; has_image: boolean; voided: boolean;
  outside: boolean; distance_m: number | null; issues: string[]; reason: string | null; review_state: string;
}

export interface RequestDetail {
  id: number; requestType: string; typeLabel: string; subjectId: number; status: RequestStatus;
  requester: { id: number; name: string } | null;
  currentStep: number;
  steps: { index: number; name: string; mode: StepMode; quorum: number | null; approverType: string; tasks: TaskView[] }[];
  events: { id: number; step: number | null; action: string; actor: string | null; note: string | null; meta: Record<string, unknown> | null; at: string }[];
  detail: {
    title: string;
    lines: { key?: string; label: string; value: string }[];
    impact: { label: string; items: string[] } | null;
    /** Regularization: each punch time recorded, asked by the employee, and as it stands now. */
    times?: { in: RegularizationTime; out: RegularizationTime };
    /** Regularization: who set the times, oldest first (the employee's ask, then each approver's correction). */
    trail?: RegularizationTrailStep[];
    /** Attendance requests: the day's punches with place, map point and selfie, as in the attendance popup. */
    punches?: PunchEvidence[];
    /** A type-specific form the approver fills in; its values go back as `extra` when approving. */
    decision_form?: { kind: string; advance_id?: number; claim_id?: number; fund_request_id?: number; expense_id?: number; amount?: number; physical?: { status: string; required: boolean; blocks_decision: boolean; step?: { name: string | null; current: boolean } | null }; inward?: { required: boolean; status: string; blocks_decision: boolean; step?: { name: string | null; current: boolean } | null; numbering?: 'auto' | 'typed'; numbers: string[]; lines?: Array<{ line: number; name: string; unit: string | null; ordered: number; received: number; pending: number; numbers?: Array<{ inward_no: string; qty: number }> }> }; files?: Array<{ index: number; name?: string | null }> };
  } | null;
  createdAt: string; decidedAt: string | null;
  actions: { decide: boolean; sendBack: boolean; withdraw: boolean; resubmit: boolean; override: boolean; reassign: boolean };
}

export interface Delegation {
  id: number; employeeId: number; delegateEmployeeId: number; startsOn: string; endsOn: string;
  requestTypes: string[] | null; employeeName: string; delegateName: string;
}
