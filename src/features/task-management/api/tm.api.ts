import { apiClient } from '@/lib/apiClient';
import type { Attachment, Values } from '@/features/data-collection/types/dc.types';
import type { ScopeCounts, CalendarData, CreateInput, DashboardData, BoardColumn, Filters, MineResult, PersonOption, Scope, TaskAction, TaskDetail, TaskOptions, TaskRow, GoalOption } from '../types/tm.types';

const auth = { withAuth: true };
const B = '/tasks';
type Paged<T> = { items: T[]; total: number; page: number; page_size: number };
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Record<string, string | number | boolean>;
const filterParams = (f: Filters) => clean({ assignee_id: f.assignee_id ?? undefined, site_id: f.site_id ?? undefined, department_id: f.department_id ?? undefined, priority: f.priority, label: f.label, q: f.q, due: f.due, status: f.status });

export const mine = (view: string, page = 1) => apiClient.get<MineResult>(`${B}/me`, { view, page, pageSize: 30 }, auth);
export const assignedByMe = (status: string, page = 1) => apiClient.get<Paged<TaskRow>>(`${B}/assigned-by-me`, clean({ status, page, pageSize: 30 }), auth);
export const listAll = (f: Filters, page = 1, order = 'due', scope: Scope = 'all', dueOn?: string) => apiClient.get<Paged<TaskRow>>(`${B}`, clean({ ...filterParams(f), page, pageSize: 30, order, scope, due_on: dueOn }), auth);
export const board = (f: Filters, scope: Scope = 'all') => apiClient.get<{ columns: BoardColumn[] }>(`${B}/board`, { ...filterParams(f), scope }, auth);
export const counts = (scope: Scope) => apiClient.get<ScopeCounts>(`${B}/counts`, { scope }, auth);
export const calendar = (f: Filters, scope: Scope, month: string) => apiClient.get<CalendarData>(`${B}/calendar`, { ...filterParams(f), scope, month }, auth);
export const dashboard = () => apiClient.get<DashboardData>(`${B}/dashboard`, undefined, auth);
export const getTask = (id: number) => apiClient.get<TaskDetail>(`${B}/${id}`, undefined, auth);
export const createTask = (body: CreateInput) => apiClient.post<{ ids: number[]; count: number; batch: boolean }>(`${B}`, body, auth);
export const act = (id: number, action: TaskAction, body: { note?: string; rating?: number; values?: Values; client_uuid?: string; captured_at?: string; geo?: { lat: number; lng: number; accuracy: number | null } | null } = {}) => apiClient.post<TaskDetail>(`${B}/${id}/${action}`, body, auth);
export const toggleItem = (id: number, itemId: number, done: boolean) => apiClient.post<{ ok: boolean }>(`${B}/${id}/checklist/${itemId}`, { done }, auth);
export const comment = (id: number, body: string, attachments: Attachment[]) => apiClient.post<{ ok: boolean }>(`${B}/${id}/comments`, { body, attachments }, auth);
export const reassign = (id: number, employeeId: number) => apiClient.post<TaskDetail>(`${B}/${id}/reassign`, { employee_id: employeeId }, auth);
/** A to-do for yourself: no review, no form; anyone with the feature may add one. */
export const removeTask = (id: number) => apiClient.delete<{ deleted: boolean }>(`${B}/${id}`, auth);
export const getOptions = () => apiClient.get<TaskOptions>(`${B}/options`, undefined, auth);
export const searchPeople = (q: string, ids?: number[]) => apiClient.get<{ items: PersonOption[] }>(`${B}/options/employees`, clean({ q, ids: ids?.join(',') }), auth);
export const optionGoals = (employeeId: number) => apiClient.get<{ items: GoalOption[] }>(`${B}/options/goals`, { employee_id: employeeId }, auth);
export const optionForms = () => apiClient.get<{ items: { id: number; name: string }[] }>(`${B}/options/forms`, undefined, auth);
export const uploadAttachment = (file: File | Blob) => {
  const fd = new FormData();
  fd.append('file', file, (file as File).name || 'file');
  return apiClient.post<Attachment>(`${B}/attachments`, fd, auth);
};
