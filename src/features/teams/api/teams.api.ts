import { apiClient } from '@/lib/apiClient';
import type { PersonOption } from '@/features/task-management/types/tm.types';

const B = '/teams';
const auth = { withAuth: true };

export type TeamStatus = 'working' | 'completed' | 'half_day' | 'not_checked_in' | 'absent' | 'on_leave' | 'holiday' | 'week_off';
export interface TeamCounts { total: number; present: number; not_in: number; on_leave: number; absent: number; off: number }
export interface PersonRef { employee_id: number; name: string }

/** A team I am in. `key` is "12" for a built team or "reports-34" for a manager's reports. */
export interface MyTeam {
  key: string; kind: 'built' | 'reports'; name: string; description: string | null; is_lead: boolean; counts: TeamCounts;
  preview: { employee_id: number; name: string; photo_url: string | null; status: TeamStatus }[];
}

/** Times, late marks and leave types only come to a lead or HR (`access.detailed`). */
export interface TeamMember {
  employee_id: number; name: string; employee_code: string | null; photo_url: string | null; department: string | null; role: string | null;
  is_lead: boolean; is_me: boolean; status: TeamStatus;
  late?: boolean; late_minutes?: number; first_in_at?: string | null; last_out_at?: string | null; worked_minutes?: number;
}
export interface TeamToday {
  date: string;
  team: { key: string; kind: 'built' | 'reports'; name: string; description: string | null; sub_organization_id: number | null; leads: PersonRef[] };
  access: { detailed: boolean; can_edit: boolean };
  counts: TeamCounts;
  members: TeamMember[];
  out_ahead: { employee_id: number; name: string; days: { date: string; part: 'full' | 'first_half' | 'second_half' | 'hours' }[]; leave_type?: string | null }[];
}

export interface ManagedTeam { id: number; key: string; name: string; description: string | null; sub_organization_id: number | null; member_count: number; leads: PersonRef[]; counts: TeamCounts }
export interface TeamForm { id: number; key: string; name: string; description: string | null; sub_organization_id: number | null; members: { employee_id: number; is_lead: boolean; name: string; employee_code: string | null }[] }
export interface TeamInput { name: string; description: string; sub_organization_id?: number | null; lead_ids: number[]; member_ids: number[] }

export const mine = () => apiClient.get<{ date: string; items: MyTeam[] }>(`${B}/mine`, undefined, auth);
export const today = (key: string) => apiClient.get<TeamToday>(`${B}/${encodeURIComponent(key)}/today`, undefined, auth);
export const list = () => apiClient.get<{ date: string; can_manage: boolean; items: ManagedTeam[] }>(B, undefined, auth);
export const get = (id: number | string) => apiClient.get<TeamForm>(`${B}/${id}`, undefined, auth);
export const create = (body: TeamInput) => apiClient.post<TeamForm>(B, body, auth);
export const update = (id: number | string, body: TeamInput) => apiClient.put<TeamForm>(`${B}/${id}`, body, auth);
export const remove = (id: number | string) => apiClient.delete<{ ok: true }>(`${B}/${id}`, auth);
export const people = (q: string, subOrgId?: number | null) =>
  apiClient.get<{ items: PersonOption[] }>(`${B}/people`, subOrgId ? { q, sub_organization_id: subOrgId } : { q }, auth);
