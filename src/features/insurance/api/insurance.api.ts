import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type { EnrollBody, EnrollResult, Enrollment, FileLink, Member, Paged, Plan, PlanBody, Preview, Summary } from '../types/insurance.types';

const auth = { withAuth: true };
const BASE = '/insurance';

export function getSummary(subOrgId: number | null) {
  return apiClient.get<Summary>(`${BASE}/summary`, { subOrgId: subOrgId ?? undefined }, auth);
}

export function listPlans(params: { status?: 'active' | 'archived'; subOrgId?: number | null }) {
  return apiClient.get<{ items: Plan[] }>(`${BASE}/plans`, { status: params.status, subOrgId: params.subOrgId ?? undefined }, auth);
}

export function createPlan(body: PlanBody) {
  return apiClient.post<Plan>(`${BASE}/plans`, body, auth);
}

export function updatePlan(id: number, body: PlanBody) {
  return apiClient.put<Plan>(`${BASE}/plans/${id}`, body, auth);
}

export function deletePlan(id: number) {
  return apiClient.delete<{ deleted: true }>(`${BASE}/plans/${id}`, auth);
}

export function setPlanArchived(id: number, archived: boolean) {
  return apiClient.post<Plan>(`${BASE}/plans/${id}/${archived ? 'archive' : 'unarchive'}`, {}, auth);
}

export function renewPlan(id: number, body: Partial<PlanBody>) {
  return apiClient.post<{ plan: Plan; enrolled: number; skipped: Array<{ employee_id: number; reason: string }> }>(`${BASE}/plans/${id}/renew`, body, auth);
}

export function uploadPlanDocument(id: number, file: File) {
  const form = new FormData();
  form.append('file', file);
  return apiClient.post<{ name: string }>(`${BASE}/plans/${id}/document`, form, auth);
}

export function planDocumentLink(id: number) {
  return apiClient.get<FileLink>(`${BASE}/plans/${id}/document`, undefined, auth);
}

export function listEnrollments(params: { planId: number | null; status: string; search: string; subOrgId: number | null; page: number; pageSize: number }) {
  return apiClient.get<Paged<Enrollment>>(
    `${BASE}/enrollments`,
    {
      plan_id: params.planId ?? undefined,
      status: params.status === 'all' ? undefined : params.status,
      search: params.search || undefined,
      subOrgId: params.subOrgId ?? undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    auth
  );
}

export function getEnrollment(id: number) {
  return apiClient.get<Enrollment>(`${BASE}/enrollments/${id}`, undefined, auth);
}

export function previewEnrollment(body: { plan_id: number; start_date?: string; members?: Member[] }) {
  return apiClient.post<Preview>(`${BASE}/enrollments/preview`, body, auth);
}

export function createEnrollments(body: EnrollBody) {
  return apiClient.post<EnrollResult>(`${BASE}/enrollments`, body, auth);
}

export function updateEnrollment(id: number, body: { members?: Member[]; member_no?: string }) {
  return apiClient.put<Enrollment>(`${BASE}/enrollments/${id}`, body, auth);
}

export function endEnrollment(id: number, reason: string) {
  return apiClient.post<Enrollment>(`${BASE}/enrollments/${id}/end`, { reason }, auth);
}

export function uploadCard(id: number, file: File) {
  const form = new FormData();
  form.append('file', file);
  return apiClient.post<{ name: string }>(`${BASE}/enrollments/${id}/card`, form, auth);
}

export function cardLink(id: number, mine: boolean) {
  return apiClient.get<FileLink>(mine ? `${BASE}/me/enrollments/${id}/card` : `${BASE}/enrollments/${id}/card`, undefined, auth);
}

export function myDocumentLink(id: number) {
  return apiClient.get<FileLink>(`${BASE}/me/enrollments/${id}/document`, undefined, auth);
}

export function myCover() {
  return apiClient.get<{ items: Enrollment[] }>(`${BASE}/me`, undefined, auth);
}

export function exportCoverage(body: { plan_id?: number; status?: string }) {
  return apiClient.post<ExportJobDto>('/exports/insurance-enrollments', body, auth);
}
