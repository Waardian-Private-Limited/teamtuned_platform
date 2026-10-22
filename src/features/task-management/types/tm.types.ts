import type { Attachment, FormSchema, Paged, Values } from '@/features/data-collection/types/dc.types';

export type TaskStatus = 'assigned' | 'acknowledged' | 'in_progress' | 'paused' | 'submitted' | 'returned' | 'done' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskAction = 'acknowledge' | 'start' | 'pause' | 'resume' | 'submit' | 'approve' | 'return' | 'cancel' | 'reopen';
export type ColumnKey = 'todo' | 'doing' | 'review' | 'done';

export interface TaskRow {
  id: number; title: string; description: string | null; priority: Priority; status: TaskStatus; labels: string[];
  assignee_employee_id: number; assignee_name: string | null; reviewer_employee_id: number | null; reviewer_name: string | null; creator_name: string | null;
  site_id: number | null; site_name: string | null; department_id: number | null; batch_id: number | null;
  due_at: string | null; start_at: string | null; requires_review: boolean; form_id: number | null; form_version_id: number | null; submission_id: number | null;
  time_spent_seconds: number; on_time: boolean | null; review_rating: number | null; created_at: string; submitted_at: string | null; completed_at: string | null;
  overdue: boolean; allowed_actions: TaskAction[];
}

export interface ActivityRow {
  id: number; kind: 'created' | 'comment' | 'status' | 'assign' | 'edit' | 'attachment'; body: string | null;
  meta: { action?: string; from?: string; to?: string; attachments?: Attachment[]; assignee?: number; from_name?: string | null; to_name?: string | null } | null; created_at: string; actor_name: string | null;
}

/** A Performance goal the task counts toward. */
export interface TaskGoal { id: number; name: string; cycle_name: string; sheet_id: number }
export interface GoalOption { id: number; name: string; kra_name: string | null; cycle_name: string; counts_tasks: boolean }
export interface TaskDetail extends TaskRow {
  goal: TaskGoal | null;
  attachments: Attachment[];
  checklist: { id: number; text: string; done: boolean }[];
  activity: ActivityRow[];
  form: { form_id: number; version_id: number; schema: FormSchema; values: Values | null } | null;
  roles: { assignee: boolean; reviewer: boolean; manager: boolean };
}

export interface MineResult extends Paged<TaskRow> { counts: Record<'todo' | 'doing' | 'review' | 'done', number> }
export interface BoardColumn { key: ColumnKey; total: number; items: TaskRow[] }

export interface DashboardData {
  tiles: { open: number; overdue: number; due_today: number; in_review: number; done_week: number; on_time_rate: number | null; avg_cycle_seconds: number | null };
  people: { employee_id: number; name: string; open: number; overdue: number; done: number }[];
}

export interface Filters { assignee_id?: number | null; site_id?: number | null; department_id?: number | null; priority?: Priority | ''; label?: string; q?: string; due?: '' | 'overdue' | 'today' | 'week' | 'none'; status?: string }

export type AssignKind = 'employees' | 'site' | 'department' | 'role';
export interface CreateInput {
  title: string; description?: string; priority: Priority; due_at?: string | null; labels: string[]; checklist: string[];
  requires_review: boolean; reviewer_employee_id?: number | null; form_id?: number | null; attachments: Attachment[];
  /** One of the assignee's goals this task counts toward (single assignee only). */
  goal_item_id?: number | null;
  assign: { kind: AssignKind; ids: number[]; site_ids?: number[] };
}

export interface TaskOptions { sites: { id: number; name: string; code: string | null }[]; departments: { id: number; name: string }[]; roles: { id: number; name: string }[] }
export interface PersonOption { id: number; name: string; employee_code: string | null }

export type Scope = 'mine' | 'assigned' | 'review' | 'all';
export type ViewMode = 'list' | 'board' | 'calendar';
export interface CalendarDay { date: string; total: number; open: number; overdue: number; done: number }
export interface CalendarData { month: string; today: string; days: CalendarDay[] }
export interface ScopeCounts { scope: Scope; todo: number; doing: number; review: number; done: number; overdue: number }
