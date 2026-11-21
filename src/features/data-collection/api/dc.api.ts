import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type {
  AssignmentInput, AssignmentInsights, AssignmentRow, Board, BoardDataResult, BoardLayout, BoardList, InsightFilters, ResponsesPage, Widget, Attachment, Dashboard, FillPayload, FormDetail, FormSchema, FormSummary, MyRun, MySummary, OpenForm, Options, Paged,
  PersonOption, SubmissionDetail, SubmissionRow, Target, Values, VersionRow,
} from '../types/dc.types';

const auth = { withAuth: true };
const B = '/data-collection';
const clean = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Record<string, string | number | boolean>;

// forms
export const listForms = (p: { status?: string; search?: string; page?: number; pageSize?: number; subOrgId?: number | null }) =>
  apiClient.get<Paged<FormSummary>>(`${B}/forms`, clean({ ...p, subOrgId: p.subOrgId ?? undefined }), auth);
export const getForm = (id: number) => apiClient.get<FormDetail>(`${B}/forms/${id}`, undefined, auth);
export const createForm = (body: { name: string; description?: string; category?: string; schema?: FormSchema; sub_organization_id?: number | null }) => apiClient.post<FormDetail>(`${B}/forms`, body, auth);
export const saveDraft = (id: number, body: { name: string; description?: string; category?: string; schema: FormSchema }) => apiClient.put<FormDetail>(`${B}/forms/${id}`, body, auth);
export const publishForm = (id: number, note: string) => apiClient.post<FormDetail>(`${B}/forms/${id}/publish`, { note }, auth);
export const formVersions = (id: number) => apiClient.get<{ items: VersionRow[]; current_version_id: number | null }>(`${B}/forms/${id}/versions`, undefined, auth);
export const formVersion = (id: number, versionId: number) => apiClient.get<{ id: number; version_no: number; schema: FormSchema; note: string | null }>(`${B}/forms/${id}/versions/${versionId}`, undefined, auth);
export const restoreVersion = (id: number, versionId: number) => apiClient.post<FormDetail>(`${B}/forms/${id}/versions/${versionId}/restore`, {}, auth);
export const duplicateForm = (id: number) => apiClient.post<FormDetail>(`${B}/forms/${id}/duplicate`, {}, auth);
export const archiveForm = (id: number) => apiClient.post<FormDetail>(`${B}/forms/${id}/archive`, {}, auth);
export const unarchiveForm = (id: number) => apiClient.post<FormDetail>(`${B}/forms/${id}/unarchive`, {}, auth);
export const deleteForm = (id: number) => apiClient.delete<{ deleted: boolean }>(`${B}/forms/${id}`, auth);
export const suggestForm = (description: string) => apiClient.post<{ name: string; description: string; schema: FormSchema }>(`${B}/forms/tuner`, { description }, auth);

// assignments
export const listAssignments = (p: { status?: string; formId?: number | null; search?: string; page?: number; pageSize?: number }) =>
  apiClient.get<Paged<AssignmentRow>>(`${B}/assignments`, clean({ status: p.status, form_id: p.formId ?? undefined, search: p.search, page: p.page, pageSize: p.pageSize }), auth);
export const getAssignment = (id: number) => apiClient.get<AssignmentRow>(`${B}/assignments/${id}`, undefined, auth);
export const createAssignment = (body: AssignmentInput) => apiClient.post<AssignmentRow>(`${B}/assignments`, body, auth);
export const updateAssignment = (id: number, body: AssignmentInput) => apiClient.put<AssignmentRow>(`${B}/assignments/${id}`, body, auth);
export const previewAssignment = (target: Target) => apiClient.post<{ people: number; sites: number; runs_per_period: number }>(`${B}/assignments/preview`, { target }, auth);
export const assignmentAction = (id: number, action: 'pause' | 'resume' | 'end') => apiClient.post<AssignmentRow>(`${B}/assignments/${id}/${action}`, {}, auth);
const insightQuery = (f: InsightFilters) => clean({
  from: f.from, to: f.to, site_id: f.siteId ?? undefined, department_id: f.departmentId ?? undefined, employee_id: f.employeeId ?? undefined,
  status: f.status, late: f.late || undefined, search: f.search,
});
export const assignmentInsights = (id: number, f: InsightFilters) => apiClient.get<AssignmentInsights>(`${B}/assignments/${id}/dashboard`, insightQuery(f), auth);
export const assignmentResponses = (id: number, f: InsightFilters & { page?: number; pageSize?: number }) =>
  apiClient.get<ResponsesPage>(`${B}/assignments/${id}/responses`, { ...insightQuery(f), ...clean({ page: f.page, pageSize: f.pageSize }) }, auth);
/** Excel of the filtered answers, built in the background: track the job in the Download Center. */
export const exportAssignment = (id: number, f: InsightFilters) => apiClient.post<ExportJobDto>('/exports/dc-assignment', { id, ...insightQuery(f) }, auth);
/** PDF of the filtered submissions (at most 200). */
export const assignmentPdf = (id: number, f: InsightFilters) =>
  apiClient<Blob>(`${B}/submissions/export.pdf`, { ...auth, responseType: 'blob', params: { assignment_id: id, ...insightQuery(f) } });
// audit boards (per form, shared)
export const listDashboards = (formId: number) => apiClient.get<BoardList>(`${B}/forms/${formId}/dashboards`, undefined, auth);
export const createDashboard = (formId: number, body: { name: string; layout: BoardLayout; is_default?: boolean }) => apiClient.post<Board>(`${B}/forms/${formId}/dashboards`, body, auth);
export const updateDashboard = (formId: number, dashId: number, body: { name?: string; layout?: BoardLayout; is_default?: boolean }) => apiClient.put<Board>(`${B}/forms/${formId}/dashboards/${dashId}`, body, auth);
export const deleteDashboard = (formId: number, dashId: number) => apiClient.delete<{ deleted: boolean }>(`${B}/forms/${formId}/dashboards/${dashId}`, auth);
export const reorderDashboards = (formId: number, order: number[]) => apiClient.post<{ ok: boolean }>(`${B}/forms/${formId}/dashboards/reorder`, { order }, auth);
/** Compute widgets (saved or in-progress) for one assignment under the dashboard filters. */
export const boardData = (assignmentId: number, widgets: Widget[], f: InsightFilters) =>
  apiClient.post<BoardDataResult>(`${B}/assignments/${assignmentId}/board-data`, { widgets }, { ...auth, params: insightQuery(f) });
export const getOptions = () => apiClient.get<Options>(`${B}/options`, undefined, auth);
export const searchPeople = (q: string, ids?: number[]) => apiClient.get<{ items: PersonOption[] }>(`${B}/options/employees`, clean({ q, ids: ids?.join(',') }), auth);

// reports
export const getDashboard = (p: { from?: string; to?: string; formId?: number | null; siteId?: number | null }) =>
  apiClient.get<Dashboard>(`${B}/dashboard`, clean({ from: p.from, to: p.to, form_id: p.formId ?? undefined, site_id: p.siteId ?? undefined }), auth);
export const listSubmissions = (p: { formId?: number | null; siteId?: number | null; status?: string; from?: string; to?: string; search?: string; page?: number; pageSize?: number }) =>
  apiClient.get<Paged<SubmissionRow> & { range: { from: string; to: string } }>(`${B}/submissions`, clean({ form_id: p.formId ?? undefined, site_id: p.siteId ?? undefined, status: p.status, from: p.from, to: p.to, search: p.search, page: p.page, pageSize: p.pageSize }), auth);
export const getSubmission = (id: number) => apiClient.get<SubmissionDetail>(`${B}/submissions/${id}`, undefined, auth);
/** PDFs show only what the person was shown (hidden sections and fields left out). */
export const submissionPdf = (id: number, mine?: boolean) => apiClient<Blob>(mine ? `${B}/me/submissions/${id}/pdf` : `${B}/submissions/${id}/pdf`, { ...auth, responseType: 'blob' });
export const submissionsPdf = (p: { formId?: number | null; siteId?: number | null; status?: string; from?: string; to?: string; search?: string }) =>
  apiClient<Blob>(`${B}/submissions/export.pdf`, { ...auth, responseType: 'blob', params: clean({ form_id: p.formId ?? undefined, site_id: p.siteId ?? undefined, status: p.status, from: p.from, to: p.to, search: p.search }) });

// me
export const mySummary = () => apiClient.get<MySummary>(`${B}/me/summary`, undefined, auth);
export const myRuns = (view: string, page = 1) => apiClient.get<Paged<MyRun>>(`${B}/me/runs`, { view, page, pageSize: 30 }, auth);
export const myOpenForms = () => apiClient.get<OpenForm[]>(`${B}/me/open-forms`, undefined, auth);
export const myRun = (id: number) => apiClient.get<FillPayload>(`${B}/me/runs/${id}`, undefined, auth);
export const myOpenForm = (id: number) => apiClient.get<FillPayload>(`${B}/me/open-forms/${id}`, undefined, auth);
export const mySubmissions = (page = 1) => apiClient.get<{ items: (SubmissionRow & { run_id: number | null })[] }>(`${B}/me/submissions`, { page, pageSize: 30 }, auth);
export const mySubmission = (id: number) => apiClient.get<SubmissionDetail>(`${B}/me/submissions/${id}`, undefined, auth);
export const putDraft = (key: string, formVersionId: number, values: Values) => apiClient.put<{ saved: boolean }>(`${B}/me/drafts/${key}`, { form_version_id: formVersionId, values }, auth);
export const deleteDraft = (key: string) => apiClient.delete<{ deleted: boolean }>(`${B}/me/drafts/${key}`, auth);
export const uploadAttachment = (file: File | Blob, name = 'file') => {
  const fd = new FormData();
  fd.append('file', file, (file as File).name || name);
  return apiClient.post<Attachment>(`${B}/attachments`, fd, auth);
};
export const submitForm = (body: { run_id?: number; assignment_id?: number; client_uuid: string; values: Values; geo?: { lat: number; lng: number; accuracy: number | null } | null; captured_at: string; site_id?: number }) =>
  apiClient.post<{ submission: { id: number; status: string }; duplicate: boolean }>(`${B}/submissions`, body, auth);
