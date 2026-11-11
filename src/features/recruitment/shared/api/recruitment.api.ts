import { apiClient } from '@/lib/apiClient';
import type {
  ApplicationCardDto, ApplicationDetailDto, EmployeeOptionDto, ListResponseDto, OptionsDto, OverviewDto, PipelineDto,
  PositionDetailDto, PositionListItemDto, ResumeUrlDto, ScorecardSetupDto,
} from '../types/recruitment.dto';
import type { ManualCandidateInput, PositionForm, PositionInput, PositionStatus, ResumeScan, Stage } from '../types/recruitment.model';

/**
 * Base for every /api/v1/recruitment call. Sibling sub-features (interviews,
 * offers, settings, referrals) build on these helpers so auth and the base
 * path live in one place.
 */
export const RECRUITMENT_BASE = '/recruitment';

type Params = Record<string, string | number | boolean | undefined | null>;

export const recruitmentApi = {
  get: <T>(path: string, params?: Params) => apiClient.get<T>(`${RECRUITMENT_BASE}${path}`, params, { withAuth: true }),
  post: <T>(path: string, body?: unknown) => apiClient.post<T>(`${RECRUITMENT_BASE}${path}`, body, { withAuth: true }),
  put: <T>(path: string, body?: unknown) => apiClient.put<T>(`${RECRUITMENT_BASE}${path}`, body, { withAuth: true }),
  patch: <T>(path: string, body?: unknown) => apiClient.patch<T>(`${RECRUITMENT_BASE}${path}`, body, { withAuth: true }),
  delete: <T>(path: string) => apiClient.delete<T>(`${RECRUITMENT_BASE}${path}`, { withAuth: true }),
};

const blank = (v: string | null | undefined) => (v && v.trim() ? v.trim() : undefined);

/* -------------------------------- overview -------------------------------- */

export function getOverview() {
  return recruitmentApi.get<OverviewDto>('/overview');
}

/* -------------------------------- positions ------------------------------- */

export interface PositionListParams {
  search?: string;
  status?: string;
  departmentId?: number | null;
  siteId?: number | null;
  subOrgId?: number | null;
  mine?: boolean;
  page?: number;
  pageSize?: number;
}

export function listPositions(params: PositionListParams = {}) {
  return recruitmentApi.get<ListResponseDto<PositionListItemDto>>('/positions', {
    search: blank(params.search),
    status: params.status && params.status !== 'all' ? params.status : undefined,
    department_id: params.departmentId || undefined,
    site_id: params.siteId || undefined,
    sub_org_id: params.subOrgId || undefined,
    mine: params.mine ? 1 : undefined,
    page: params.page,
    pageSize: params.pageSize,
  });
}

export function getPosition(id: number) {
  return recruitmentApi.get<PositionDetailDto>(`/positions/${id}`);
}

const num = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? null : v);

export function positionBody(input: PositionInput) {
  const body: Record<string, unknown> = {
    title: input.title.trim(),
    department_id: input.departmentId,
    role_id: input.roleId,
    employment_type_id: input.employmentTypeId,
    site_id: input.siteId,
    location_text: blank(input.locationText) ?? null,
    work_mode: input.workMode,
    sub_organization_id: input.subOrganizationId,
    openings: input.openings,
    hiring_manager_employee_id: input.hiringManager?.id ?? null,
    recruiter_employee_id: input.recruiter?.id ?? null,
    experience_min: num(input.experienceMin),
    experience_max: num(input.experienceMax),
    salary_min: num(input.salaryMin),
    salary_max: num(input.salaryMax),
    salary_visible: input.salaryVisible,
    referral_reward_amount: num(input.referralRewardAmount),
    description: input.description,
    skills: input.skills,
    closes_on: blank(input.closesOn) ?? null,
    interview_plan: input.interviewPlan.map((r) => ({
      key: r.key,
      name: r.name.trim(),
      mode: r.mode,
      duration_minutes: r.durationMinutes,
      interviewer_ids: r.interviewers.map((i) => i.id).filter((id): id is number => id !== null),
      criteria: r.criteria,
    })),
    test_id: input.testId,
    form: formBody(input.form),
    published: input.published,
  };
  // PUT/POST accept only draft|open; paused/closed/filled change through PATCH /status.
  if (input.status === 'draft' || input.status === 'open') body.status = input.status;
  return body;
}

export function createPosition(input: PositionInput) {
  return recruitmentApi.post<PositionDetailDto>('/positions', positionBody(input));
}

export function updatePosition(id: number, input: PositionInput) {
  return recruitmentApi.put<PositionDetailDto>(`/positions/${id}`, positionBody(input));
}

export function setPositionStatus(id: number, status: Exclude<PositionStatus, 'draft' | 'filled'>, published?: boolean) {
  return recruitmentApi.patch<PositionDetailDto>(`/positions/${id}/status`, published === undefined ? { status } : { status, published });
}

export function getPipeline(positionId: number) {
  return recruitmentApi.get<PipelineDto>(`/positions/${positionId}/pipeline`);
}

/* ------------------------------ applications ------------------------------ */

export interface ApplicationListParams {
  search?: string;
  positionId?: number | null;
  stage?: string | null;
  status?: string | null;
  source?: string | null;
  ownerMe?: boolean;
  page?: number;
  pageSize?: number;
}

export function listApplications(params: ApplicationListParams = {}) {
  return recruitmentApi.get<ListResponseDto<ApplicationCardDto>>('/applications', {
    search: blank(params.search),
    position_id: params.positionId || undefined,
    stage: params.stage || undefined,
    status: params.status || undefined,
    source: params.source || undefined,
    owner: params.ownerMe ? 'me' : undefined,
    page: params.page,
    pageSize: params.pageSize,
  });
}

/**
 * Manual add (multipart). `candidate[...]` bracket fields nest into
 * `req.body.candidate` under multer; the same values also go flat (like the
 * referral form) so either reading works.
 */
/**
 * Adds a candidate by hand. With a position they go into its pipeline at Applied (answer: the application id);
 * without one they are saved as "Not assigned" (application id null).
 */
export async function addCandidate(input: ManualCandidateInput): Promise<{ applicationId: number | null }> {
  const fd = new FormData();
  Object.entries(input.fields).forEach(([k, v]) => {
    const value = blank(v);
    if (value === undefined && k !== 'first_name' && k !== 'last_name' && k !== 'email') return;
    fd.append(`candidate[${k}]`, value ?? '');
    fd.append(k, value ?? '');
  });
  if (input.referredByEmployeeId) fd.append('referred_by_employee_id', String(input.referredByEmployeeId));
  if (input.resume) fd.append('resume', input.resume);
  if (!input.positionId) {
    await recruitmentApi.post<{ id: number }>('/candidates', fd);
    return { applicationId: null };
  }
  fd.append('position_id', String(input.positionId));
  const res = await recruitmentApi.post<{ id: number }>('/applications', fd);
  return { applicationId: res && typeof res.id === 'number' ? res.id : null };
}

/** Tuner reads the resume into the Add candidate form. Nothing is saved. */
export function scanResume(file: File) {
  const fd = new FormData();
  fd.append('resume', file);
  return recruitmentApi.post<ResumeScan>('/candidates/resume-scan', fd);
}

export function getApplication(id: number) {
  return recruitmentApi.get<ApplicationDetailDto>(`/applications/${id}`);
}

export function moveStage(id: number, stage: Stage) {
  return recruitmentApi.patch<unknown>(`/applications/${id}/stage`, { stage });
}

export function rejectApplication(id: number, reason: string, notify: boolean) {
  return recruitmentApi.post<unknown>(`/applications/${id}/reject`, { reason, notify });
}

export function reopenApplication(id: number) {
  return recruitmentApi.post<unknown>(`/applications/${id}/reopen`);
}

export function updateApplication(id: number, patch: { rating?: number | null; ownerEmployeeId?: number | null; referredByEmployeeId?: number | null }) {
  const body: Record<string, unknown> = {};
  if (patch.rating !== undefined) body.rating = patch.rating;
  if (patch.ownerEmployeeId !== undefined) body.owner_employee_id = patch.ownerEmployeeId;
  if (patch.referredByEmployeeId !== undefined) body.referred_by_employee_id = patch.referredByEmployeeId;
  return recruitmentApi.patch<unknown>(`/applications/${id}`, body);
}

export function addNote(id: number, text: string) {
  return recruitmentApi.post<unknown>(`/applications/${id}/notes`, { text });
}

/* ------------------------------- candidates ------------------------------- */

export function getResumeUrl(candidateId: number) {
  return recruitmentApi.get<ResumeUrlDto>(`/candidates/${candidateId}/resume-url`);
}

export function updateCandidate(candidateId: number, body: Record<string, unknown>) {
  return recruitmentApi.put<unknown>(`/candidates/${candidateId}`, body);
}

/* --------------------------------- options -------------------------------- */

export function getOptions() {
  return recruitmentApi.get<OptionsDto>('/options');
}

export function searchEmployees(search: string) {
  return recruitmentApi.get<EmployeeOptionDto[] | { items: EmployeeOptionDto[] }>('/options/employees', { search: blank(search) });
}

/** Careers settings — only readable with RECRUIT_SETTINGS; used for the careers link when allowed. */
export function getSettings() {
  return recruitmentApi.get<{ careersSlug?: string | null; hostedEnabled?: boolean; hostedUrl?: string | null }>('/settings');
}

/** Criteria library + panel visibility for an application's position, or for a sub-organization (null = organization). */
export function getScorecardSetup(target: { applicationId: number } | { subOrganizationId: number | null }) {
  const params = 'applicationId' in target
    ? { application_id: target.applicationId }
    : target.subOrganizationId ? { sub_organization_id: target.subOrganizationId } : {};
  return recruitmentApi.get<ScorecardSetupDto>('/scorecard-setup', params);
}

/* --------------------------- company application form --------------------------- */

/** An application form as the API takes it (positions and the company default). */
function formBody(form: PositionForm) {
  return {
    standard: form.standard,
    questions: form.questions.map((q) => ({
      key: q.key,
      label: q.label.trim(),
      type: q.type,
      required: q.required,
      options: q.type === 'choice' ? q.options.map((o) => o.trim()).filter(Boolean) : [],
    })),
  };
}

export function getDefaultForm() {
  return recruitmentApi.get<{ form: PositionDetailDto['form']; custom: boolean }>('/settings/application-form');
}

/** Saves the company application form; null goes back to the built-in one. */
export function saveDefaultForm(form: PositionForm | null) {
  return recruitmentApi.put<{ form: PositionDetailDto['form']; custom: boolean }>('/settings/application-form', {
    form: form && formBody(form),
  });
}
