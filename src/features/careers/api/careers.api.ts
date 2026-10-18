// Public recruitment endpoints (RECRUITMENT_DESIGN.md §6.4). These pages have
// no session, so this deliberately does not use the shared apiClient: that one
// sends cookies and bounces any 401 to /login, neither of which a candidate
// should ever hit. Plain fetch, no credentials, configured API base.
import { API_BASE_URL } from '@/config/env';
import {
  STANDARD_FIELD_KEYS,
  type ApplicationFormConfig,
  type ApplyResult,
  type CareersCompany,
  type FieldMode,
  type FormQuestion,
  type JobDetail,
  type JobFacets,
  type JobsPage,
  type JobsQuery,
  type OfferInfo,
  type OfferResponseBody,
  type OfferStatus,
  type PublicJob,
  type QuestionType,
  type Range,
  type StandardFieldKey,
  type TestAnswers,
  type TestEvent,
  type TestInfo,
  type TestMetrics,
  type TestProctoring,
  type TestQuestion,
  type TestQuestionType,
  type TestSession,
  type TestStatus,
  type WorkMode,
} from '../types/careers.types';

export class PublicApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly field?: string
  ) {
    super(message);
    this.name = 'PublicApiError';
  }
}

type Params = Record<string, string | number | undefined | null>;

async function request<T>(
  path: string,
  {
    method = 'GET',
    params,
    body,
    signal,
    keepalive,
  }: { method?: 'GET' | 'POST'; params?: Params; body?: unknown; signal?: AbortSignal; keepalive?: boolean } = {}
): Promise<T> {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, String(v));
  });
  const qs = search.toString();
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`, {
      method,
      credentials: 'omit',
      cache: 'no-store',
      signal,
      keepalive: keepalive || undefined,
      headers: isForm || body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: isForm ? (body as FormData) : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') throw err;
    throw new PublicApiError('We could not reach the server. Check your connection and try again.', 0);
  }

  const raw = await res.text().catch(() => '');
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const d = (data ?? {}) as { message?: unknown; code?: unknown; field?: unknown };
    const fallback =
      res.status === 429
        ? 'Too many attempts. Please wait a minute and try again.'
        : res.status >= 500
          ? 'Something went wrong on our side. Please try again.'
          : 'Request failed.';
    throw new PublicApiError(
      typeof d.message === 'string' && d.message ? d.message : fallback,
      res.status,
      typeof d.code === 'string' ? d.code : undefined,
      typeof d.field === 'string' ? d.field : undefined
    );
  }
  return data as T;
}

// ---- normalisers (the contract is new; stay tolerant of null / missing) ---

type Loose = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : typeof v === 'number' ? String(v) : null);
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Loose => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Loose) : {});

function toCompany(v: unknown): CareersCompany {
  if (typeof v === 'string') return { name: v, logoUrl: null, intro: null };
  const o = obj(v);
  return { name: str(o.name) ?? '', logoUrl: str(o.logoUrl), intro: str(o.intro) };
}

function toRange(v: unknown): Range | null {
  const o = obj(v);
  const min = num(o.min);
  const max = num(o.max);
  return min === null && max === null ? null : { min, max };
}

const WORK_MODES: WorkMode[] = ['onsite', 'hybrid', 'remote'];
const toWorkMode = (v: unknown): WorkMode | null => (WORK_MODES.includes(v as WorkMode) ? (v as WorkMode) : null);

function toJob(v: unknown): PublicJob {
  const o = obj(v);
  const salary = toRange(o.salary);
  return {
    slug: str(o.slug) ?? '',
    title: str(o.title) ?? 'Untitled role',
    department: str(o.department),
    location: str(o.location),
    workMode: toWorkMode(o.workMode),
    employmentType: str(o.employmentType),
    experience: toRange(o.experience),
    salary: salary ? { ...salary, currency: str(obj(o.salary).currency) } : null,
    closesOn: str(o.closesOn),
    postedAt: str(o.postedAt),
  };
}

function toFacets(v: unknown): JobFacets | null {
  if (!v || typeof v !== 'object') return null;
  const o = obj(v);
  const strings = (x: unknown) => arr(x).map(str).filter((s): s is string => Boolean(s));
  return {
    departments: strings(o.departments),
    locations: strings(o.locations),
    workModes: arr(o.workModes).map(toWorkMode).filter((m): m is WorkMode => Boolean(m)),
  };
}

const FIELD_MODES: FieldMode[] = ['off', 'optional', 'required'];
const QUESTION_TYPES: QuestionType[] = ['text', 'long_text', 'yes_no', 'choice', 'number'];
const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function toForm(v: unknown): ApplicationFormConfig {
  const o = obj(v);
  const std = obj(o.standard);
  const standard = {} as Record<StandardFieldKey, FieldMode>;
  STANDARD_FIELD_KEYS.forEach((key) => {
    const mode = std[key] ?? std[camel(key)];
    standard[key] = FIELD_MODES.includes(mode as FieldMode) ? (mode as FieldMode) : 'off';
  });
  const questions: FormQuestion[] = arr(o.questions)
    .map((q) => {
      const qo = obj(q);
      const type = QUESTION_TYPES.includes(qo.type as QuestionType) ? (qo.type as QuestionType) : 'text';
      return {
        key: str(qo.key) ?? '',
        label: str(qo.label) ?? '',
        type,
        required: Boolean(qo.required),
        options: arr(qo.options).map(str).filter((s): s is string => Boolean(s)),
      };
    })
    .filter((q) => q.key && q.label && (q.type !== 'choice' || q.options.length > 0));
  return { standard, questions };
}

function toJobDetail(v: unknown): JobDetail {
  const o = obj(v);
  return {
    ...toJob(o),
    description: str(o.description) ?? '',
    skills: arr(o.skills).map(str).filter((s): s is string => Boolean(s)),
    form: toForm(o.form),
  };
}

function toProctoring(v: unknown): TestProctoring | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Loose;
  const flag = (camelKey: string, snakeKey: string, fallback: boolean) => {
    const x = o[camelKey] ?? o[snakeKey];
    return typeof x === 'boolean' ? x : fallback;
  };
  const max = num(o.maxTabSwitches ?? o.max_tab_switches);
  return {
    blockCopyPaste: flag('blockCopyPaste', 'block_copy_paste', true),
    requireFullscreen: flag('requireFullscreen', 'require_fullscreen', false),
    maxTabSwitches: max !== null && max > 0 ? Math.floor(max) : null,
    shuffleOptions: flag('shuffleOptions', 'shuffle_options', true),
  };
}

const TEST_STATUSES: TestStatus[] = ['sent', 'started', 'submitted', 'expired', 'cancelled'];

function toTestInfo(v: unknown): TestInfo {
  const o = obj(v);
  return {
    company: toCompany(o.company),
    positionTitle: str(o.positionTitle) ?? '',
    testName: str(o.testName) ?? 'Assessment',
    durationMinutes: num(o.durationMinutes) ?? 0,
    status: TEST_STATUSES.includes(o.status as TestStatus) ? (o.status as TestStatus) : 'sent',
    questionCount: num(o.questionCount) ?? 0,
    startedAt: str(o.startedAt),
    deadline: str(o.deadline),
    serverNow: str(o.serverNow) ?? str(o.now),
    proctoring: toProctoring(o.proctoring),
  };
}

const Q_TYPES: TestQuestionType[] = ['single', 'multiple', 'text'];

function toTestSession(v: unknown): TestSession {
  const o = Array.isArray(v) ? { questions: v } : obj(v);
  const questions: TestQuestion[] = arr(o.questions).map((q, i) => {
    const qo = obj(q);
    return {
      id: str(qo.id) ?? String(i + 1),
      type: Q_TYPES.includes(qo.type as TestQuestionType) ? (qo.type as TestQuestionType) : 'text',
      prompt: str(qo.prompt) ?? '',
      options: arr(qo.options).map((x) => (typeof x === 'string' ? x : String(x ?? ''))),
      marks: num(qo.marks),
    };
  });
  return {
    questions,
    startedAt: str(o.startedAt),
    deadline: str(o.deadline),
    serverNow: str(o.serverNow) ?? str(o.now),
    proctoring: toProctoring(o.proctoring),
  };
}

const OFFER_STATUSES: OfferStatus[] = ['sent', 'accepted', 'declined', 'withdrawn', 'expired'];

/** `letterUrl`: the letter is streamed on demand from the offer link (nothing stored). */
function toOffer(v: unknown, token: string): OfferInfo {
  const root = obj(v);
  const o = root.offer && typeof root.offer === 'object' ? { ...root, ...obj(root.offer) } : root;
  return {
    status: OFFER_STATUSES.includes(o.status as OfferStatus) ? (o.status as OfferStatus) : 'sent',
    company: toCompany(o.company),
    candidateName: str(o.candidateName) ?? '',
    designation: str(o.designation) ?? str(o.positionTitle) ?? '',
    department: str(o.department),
    location: str(o.location) ?? str(o.site),
    employmentType: str(o.employmentType),
    joiningDate: str(o.joiningDate),
    annualCtc: num(o.annualCtc),
    currency: str(o.currency),
    probationMonths: num(o.probationMonths),
    noticePeriodDays: num(o.noticePeriodDays),
    expiresOn: str(o.expiresOn),
    letterUrl: o.letterAvailable ? `${API_BASE_URL}${offerPath(token)}/letter` : null,
    respondedAt: str(o.respondedAt),
    signatureName: str(o.signatureName),
    responseNote: str(o.responseNote),
  };
}

// ---- endpoints -------------------------------------------------------------

const enc = encodeURIComponent;
const hosted = (slug: string) => `/public/careers/hosted/${enc(slug)}`;

export async function fetchHostedJobs(slug: string, q: JobsQuery, signal?: AbortSignal): Promise<JobsPage> {
  const data = obj(
    await request<unknown>(`${hosted(slug)}/jobs`, {
      params: { search: q.search, department: q.department, location: q.location, work_mode: q.workMode, page: q.page },
      signal,
    })
  );
  const items = arr(data.items).map(toJob).filter((j) => j.slug);
  return {
    company: toCompany(data.company),
    items,
    page: num(data.page) ?? 1,
    pageSize: num(data.pageSize) ?? (items.length || 10),
    total: num(data.total) ?? items.length,
    pages: Math.max(1, num(data.pages) ?? 1),
    facets: toFacets(data.facets ?? data.filters),
  };
}

export async function fetchHostedJob(slug: string, jobSlug: string, signal?: AbortSignal): Promise<JobDetail> {
  return toJobDetail(await request<unknown>(`${hosted(slug)}/jobs/${enc(jobSlug)}`, { signal }));
}

export async function submitHostedApplication(slug: string, jobSlug: string, form: FormData): Promise<ApplyResult> {
  const data = obj(await request<unknown>(`${hosted(slug)}/jobs/${enc(jobSlug)}/applications`, { method: 'POST', body: form }));
  return data.status === 'already_applied' ? 'already_applied' : 'received';
}

const testPath = (token: string) => `/public/recruitment/tests/${enc(token)}`;

export async function fetchTest(token: string, signal?: AbortSignal): Promise<TestInfo> {
  return toTestInfo(await request<unknown>(testPath(token), { signal }));
}

export async function startTest(token: string): Promise<TestSession> {
  return toTestSession(await request<unknown>(`${testPath(token)}/start`, { method: 'POST', body: {} }));
}

export async function submitTest(token: string, answers: TestAnswers, metrics?: TestMetrics): Promise<void> {
  await request<unknown>(`${testPath(token)}/submit`, { method: 'POST', body: metrics ? { answers, metrics } : { answers } });
}

/**
 * §9.2 monitoring batch (≤100 events, body ≤64 KB) with an optional answers draft
 * (server-side autosave). `keepalive` lets the request outlive a hidden / closing tab.
 */
export async function sendTestEvents(
  token: string,
  body: { events: TestEvent[]; answers?: TestAnswers },
  opts: { keepalive?: boolean } = {}
): Promise<void> {
  await request<unknown>(`${testPath(token)}/events`, { method: 'POST', body, keepalive: opts.keepalive });
}

const offerPath = (token: string) => `/public/recruitment/offers/${enc(token)}`;

export async function fetchOffer(token: string, signal?: AbortSignal): Promise<OfferInfo> {
  return toOffer(await request<unknown>(offerPath(token), { signal }), token);
}

export async function respondToOffer(token: string, body: OfferResponseBody): Promise<void> {
  await request<unknown>(`${offerPath(token)}/respond`, { method: 'POST', body });
}
