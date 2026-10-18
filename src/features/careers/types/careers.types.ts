// Public (no-login) recruitment shapes — RECRUITMENT_DESIGN.md §6.4.
// The server answers camelCase; anything the contract leaves loose (company
// as a string or an object, optional extras) is normalised in the api layer
// so components only ever see these types.

export type WorkMode = 'onsite' | 'hybrid' | 'remote';

export interface CareersCompany {
  name: string;
  logoUrl: string | null;
  intro: string | null;
}

export interface Range {
  min: number | null;
  max: number | null;
}

export interface PublicJob {
  slug: string;
  title: string;
  department: string | null;
  location: string | null;
  workMode: WorkMode | null;
  employmentType: string | null;
  experience: Range | null;
  salary: (Range & { currency?: string | null }) | null;
  closesOn: string | null;
  postedAt: string | null;
}

export interface JobFacets {
  departments: string[];
  locations: string[];
  workModes: WorkMode[];
}

export interface JobsPage {
  company: CareersCompany;
  items: PublicJob[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  /** Optional server-side facet lists; when absent the board derives them from the items it has seen. */
  facets: JobFacets | null;
}

export interface JobsQuery {
  search?: string;
  department?: string;
  location?: string;
  workMode?: WorkMode | '';
  page?: number;
}

export type FieldMode = 'off' | 'optional' | 'required';

export const STANDARD_FIELD_KEYS = [
  'phone',
  'city',
  'experience',
  'current_company',
  'notice_period',
  'current_ctc',
  'expected_ctc',
  'linkedin',
  'portfolio',
  'resume',
] as const;

export type StandardFieldKey = (typeof STANDARD_FIELD_KEYS)[number];

export type QuestionType = 'text' | 'long_text' | 'yes_no' | 'choice' | 'number';

export interface FormQuestion {
  key: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
}

export interface ApplicationFormConfig {
  standard: Record<StandardFieldKey, FieldMode>;
  questions: FormQuestion[];
}

export interface JobDetail extends PublicJob {
  description: string;
  skills: string[];
  form: ApplicationFormConfig;
}

export type ApplyResult = 'received' | 'already_applied';

// ---- Assessment ----------------------------------------------------------

export type TestStatus = 'sent' | 'started' | 'submitted' | 'expired' | 'cancelled';

/** §9.1 proctoring rules for this attempt (camelCase from the server). */
export interface TestProctoring {
  blockCopyPaste: boolean;
  requireFullscreen: boolean;
  /** null = never auto-submit on tab switches. */
  maxTabSwitches: number | null;
  shuffleOptions: boolean;
}

export interface TestInfo {
  company: CareersCompany;
  positionTitle: string;
  testName: string;
  durationMinutes: number;
  status: TestStatus;
  questionCount: number;
  startedAt: string | null;
  deadline: string | null;
  /** Server clock when the response was produced, if sent; used to correct client clock skew. */
  serverNow: string | null;
  /** Only when the server sends it before start; `start` always does (§9.1). */
  proctoring: TestProctoring | null;
}

export type TestQuestionType = 'single' | 'multiple' | 'text';

export interface TestQuestion {
  id: string;
  type: TestQuestionType;
  prompt: string;
  options: string[];
  marks: number | null;
}

export interface TestSession {
  questions: TestQuestion[];
  startedAt: string | null;
  deadline: string | null;
  serverNow: string | null;
  proctoring: TestProctoring | null;
}

/** Answer per question id: chosen option indexes for single/multiple, free text for text. */
export type TestAnswers = Record<string, number[] | string>;

// ---- Offer ---------------------------------------------------------------

export type OfferStatus = 'sent' | 'accepted' | 'declined' | 'withdrawn' | 'expired';

export interface OfferInfo {
  status: OfferStatus;
  company: CareersCompany;
  candidateName: string;
  designation: string;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  joiningDate: string | null;
  annualCtc: number | null;
  currency: string | null;
  probationMonths: number | null;
  noticePeriodDays: number | null;
  expiresOn: string | null;
  letterUrl: string | null;
  respondedAt: string | null;
  signatureName: string | null;
  responseNote: string | null;
}

export interface OfferResponseBody {
  decision: 'accept' | 'decline';
  signature_name?: string;
  note?: string;
}

// ---- Proctoring (§9.2) ----------------------------------------------------

export type TestEventType =
  | 'visibility_hidden'
  | 'visibility_visible'
  | 'window_blur'
  | 'window_focus'
  | 'fullscreen_exit'
  | 'fullscreen_enter'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'context_menu'
  | 'print'
  | 'shortcut_blocked'
  | 'multi_screen'
  | 'resize'
  | 'devtools'
  | 'offline'
  | 'online'
  | 'question_view';

export interface TestEvent {
  type: TestEventType;
  /** Client ISO time. */
  at: string;
  question_id?: string;
  data?: Record<string, string | number | boolean | null>;
}

export interface TestQuestionMetrics {
  timeMs: number;
  visits: number;
  answerChanges: number;
  typedChars: number;
  pastedChars: number;
  pasteCount: number;
  keystrokes: number;
  firstInputMs: number | null;
}

export interface TestMetricTotals {
  tabSwitches: number;
  awayMs: number;
  blurs: number;
  fullscreenExits: number;
  copies: number;
  pastes: number;
  contextMenus: number;
  prints: number;
  shortcutsBlocked: number;
}

export interface TestMetrics {
  questions: Record<string, TestQuestionMetrics>;
  totals: TestMetricTotals;
}
