export type FieldType =
  | 'text' | 'textarea' | 'number' | 'currency' | 'email' | 'phone' | 'date' | 'time' | 'datetime' | 'list'
  | 'single_choice' | 'multi_choice' | 'dropdown' | 'yes_no' | 'rating'
  | 'photo' | 'file' | 'signature' | 'location' | 'barcode'
  | 'calculated'
  | 'section' | 'group' | 'reference';

export interface FieldOption { value: string; label: string; score?: number }
export type Aggregate = 'sum' | 'avg' | 'min' | 'max' | 'count';

/** A calculated field's formula (see utils/calc.ts): {field_key} references, worked out from answers above it. */
export interface CalcDef { formula: string; result: 'number' | 'text' | 'date'; decimals?: number; unit?: string }

export interface ShowRule { field: string; op: 'eq' | 'neq' | 'gt' | 'lt' | 'filled' | 'empty' | 'in'; value: unknown }
/** One condition keeps the plain shape (older apps read it); several are matched all or any. */
export type ShowWhen = ShowRule | { match: 'all' | 'any'; rules: ShowRule[] };

export interface FieldDef {
  /** Builder-only stable id for drag and drop; stripped before saving. */
  uid?: string;
  key: string;
  type: FieldType;
  label: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
  /** With `default`: a value the admin fixes; people see it and cannot change it. */
  readOnly?: boolean;
  width?: 'half';
  default?: unknown;
  options?: FieldOption[];
  validation?: { min?: number; max?: number; integer?: boolean; minLength?: number; maxLength?: number; pattern?: string };
  showWhen?: ShowWhen;
  metric?: { agg: Aggregate; unit?: string; target?: number };
  config?: { max?: number; max_files?: number; camera_only?: boolean; accuracy_m?: number; inside_site?: boolean; min_rows?: number; max_rows?: number; multiple?: boolean; entry_label?: string; item_type?: 'text' | 'number'; item_label?: string; min_items?: number; max_items?: number };
  ref?: { url: string; kind: 'pdf' | 'image' | 'dxf' };
  calc?: CalcDef;
  fields?: FieldDef[];
}

export interface FormSchema { version: 1; fields: FieldDef[] }

export interface Attachment { key?: string; url?: string; name: string; size?: number | null; type?: string | null }
export type Values = Record<string, unknown>;
export type Errors = Record<string, string>;

export interface Paged<T> { items: T[]; total: number; page: number; page_size: number }

export interface FormSummary {
  id: number; name: string; description: string | null; category: string | null; status: 'draft' | 'active' | 'archived';
  version_no: number | null; field_count: number | null; assignments: number; updated_at: string; current_version_id: number | null;
}
export interface FormDetail extends FormSummary {
  schema: FormSchema; has_unpublished_changes: boolean; usage: { assignments: number; submissions: number };
}
export interface VersionRow { id: number; version_no: number; note: string | null; published_at: string; field_count: number; submissions: number }

export interface Target {
  sites: { all: true } | { ids: number[] };
  who: { kind: 'everyone' | 'departments' | 'roles' | 'employees' | 'one_per_site'; ids?: number[] };
}
export interface Schedule {
  kind: 'once' | 'daily' | 'weekly' | 'monthly' | 'every_n_days' | 'dates';
  weekdays?: number[]; month_days?: (number | 'last')[]; interval?: number; dates?: string[];
  open_time: string; due_time: string; grace_minutes?: number;
}
export interface Flags {
  needs_review?: boolean; allow_late?: boolean; skip_when_off?: boolean; require_location?: boolean; allow_edit?: boolean; team_visible?: boolean; daily_limit?: number;
}
export interface Progress { total: number; done: number; missed: number }
export interface AssignmentRow {
  id: number; form_id: number; form_name: string; title: string; mode: 'scheduled' | 'open'; target: Target; schedule: Schedule | null; flags: Flags;
  start_date: string; end_date: string | null; status: 'active' | 'paused' | 'ended'; today: Progress; sites?: (Progress & { site_id: number; site_name: string | null })[];
  pinned_version_id: number | null;
}
export interface AssignmentInput {
  form_id: number; title: string; mode: 'scheduled' | 'open'; target: Target; schedule: Schedule | null; flags: Flags; start_date: string; end_date: string | null;
  version?: { pinned: number } | null;
}

export interface Options { sites: { id: number; name: string; code: string | null }[]; departments: { id: number; name: string }[]; roles: { id: number; name: string }[] }
export interface PersonOption { id: number; name: string; employee_code: string | null }

export interface Tiles { total: number; submitted: number; in_review: number; missed: number; overdue: number; pending: number; expected: number; compliance: number | null }
export interface Dashboard {
  range: { from: string; to: string };
  tiles: Tiles;
  by_site: { site_id: number; site_name: string | null; expected: number; done: number; compliance: number }[];
  trend: { date: string; expected: number; done: number }[];
  metrics: { form_id: number; field_key: string; label: string; unit: string; agg: Aggregate; target: number | null; form_name: string; value: number; points: { date: string; value: number }[] }[];
  recent: { id: number; status: string; submitted_at: string; is_late: number; form_name: string; site_name: string | null; employee_name: string }[];
}

// Assignment dashboard (GET /assignments/:id/dashboard and /responses)
export type AssignmentHeader = Pick<AssignmentRow, 'id' | 'title' | 'form_id' | 'form_name' | 'mode' | 'status' | 'schedule' | 'target' | 'flags' | 'start_date' | 'end_date'>;
export interface InsightFilters { from?: string; to?: string; siteId?: number | null; departmentId?: number | null; employeeId?: number | null; status?: string; late?: boolean; search?: string }
/** Scheduled: measured against what was due. */
export interface RunCounts { total: number; done: number; in_review: number; missed: number; overdue: number; pending: number; late: number; expected: number; compliance: number | null }
/** Open forms: what came in. */
export interface SubmissionCounts { submissions: number; late: number; people: number; in_review?: number }
export type InsightGroup = { id: number; name: string | null; code: string | null } & (RunCounts | SubmissionCounts);
export interface PendingRun { id: number; work_date: string; due_at: string; status: 'missed' | 'overdue'; site_id: number | null; site_name: string | null; employee_id: number | null; employee_name: string | null; employee_code: string | null; department_name: string | null }
export interface FieldInsight {
  key: string; label: string; group: string | null; type: FieldType; kind: 'yes_no' | 'choice' | 'number' | 'values' | 'filled'; total: number; answered: number;
  yes?: number; no?: number;
  options?: { label: string; count: number }[];
  agg?: Aggregate; unit?: string; decimals?: number | null;
  stats?: { count: number; sum: number; avg: number | null; min: number | null; max: number | null };
  series?: { date: string; value: number }[];
}
export interface AssignmentInsights {
  assignment: AssignmentHeader;
  range: { from: string; to: string };
  options: { sites: { id: number; name: string }[]; departments: { id: number; name: string }[]; people: { id: number; name: string; code: string | null; department_id: number | null }[] };
  tiles: (RunCounts & { submissions: number; people: number }) | (SubmissionCounts & { in_review: number });
  trend: { date: string; expected?: number; done?: number; missed?: number; submissions?: number; late?: number }[];
  by_site: InsightGroup[]; by_department: InsightGroup[]; by_person: InsightGroup[];
  pending: PendingRun[];
  fields: FieldInsight[];
  fields_capped: number | null;
}
export interface ResponseRow {
  id: number; form_version_id: number; status: SubmissionStatus; is_late: boolean; submitted_at: string; work_date: string;
  site_id: number | null; site_name: string | null; employee_id: number; employee_name: string; employee_code: string | null; department_name: string | null;
  values: Record<string, string>;
}
// Audit board builder v2 (per form, shared)
export type WidgetType = 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'kpi' | 'table' | 'data';
export type WidgetAgg = 'count' | 'sum' | 'avg' | 'min' | 'max';
export type GroupKind = 'none' | 'field' | 'site' | 'department' | 'person' | 'day';
export type RunStat = 'compliance' | 'filled' | 'missed' | 'overdue' | 'pending' | 'late' | 'submissions' | 'people' | 'in_review';
export type CondOp = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'filled' | 'empty';
export interface Condition { field: string; op: CondOp; value?: string | number | boolean }
export interface WidgetFilter { from?: string; to?: string; siteId?: number; departmentId?: number; employeeId?: number; status?: string; late?: boolean; match?: 'all' | 'any'; conditions?: Condition[] }
export interface WidgetSeries { id: string; source: 'field' | 'count' | 'run'; field?: string; agg?: WidgetAgg; runStat?: RunStat; chart?: 'bar' | 'line' | 'area'; axis?: 'left' | 'right'; label?: string }
export interface Widget {
  id: string; type: WidgetType; title: string;
  x?: { kind: GroupKind; field?: string };
  series?: WidgetSeries[];
  scatter?: { xField: string; yField: string };
  columns?: string[];
  filter?: WidgetFilter;
  limit: number; sort: 'value_desc' | 'value_asc' | 'label' | 'none';
}
export interface WidgetLayout { i: string; x: number; y: number; w: number; h: number }
export interface BoardLayout { widgets: Widget[]; layout: WidgetLayout[] }
export interface Board { id: number; form_id: number; name: string; layout: BoardLayout; is_default: boolean; sort_order: number }
export interface PaletteField { key: string; label: string; type: FieldType; numeric?: boolean; options?: { value: string; label: string }[]; fields?: PaletteField[] }
export interface BoardList { items: Board[]; columns: PaletteField[] }
export type WidgetResult =
  | { kind: 'kpi'; value: number | null; unit: string }
  | { kind: 'series'; series: { id: string; label: string; chart: 'bar' | 'line' | 'area'; axis: 'left' | 'right'; unit: string }[]; rows: { label: string; values: Record<string, number | null> }[] }
  | { kind: 'pie'; rows: { label: string; value: number | null }[]; unit: string }
  | { kind: 'scatter'; points: { x: number; y: number; label: string }[]; xLabel: string; yLabel: string; xDate: boolean; yDate: boolean }
  | { kind: 'table'; columns: string[]; rows: { label: string; cells: (number | null)[]; total: number | null }[] }
  | { kind: 'data'; columns: { key: string; label: string; numeric: boolean }[]; rows: { id: number; work_date: string; employee_name: string; employee_code: string | null; site_name: string | null; status: string; is_late: boolean; values: Record<string, string> }[] };
export interface BoardDataResult { range: { from: string; to: string }; results: Record<string, WidgetResult> }

export interface ResponsesPage extends Paged<ResponseRow> { columns: { key: string; label: string; type: FieldType; numeric: boolean }[]; range: { from: string; to: string } }

export type SubmissionStatus = 'submitted' | 'in_review' | 'approved' | 'returned' | 'rejected';
export interface SubmissionRow {
  id: number; form_id: number; form_name: string; status: SubmissionStatus; is_late: number; submitted_at: string; work_date: string;
  site_name: string | null; employee_name: string; employee_code: string | null;
}
export interface SubmissionDetail extends SubmissionRow {
  schema: FormSchema; values: Values; geo: { lat: number; lng: number; accuracy: number | null } | null; captured_at?: string | null; review_note: string | null;
  legacy_review: { level: number; status: string; comments: string | null; at: string | null }[] | null;
}

export type RunDisplay = 'upcoming' | 'open' | 'overdue' | 'in_progress' | 'returned' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'missed' | 'cancelled';
export interface MyRun {
  id: number; assignment_id: number; form_id: number; form_version_id: number; title: string; form_name: string; category: string | null;
  site_id: number | null; site_name: string | null; shared: boolean; status: string; display: RunDisplay; period_key: string;
  opens_at: string; due_at: string; close_at: string; flags: Flags;
}
export interface MySummary { today: number; overdue: number; upcoming: number; returned: number; open_forms: number }
export interface OpenForm { assignment_id: number; form_id: number; title: string; form_name: string; category: string | null; flags: Flags; version_id: number }
export interface FillPayload {
  run?: MyRun; form?: OpenForm; schema: FormSchema; version_no: number;
  draft: { key: string; form_version_id: number; values: Values } | null;
  previous?: { id: number; status: string; values: Values; review_note: string | null } | null;
}
