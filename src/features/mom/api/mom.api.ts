import { apiClient } from '@/lib/apiClient';
import type { PersonOption } from '@/features/task-management/types/tm.types';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';

const B = '/mom';
const auth = { withAuth: true };

export type MeetingStatus = 'scheduled' | 'live' | 'closed' | 'cancelled';
export type PointKind = 'action' | 'decision' | 'note';
export type PointStatus = 'open' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type DueBucket = 'overdue' | 'today' | 'week' | 'later' | 'none';
export type PointAction = 'start' | 'done' | 'confirm' | 'send_back' | 'cancel' | 'reopen';
export type MeetingAction = 'start' | 'publish' | 'reopen' | 'cancel' | 'follow_up';

export interface Meeting {
  id: number; sub_organization_id: number | null; site_id: number | null; title: string; agenda: string | null; starts_at: string; ends_at: string | null; place: string | null;
  status: MeetingStatus; source: 'meeting' | 'dpr'; previous_meeting_id: number | null; organizer_employee_id: number | null; organizer_name?: string | null; published_at: string | null;
  point_count?: number; open_actions?: number; attendee_count?: number;
}
export interface Attendee { meeting_id: number; employee_id: number; role: 'organizer' | 'attendee'; attended: boolean; name: string; employee_code: string | null; department: string | null }

export type AssignMode = 'single' | 'shared' | 'separate';
/** What an action was given to: named people, or a department/site group (resolved to people when assigned). */
export type AssignTarget =
  | { kind: 'people'; count: number }
  | { kind: 'group'; count: number; departments: { id: number; name: string }[]; sites: { id: number; name: string }[] };
export interface PersonRef { employee_id: number; name: string }

export interface Point {
  id: number; meeting_id: number; kind: PointKind; text: string; position: number; owners: PersonRef[]; owner_ids: number[]; owner_name: string | null;
  assign_mode: AssignMode; group_id: number | null; assign_target: AssignTarget | null; assigned_by_employee_id: number | null;
  due_on: string | null; priority: 'normal' | 'high'; needs_signoff: boolean; signoff_employee_id: number | null; signoff_name: string | null; status: PointStatus | null; task_id: number | null;
  /** A decision that asks the people at the meeting to acknowledge it: how many have, of how many, and whether this person may now. */
  can_task: boolean;
  /** Who else sees a decision or note: the people at the meeting, named people or a group, or everyone in the company. */
  audience_mode: 'attendees' | 'selected' | 'everyone'; audience_target: AssignTarget | null; audience_count: number;
  needs_ack: boolean; ack_total: number; ack_count: number; acked_by_me: boolean; can_ack: boolean;
  done_at: string | null; meeting_title?: string; meeting_status?: MeetingStatus; comment_count?: number;
  due_bucket: DueBucket; allowed_actions: PointAction[]; can_edit: boolean; can_delete: boolean; is_mine: boolean;
  /** Deleted points are kept for the audit trail and shown only to people who edit the meeting. */
  deleted: boolean; deleted_at: string | null; deleted_by_name: string | null; delete_reason: string | null; can_restore: boolean;
  version_count?: number; last_edited_at?: string | null;
}

export interface MeetingList { page: number; pageSize: number; total: number; items: Meeting[] }
export interface MeetingDetail {
  meeting: Meeting; attendees: Attendee[]; points: Point[]; carried: Point[]; deleted: Point[]; today: string;
  access: { tasks: boolean; can_edit: boolean; can_add_points: boolean; actions: MeetingAction[] };
}
export interface PointDetail {
  point: Point; meeting: { id: number; title: string | undefined; status: MeetingStatus | undefined; starts_at: string | undefined };
  events: { id: number; kind: string; from: string | null; to: string | null; note: string | null; actor: string | null; at: string }[];
  comments: { id: number; employee_id: number; name: string; body: string; mentions: number[]; at: string }[];
  /** Who has and has not acknowledged, for people who edit the point. */
  acks: { acked: { employee_id: number; name: string; at: string }[]; pending: { employee_id: number; name: string }[] } | null;
  participants: { employee_id: number; name: string }[];
  versions: PointVersion[];
  access: { can_make_task: boolean; can_comment: boolean };
}
export interface PointVersion { version: number; snapshot: { text: string }; changes: { field: string; label: string; from: string; to: string }[]; editor: string | null; at: string }

export interface Summary {
  has_employee: boolean; today: string; counts: { open: number; overdue: number; week: number; signoff: number };
  actions: Point[]; signoffs: Point[]; upcoming: Meeting[]; recent: Meeting[];
}
export interface TeamRow { employee_id: number; name: string; department: string | null; open: number; overdue: number; in_review: number }
export interface TeamSummary { today: string; totals: { people: number; open: number; overdue: number; in_review: number }; items: TeamRow[] }

export interface MeetingInput { title: string; starts_at: string; ends_at?: string | null; place?: string; agenda?: string; site_id?: number | null; sub_organization_id?: number | null; organizer_employee_id?: number | null; attendee_ids: number[] }
/** Who an action goes to: people, or departments and/or sites. `mode` matters for more than one person. */
export interface AssignInput { employee_ids?: number[]; department_ids?: number[]; site_ids?: number[]; mode?: 'shared' | 'separate' }
/** Who a decision or note is shared with: null for the people at the meeting, everyone, or named people / a department at sites / sites. */
export type AudienceInput = { mode: 'everyone' } | (Omit<AssignInput, 'mode'> & { mode: 'selected' });
export interface PointInput { kind: PointKind; text: string; assign?: AssignInput | null; due_on?: string | null; priority?: 'normal' | 'high'; needs_signoff?: boolean; needs_ack?: boolean; audience?: AudienceInput | null; signoff_employee_id?: number | null }

export const summary = () => apiClient.get<Summary>(`${B}/me/summary`, undefined, auth);
export const pastPoints = (page: number) => apiClient.get<{ today: string; total: number; page: number; pageSize: number; items: Point[] }>(`${B}/me/past`, { page }, auth);
export const myNotes = (kind: 'decision' | 'note' | '', page: number) => apiClient.get<{ today: string; total: number; page: number; pageSize: number; items: Point[] }>(`${B}/me/notes`, { page, kind: kind || undefined }, auth);
export const team = (q?: { department_id?: number; site_id?: number }) => apiClient.get<TeamSummary>(`${B}/team`, q, auth);
export const people = (q: string, subOrgId?: number | null, page = 1) => apiClient.get<{ items: (PersonOption & { department?: string | null })[]; total: number; page: number; pageSize: number }>(`${B}/people`, { q, page, ...(subOrgId ? { sub_organization_id: subOrgId } : {}) }, auth);

export const meetings = (q: { when?: 'upcoming' | 'past'; q?: string; mine?: boolean; page?: number; pageSize?: number; subOrgId?: number | null }) =>
  apiClient.get<MeetingList>(`${B}/meetings`, { ...q, mine: q.mine ? '1' : undefined, subOrgId: q.subOrgId ?? undefined }, auth);
export const meeting = (id: number) => apiClient.get<MeetingDetail>(`${B}/meetings/${id}`, undefined, auth);
export const createMeeting = (body: MeetingInput) => apiClient.post<MeetingDetail>(`${B}/meetings`, body, auth);
export const updateMeeting = (id: number, body: Partial<MeetingInput>) => apiClient.put<MeetingDetail>(`${B}/meetings/${id}`, body, auth);
export const deleteMeeting = (id: number) => apiClient.delete<{ ok: true }>(`${B}/meetings/${id}`, auth);
export const meetingAction = (id: number, action: 'start' | 'publish' | 'reopen' | 'cancel') => apiClient.post<MeetingDetail>(`${B}/meetings/${id}/${action}`, {}, auth);
export const followUp = (id: number, body: { starts_at: string; title?: string }) => apiClient.post<MeetingDetail>(`${B}/meetings/${id}/follow-up`, body, auth);
export const markAttended = (id: number, employeeId: number, attended: boolean) => apiClient.put<{ ok: true }>(`${B}/meetings/${id}/attendance`, { employee_id: employeeId, attended }, auth);

export const assignOptions = () => apiClient.get<{ departments: { id: number; name: string }[]; sites: { id: number; name: string }[]; max: number }>(`${B}/assign/options`, undefined, auth);
export const assignPreview = (assign: AssignInput, forAudience = false) => apiClient.post<{ count: number; names: string[] }>(`${B}/assign/preview`, { assign, ...(forAudience ? { for_audience: true } : {}) }, auth);
export const addPoint = (meetingId: number, body: PointInput) => apiClient.post<PointDetail & { created: number }>(`${B}/meetings/${meetingId}/points`, body, auth);
export const point = (id: number) => apiClient.get<PointDetail>(`${B}/points/${id}`, undefined, auth);
export const updatePoint = (id: number, body: Partial<PointInput>) => apiClient.put<PointDetail>(`${B}/points/${id}`, body, auth);
export const deletePoint = (id: number, reason?: string) => apiClient.delete<{ ok: true }>(`${B}/points/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, auth);
export const restorePoint = (id: number) => apiClient.post<PointDetail>(`${B}/points/${id}/restore`, {}, auth);
export const pointAction = (id: number, action: PointAction, reason?: string) =>
  apiClient.post<PointDetail>(`${B}/points/${id}/${action === 'send_back' ? 'send-back' : action}`, reason ? { reason } : {}, auth);
export const acknowledgePoint = (id: number) => apiClient.post<PointDetail>(`${B}/points/${id}/ack`, {}, auth);
export const makeTask = (id: number) => apiClient.post<PointDetail>(`${B}/points/${id}/task`, {}, auth);
export const comment = (id: number, body: string, mentionIds: number[]) => apiClient.post<PointDetail>(`${B}/points/${id}/comments`, { body, mention_ids: mentionIds }, auth);
export const exportMinutes = (meetingId: number) => apiClient.post<ExportJobDto>('/exports/minutes', { meeting_id: meetingId }, auth);

// ---- audit (MOM_MANAGE)
export interface AuditFilters { search?: string; employee_id?: number; department_id?: number; meeting_id?: number; status?: PointStatus; kind?: PointKind; deleted?: 'only' | 'include'; edited?: boolean; overdue?: boolean; q?: string; from?: string; to?: string; page?: number; pageSize?: number }
export interface AuditTiles { actions: number; open: number; overdue: number; done: number; in_review: number; on_time: number; done_with_due: number; deleted: number; edited: number }
export interface AuditPerson { employee_id: number; name: string; department: string | null; assigned: number; open: number; overdue: number; done: number; on_time: number; done_with_due: number; sent_back: number; deleted: number }
export interface AuditEvent { id: number; kind: string; from: string | null; to: string | null; note: string | null; at: string; actor: string | null; point_id: number; text: string; deleted: boolean; meeting_id: number; meeting_title: string }

const q = (f: object) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false).map(([k, v]) => [k, v === true ? '1' : v]));
export const auditOverview = (f: AuditFilters = {}) => apiClient.get<{ today: string; page: number; pageSize: number; tiles: AuditTiles; people_total: number; people: AuditPerson[] }>(`${B}/audit/overview`, q(f), auth);
export const auditPoints = (f: AuditFilters = {}) => apiClient.get<{ page: number; pageSize: number; total: number; today: string; items: Point[] }>(`${B}/audit/points`, q(f), auth);
export const auditActivity = (f: { employee_id?: number; department_id?: number; kind?: string; before?: number } = {}) => apiClient.get<{ more: boolean; items: AuditEvent[] }>(`${B}/audit/activity`, q(f), auth);
