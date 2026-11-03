import { apiClient } from '@/lib/apiClient';

const auth = { withAuth: true } as const;

export interface PersonCount { employee_id: number; name: string; open: number; overdue: number }

export interface OrgDashboardDto {
  today: string;
  features: { mom: boolean; tasks: boolean };
  /** As the employee settings show birthdays; null when the read failed. */
  birthdays: {
    date: string;
    settings: { show: boolean; likes: boolean; wishes: boolean; visibility: string };
    today: Array<{ employee_id: number; name: string; designation: string | null; site_name: string | null; likes: number; wishes: number }>;
    upcoming: Array<{ date: string; employee_id: number; name: string; designation: string | null; site_name: string | null }>;
    recent_wishes: Array<{ id: number; author: { id: number; name: string }; message: string; created_at: string; is_reply: boolean; celebrant: { id: number; name: string } }>;
  } | null;
  /** Null when minutes of meeting are off. */
  mom: {
    totals: { people: number; open: number; overdue: number; in_review: number };
    people: Array<PersonCount & { department: string | null; in_review: number }>;
    upcoming: { total: number; items: Array<{ id: number; title: string; starts_at: string; status: string; place: string | null; organizer_name: string | null; attendee_count: number }> };
  } | null;
  /** Null when task management is off. */
  tasks: {
    tiles: { open: number; overdue: number; due_today: number; in_review: number; done_week: number; on_time_rate: number | null; avg_cycle_seconds: number | null };
    people: Array<PersonCount & { done: number }>;
  } | null;
}

export const getOrgDashboard = () => apiClient.get<OrgDashboardDto>('/org-dashboard', undefined, auth);
export const removeWish = (wishId: number) => apiClient.delete<{ deleted: boolean }>(`/celebrations/birthdays/wishes/${wishId}`, auth);
