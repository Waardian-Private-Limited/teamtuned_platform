import { apiClient } from '@/lib/apiClient';

const B = '/learning';
const auth = { withAuth: true };

export type CourseKind = 'online' | 'video' | 'document' | 'classroom' | 'book' | 'other';
export type ItemStatus = 'assigned' | 'in_progress' | 'completed' | 'verified' | 'dropped';
export interface Course { id: number; sub_organization_id: number | null; title: string; description: string | null; kind: CourseKind; url: string | null; provider: string | null; duration_minutes: number | null; competency_ids: number[]; status: 'active' | 'archived'; assigned_count?: number }
export interface Catalog { items: Course[]; competencies: { id: number; name: string }[]; can_manage: boolean }
export interface PlanItem {
  id: number; employee_id: number; course_id: number | null; title: string; url: string | null; competency_id: number | null; competency_name: string | null;
  source: 'manager' | 'hr' | 'self' | 'gap'; due_date: string | null; status: ItemStatus; proof_url: string | null; proof_note: string | null; completed_at: string | null;
  verified_at: string | null; assigned_by_name: string | null; verified_by_name: string | null; course_kind: CourseKind | null; course_provider: string | null; duration_minutes: number | null; can_remove?: boolean;
}
export interface Plan {
  person: { id: number; name: string; employee_code: string | null; designation: string | null }; items: PlanItem[];
  progress: { total: number; done: number; overdue: number; percent: number };
  permissions: { is_learner: boolean; can_assign: boolean; can_confirm: boolean; can_add_own: boolean };
}
export interface Gap { competency_id: number; name: string; rating: number; cycle_name: string; goal_sheet_id: number; courses: Course[] }
export interface TeamRow { id: number; name: string; employee_code: string | null; designation: string | null; total: number; done: number; overdue: number; to_confirm: number }
export interface Team { items: TeamRow[]; summary: { people: number; with_plan: number; items: number; done: number; overdue: number; to_confirm: number }; is_hr: boolean }
export interface Person { id: number; name: string; employee_code?: string | null }

export const catalog = (q: { status?: string; q?: string; competency_id?: number } = {}) => apiClient.get<Catalog>(`${B}/courses`, q, auth);
export const createCourse = (body: unknown) => apiClient.post<Course>(`${B}/courses`, body, auth);
export const updateCourse = (id: number, body: unknown) => apiClient.put<Course>(`${B}/courses/${id}`, body, auth);
export const setCourseArchived = (id: number, archived: boolean) => apiClient.post<Course>(`${B}/courses/${id}/${archived ? 'archive' : 'restore'}`, {}, auth);
export const team = (q?: string) => apiClient.get<Team>(`${B}/team`, q ? { q } : undefined, auth);
export const people = (q: string) => apiClient.get<{ items: Person[] }>(`${B}/people`, q ? { q } : undefined, auth);
export const plan = (employeeId: number | 'me') => apiClient.get<Plan>(`${B}/plans/${employeeId}`, undefined, auth);
export const gaps = (employeeId: number | 'me') => apiClient.get<{ max_rating: number; items: Gap[] }>(`${B}/plans/${employeeId}/gaps`, undefined, auth);
export const addItem = (employeeId: number | 'me', body: { course_id?: number; title?: string; url?: string; due_date?: string | null; competency_id?: number | null; from_gap?: boolean }) => apiClient.post<PlanItem>(`${B}/plans/${employeeId}/items`, body, auth);
export const updateItem = (id: number, body: { status?: ItemStatus; proof_url?: string; proof_note?: string }) => apiClient.patch<PlanItem>(`${B}/items/${id}`, body, auth);
export const removeItem = (id: number) => apiClient.delete<{ ok: true }>(`${B}/items/${id}`, auth);
