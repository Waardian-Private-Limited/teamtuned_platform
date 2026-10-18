import { DEFAULT_STANDARD_FORM, STAGES } from '../constants/recruitment.constants';
import type {
  ApplicationCardDto, ApplicationDetailDto, CandidateDto, EmployeeOptionDto, InterviewRoundDto, ListResponseDto,
  OptionsDto, OverviewDto, PipelineDto, PositionDetailDto, PositionListItemDto, Ref, StageCountsDto,
} from './recruitment.dto';
import type {
  ApplicationCard, ApplicationDetail, ApplicationStatus, Candidate, EmployeeOption, FieldRule, InterviewMode,
  InterviewRound, NamedRef, Paged, Pipeline, Position, PositionDetail, PositionForm, PositionStatus, QuestionType,
  Recommendation, RecruitmentOptions, RecruitmentOverview, Source, Stage, StageCounts, StandardFieldKey, WorkMode,
} from './recruitment.model';

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const bool = (v: unknown) => v === true || v === 1 || v === '1' || v === 'true';

export function toRef(v: Ref, fallbackId?: number | null): NamedRef | null {
  if (v === null || v === undefined || v === '') {
    return fallbackId ? { id: fallbackId, name: `#${fallbackId}` } : null;
  }
  if (typeof v === 'string') return { id: fallbackId ?? null, name: v };
  return { id: numOrNull(v.id), name: str(v.name) };
}

function isStage(v: unknown): v is Stage {
  return typeof v === 'string' && (STAGES as readonly string[]).includes(v);
}

const asStage = (v: unknown): Stage => (isStage(v) ? v : 'applied');
const asStatus = (v: unknown): ApplicationStatus =>
  v === 'hired' || v === 'rejected' || v === 'withdrawn' ? v : 'active';
const asSource = (v: unknown): Source =>
  v === 'careers' || v === 'api' || v === 'referral' ? v : 'manual';
const asWorkMode = (v: unknown): WorkMode => (v === 'hybrid' || v === 'remote' ? v : 'onsite');
const asPositionStatus = (v: unknown): PositionStatus =>
  v === 'open' || v === 'paused' || v === 'closed' || v === 'filled' ? v : 'draft';
const asMode = (v: unknown): InterviewMode => (v === 'in_person' || v === 'phone' ? v : 'video');
const asRecommendation = (v: unknown): Recommendation | null =>
  v === 'strong_yes' || v === 'yes' || v === 'no' || v === 'strong_no' ? v : null;
const asRule = (v: unknown, fallback: FieldRule): FieldRule =>
  v === 'off' || v === 'optional' || v === 'required' ? v : fallback;
const asQuestionType = (v: unknown): QuestionType =>
  v === 'long_text' || v === 'yes_no' || v === 'choice' || v === 'number' ? v : 'text';

export function toStageCounts(dto?: StageCountsDto | null): StageCounts {
  const c = dto || {};
  return {
    applied: Number(c.applied) || 0,
    screening: Number(c.screening) || 0,
    assessment: Number(c.assessment) || 0,
    interview: Number(c.interview) || 0,
    offer: Number(c.offer) || 0,
    hired: Number(c.hired) || 0,
    rejected: Number(c.rejected) || 0,
  };
}

export function toPaged<D, M>(dto: ListResponseDto<D> | D[] | null | undefined, map: (d: D) => M): Paged<M> {
  if (Array.isArray(dto)) return { items: dto.map(map), page: 1, pageSize: dto.length, total: dto.length, pages: 1 };
  const items = (dto?.items || []).map(map);
  return {
    items,
    page: Number(dto?.page) || 1,
    pageSize: Number(dto?.pageSize) || items.length,
    total: Number(dto?.total) || 0,
    pages: Number(dto?.pages) || 0,
  };
}

export function toOverview(dto: OverviewDto): RecruitmentOverview {
  return {
    openPositions: Number(dto?.openPositions) || 0,
    activeCandidates: Number(dto?.activeCandidates) || 0,
    byStage: toStageCounts(dto?.byStage),
    interviewsToday: Number(dto?.interviewsToday) || 0,
    interviewsThisWeek: Number(dto?.interviewsThisWeek) || 0,
    offersPending: Number(dto?.offersPending) || 0,
    hiredThisMonth: Number(dto?.hiredThisMonth) || 0,
    upcomingInterviews: (dto?.upcomingInterviews || []).map((i) => ({
      id: i.id,
      applicationId: numOrNull(i.application?.id ?? i.applicationId),
      candidateName: str(i.application?.candidateName ?? i.candidateName),
      positionTitle: str(i.application?.positionTitle ?? i.positionTitle ?? i.position?.title),
      roundName: str(i.roundName),
      mode: str(i.mode),
      scheduledAt: i.scheduledAt,
      durationMinutes: Number(i.durationMinutes) || 0,
    })),
  };
}

export function toPosition(dto: PositionListItemDto): Position {
  return {
    id: dto.id,
    title: str(dto.title),
    slug: str(dto.slug),
    status: asPositionStatus(dto.status),
    published: bool(dto.published),
    department: toRef(dto.department),
    role: toRef(dto.role),
    site: toRef(dto.site),
    locationText: str(dto.locationText),
    workMode: asWorkMode(dto.workMode),
    openings: Number(dto.openings) || 0,
    hiredCount: Number(dto.hiredCount) || 0,
    hiringManager: toRef(dto.hiringManager),
    recruiter: toRef(dto.recruiter),
    closesOn: dto.closesOn ? String(dto.closesOn).slice(0, 10) : null,
    counts: toStageCounts(dto.counts),
    createdAt: dto.createdAt || null,
  };
}

let keySeq = 0;
export function newKey(prefix = 'k') {
  keySeq += 1;
  return `${prefix}_${Date.now().toString(36)}${keySeq.toString(36)}`;
}

function toRound(r: InterviewRoundDto): InterviewRound {
  const ids = (r.interviewerIds || r.interviewer_ids || []).map(Number).filter(Boolean);
  const named = r.interviewers || [];
  return {
    key: r.key || newKey('round'),
    name: str(r.name),
    mode: asMode(r.mode),
    durationMinutes: Number(r.durationMinutes ?? r.duration_minutes) || 45,
    interviewers: ids.length
      ? ids.map((id) => ({ id, name: named.find((n) => Number(n.id) === id)?.name || `Employee #${id}` }))
      : named.map((n) => ({ id: Number(n.id), name: str(n.name) })),
    criteria: Array.isArray(r.criteria) ? r.criteria.map((c) => str(c)).filter(Boolean) : [],
  };
}

/** { criterion: 1–5 } from the wire, or null. */
export function toCriteriaRatings(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => { const n = Number(v); if (Number.isFinite(n)) out[k] = n; });
  return Object.keys(out).length ? out : null;
}

export function toPositionForm(dto?: PositionDetailDto['form']): PositionForm {
  const standard = { ...DEFAULT_STANDARD_FORM };
  const raw = dto?.standard || {};
  (Object.keys(standard) as StandardFieldKey[]).forEach((k) => {
    if (raw[k] !== undefined) standard[k] = asRule(raw[k], standard[k]);
  });
  return {
    standard,
    questions: (dto?.questions || []).map((q) => ({
      key: q.key || newKey('q'),
      label: str(q.label),
      type: asQuestionType(q.type),
      required: bool(q.required),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
    })),
  };
}

export function toPositionDetail(dto: PositionDetailDto): PositionDetail {
  const base = toPosition(dto);
  const departmentId = numOrNull(dto.departmentId) ?? base.department?.id ?? null;
  const hmId = numOrNull(dto.hiringManagerEmployeeId) ?? base.hiringManager?.id ?? null;
  const recId = numOrNull(dto.recruiterEmployeeId) ?? base.recruiter?.id ?? null;
  return {
    ...base,
    department: base.department ? { ...base.department, id: base.department.id ?? departmentId } : null,
    hiringManager: base.hiringManager ? { ...base.hiringManager, id: base.hiringManager.id ?? hmId } : toRef(null, hmId),
    recruiter: base.recruiter ? { ...base.recruiter, id: base.recruiter.id ?? recId } : toRef(null, recId),
    subOrganizationId: numOrNull(dto.subOrganizationId) ?? toRef(dto.subOrganization)?.id ?? null,
    departmentId,
    roleId: numOrNull(dto.roleId) ?? base.role?.id ?? null,
    employmentTypeId: numOrNull(dto.employmentTypeId) ?? toRef(dto.employmentType)?.id ?? null,
    employmentType: toRef(dto.employmentType),
    siteId: numOrNull(dto.siteId) ?? base.site?.id ?? null,
    hiringManagerId: hmId,
    recruiterId: recId,
    experienceMin: numOrNull(dto.experienceMin),
    experienceMax: numOrNull(dto.experienceMax),
    salaryMin: numOrNull(dto.salaryMin),
    salaryMax: numOrNull(dto.salaryMax),
    salaryVisible: bool(dto.salaryVisible),
    description: str(dto.description),
    skills: Array.isArray(dto.skills) ? dto.skills.map(String) : [],
    interviewPlan: (dto.interviewPlan || []).map(toRound),
    testId: numOrNull(dto.testId) ?? toRef(dto.test)?.id ?? null,
    test: toRef(dto.test),
    form: toPositionForm(dto.form),
    careersUrl: dto.careersUrl || null,
  };
}

export function toApplicationCard(dto: ApplicationCardDto): ApplicationCard {
  const c = dto.candidate || ({} as ApplicationCardDto['candidate']);
  return {
    id: dto.id,
    candidate: {
      id: Number(c.id) || 0,
      name: str(c.name) || str(c.email),
      email: str(c.email),
      phone: str(c.phone),
      currentTitle: str(c.currentTitle),
      currentCompany: str(c.currentCompany),
      totalExperience: numOrNull(c.totalExperience),
    },
    stage: asStage(dto.stage),
    status: asStatus(dto.status),
    rating: numOrNull(dto.rating),
    source: asSource(dto.source),
    appliedAt: dto.appliedAt || null,
    stageChangedAt: dto.stageChangedAt || null,
    nextInterview: dto.nextInterview?.at ? { at: dto.nextInterview.at, roundName: str(dto.nextInterview.roundName) } : null,
    test: dto.test ? { status: str(dto.test.status), result: dto.test.result || null, scorePercent: numOrNull(dto.test.scorePercent) } : null,
    offer: dto.offer ? { status: str(dto.offer.status) } : null,
    feedback: dto.feedback
      ? { submitted: Number(dto.feedback.submitted) || 0, total: Number(dto.feedback.total) || 0, recommendation: dto.feedback.recommendation || null }
      : null,
    position: dto.position ? { id: dto.position.id, title: str(dto.position.title) } : null,
  };
}

export function toPipeline(dto: PipelineDto): Pipeline {
  return {
    position: toPositionDetail(dto.position),
    columns: (dto.stages || [])
      .filter((s) => isStage(s.stage))
      .map((s) => ({
        stage: s.stage as Stage,
        items: (s.items || []).map(toApplicationCard),
        more: Number(s.more) || 0,
      })),
  };
}

function candidateName(c: CandidateDto) {
  const full = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  return str(c.name) || full || str(c.email);
}

export function toCandidate(c: CandidateDto): Candidate {
  return {
    id: c.id,
    name: candidateName(c),
    firstName: str(c.firstName),
    lastName: str(c.lastName),
    email: str(c.email),
    phone: str(c.phone),
    city: str(c.city),
    totalExperience: numOrNull(c.totalExperience),
    currentCompany: str(c.currentCompany),
    currentTitle: str(c.currentTitle),
    noticePeriodDays: numOrNull(c.noticePeriodDays),
    currentCtc: numOrNull(c.currentCtc),
    expectedCtc: numOrNull(c.expectedCtc),
    linkedinUrl: str(c.linkedinUrl),
    portfolioUrl: str(c.portfolioUrl),
    resumeName: str(c.resumeName),
    hasResume: c.hasResume !== undefined ? Boolean(c.hasResume) : Boolean(c.resumeName || c.resumeKey),
    employeeId: numOrNull(c.employeeId),
  };
}

function answerValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.map(String).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function toApplicationDetail(dto: ApplicationDetailDto): ApplicationDetail {
  const a = dto.application;
  return {
    id: a.id,
    stage: asStage(a.stage),
    status: asStatus(a.status),
    rating: numOrNull(a.rating),
    source: asSource(a.source ?? dto.candidate?.source),
    appliedAt: a.appliedAt || null,
    stageChangedAt: a.stageChangedAt || null,
    rejectionReason: str(a.rejectionReason),
    owner: toRef(a.owner, numOrNull(a.ownerEmployeeId)),
    referredBy: toRef(a.referredBy ?? dto.candidate?.referredBy),
    employeeId: numOrNull(a.employeeId),
    candidate: toCandidate(dto.candidate),
    position: { id: dto.position?.id, title: str(dto.position?.title) },
    answers: (dto.answers || []).map((x) => ({ label: str(x.label), value: answerValue(x.value) })),
    timeline: (dto.timeline || []).map((e) => ({
      id: e.id,
      type: str(e.type),
      data: (e.data && typeof e.data === 'object' ? e.data : {}) as Record<string, unknown>,
      actorName: str(e.actorName ?? e.actor?.name),
      createdAt: e.createdAt,
    })),
    interviews: (dto.interviews || []).map((i) => ({
      id: i.id,
      roundName: str(i.roundName),
      mode: asMode(i.mode),
      scheduledAt: i.scheduledAt,
      durationMinutes: Number(i.durationMinutes) || 0,
      location: str(i.location),
      meetingUrl: str(i.meetingUrl),
      status: str(i.status) || 'scheduled',
      cancelReason: str(i.cancelReason),
      criteria: Array.isArray(i.criteria) ? i.criteria.map((c) => str(c)).filter(Boolean) : [],
      shareTests: bool(i.shareTests),
      panel: (i.panel || []).map((p) => ({
        employeeId: Number(p.employeeId),
        name: str(p.name),
        submitted: bool(p.submitted) || Boolean(p.submittedAt),
        recommendation: asRecommendation(p.recommendation),
        rating: numOrNull(p.rating),
        notes: str(p.notes),
        criteriaRatings: toCriteriaRatings(p.criteriaRatings),
      })),
      criteriaAverages: (i.criteriaAverages || []).map((c) => ({ name: str(c.name), average: numOrNull(c.average), count: Number(c.count) || 0 })),
    })),
    tests: (dto.tests || []).map((t) => {
      const max = numOrNull(t.maxScore);
      const score = numOrNull(t.manualScore) ?? numOrNull(t.autoScore);
      const pct = numOrNull(t.scorePercent) ?? (max && score !== null ? Math.round((score / max) * 100) : null);
      return {
        id: t.id,
        testName: str(t.testName ?? t.name ?? t.test?.name) || 'Assessment',
        status: str(t.status),
        result: t.result || null,
        scorePercent: pct,
        sentAt: t.sentAt || t.createdAt || null,
        submittedAt: t.submittedAt || null,
        expiresAt: t.expiresAt || null,
        risk: t.risk === 'low' || t.risk === 'medium' || t.risk === 'high' ? t.risk : null,
        aiScore: numOrNull(t.aiScore),
      };
    }),
    offer: dto.offer
      ? {
          id: dto.offer.id,
          status: str(dto.offer.status),
          designation: str(dto.offer.designation),
          annualCtc: numOrNull(dto.offer.annualCtc),
          joiningDate: dto.offer.joiningDate ? String(dto.offer.joiningDate).slice(0, 10) : null,
          expiresOn: dto.offer.expiresOn ? String(dto.offer.expiresOn).slice(0, 10) : null,
          sentAt: dto.offer.sentAt || null,
          respondedAt: dto.offer.respondedAt || null,
        }
      : null,
    otherApplications: (dto.otherApplications || []).map((o) => ({
      id: o.id,
      positionTitle: str(o.positionTitle),
      stage: asStage(o.stage),
      status: asStatus(o.status),
    })),
    permissions: {
      manage: Boolean(dto.permissions?.manage),
      offer: Boolean(dto.permissions?.offer),
      hire: Boolean(dto.permissions?.hire),
    },
  };
}

export function toOptions(dto: OptionsDto): RecruitmentOptions {
  const named = (rows?: Array<{ id: number; name: string }>) => (rows || []).map((r) => ({ id: Number(r.id), name: str(r.name) }));
  return {
    departments: named(dto?.departments),
    roles: (dto?.roles || []).map((r) => ({ id: Number(r.id), name: str(r.name), departmentId: numOrNull(r.departmentId) })),
    employmentTypes: named(dto?.employmentTypes),
    sites: named(dto?.sites),
    tests: named(dto?.tests),
  };
}

export function toEmployeeOptions(dto: EmployeeOptionDto[] | { items?: EmployeeOptionDto[] } | null | undefined): EmployeeOption[] {
  const rows = Array.isArray(dto) ? dto : dto?.items || [];
  return rows.map((e) => ({ id: Number(e.id), name: str(e.name), code: str(e.code), designation: str(e.designation) }));
}
