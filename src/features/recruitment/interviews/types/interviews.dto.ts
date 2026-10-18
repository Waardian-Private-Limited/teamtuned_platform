// Wire shapes of the recruitment-interviews module (RECRUITMENT_DESIGN.md §6.2).

export type InterviewMode = 'in_person' | 'video' | 'phone';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type Recommendation = 'strong_yes' | 'yes' | 'no' | 'strong_no';

export interface InterviewPanelistDto {
  employeeId: number;
  name: string;
  submitted?: boolean | number;
  recommendation?: Recommendation | null;
  rating?: number | null;
  notes?: string | null;
  /** §10 — { criterion: 1–5 }; null when the scorecard has none (or is hidden). */
  criteriaRatings?: Record<string, number> | null;
  submittedAt?: string | null;
  isMe?: boolean;
}

/** §10 — per-criterion average across the submitted scorecards. */
export interface CriterionAverageDto {
  name: string;
  average: number | null;
  count: number;
}

/** §10 — a submitted test as the panel sees it when the interview shares tests. */
export interface SharedTestDto {
  id: number;
  testName: string | null;
  scorePercent: number | null;
  result: 'pending' | 'passed' | 'failed' | null;
  submittedAt: string | null;
}

export interface InterviewListItemDto {
  id: number;
  application: {
    id: number;
    candidateName: string;
    positionTitle: string;
    candidateId?: number;
    positionId?: number;
  };
  roundKey?: string | null;
  roundName: string;
  mode: InterviewMode;
  scheduledAt: string;
  durationMinutes: number;
  location?: string | null;
  meetingUrl?: string | null;
  status: InterviewStatus;
  cancelReason?: string | null;
  /** §10 rating criteria snapshotted on the interview. */
  criteria?: string[];
  /** The criteria panelists may skip; the rest are required (from the scorecard settings). */
  optionalCriteria?: string[];
  /** HR's answer when the settings say "ask": panelists see test results / earlier rounds. */
  shareTests?: boolean;
  shareRounds?: boolean;
  panel: InterviewPanelistDto[];
}

/** show = always to panelists, hide = never, ask = HR decides per interview. */
export type PanelVisibilityMode = 'show' | 'hide' | 'ask';

export interface InterviewVisibilityDto {
  testsMode: PanelVisibilityMode;
  roundsMode: PanelVisibilityMode;
  panelSeesTests: boolean;
  panelSeesRounds: boolean;
}

/** Candidate facts on an interview. Email and phone only for HR / hiring manager. */
export interface InterviewCandidateDto {
  id: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  currentTitle?: string | null;
  currentCompany?: string | null;
  totalExperience?: number | null;
  city?: string | null;
  noticePeriodDays?: number | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  hasResume?: boolean;
  resumeName?: string | null;
  resumeType?: 'pdf' | 'word' | null;
}

/** An earlier round of the same application, as shown to the next panel. */
export interface EarlierRoundDto {
  id: number;
  roundName: string;
  mode: InterviewMode;
  status: InterviewStatus;
  scheduledAt: string;
  durationMinutes: number;
  criteria: string[];
  feedback: { submitted: number; total: number; recommendation: Recommendation | null; criteria: CriterionAverageDto[] };
  /** Submitted scorecards only. */
  scorecards: InterviewPanelistDto[];
}

/** GET /interviews/:id — list item plus scorecards (others' only after own submission, server-decided). */
export interface InterviewDetailDto extends InterviewListItemDto {
  candidate?: InterviewCandidateDto | null;
  position?: { id: number; title: string } | null;
  myScorecard?: {
    recommendation?: Recommendation | null;
    rating?: number | null;
    notes?: string | null;
    criteriaRatings?: Record<string, number> | null;
    submittedAt?: string | null;
    submitted?: boolean;
  } | null;
  feedback?: { submitted: number; total: number; recommendation: Recommendation | null; criteria?: CriterionAverageDto[] } | null;
  /** §10 — the candidate's submitted tests: always for HR / hiring manager, for panelists only when shared. */
  tests?: SharedTestDto[];
  /** The application's earlier rounds (not cancelled) with their submitted scorecards, newest first. */
  earlierRounds?: EarlierRoundDto[];
  visibility?: InterviewVisibilityDto | null;
  scorecards?: InterviewPanelistDto[];
  isPanelist?: boolean;
  /** The viewer is on this round's panel and it is not cancelled. */
  canSubmit?: boolean;
  cancelReason?: string | null;
}

export interface ScheduleInterviewBody {
  round_key?: string | null;
  round_name: string;
  mode: InterviewMode;
  scheduled_at: string;
  duration_minutes: number;
  location?: string | null;
  meeting_url?: string | null;
  panel_employee_ids: number[];
  notify_candidate: boolean;
  /** §10 rating criteria (0–8 names); omitted = copy the plan round's. */
  criteria?: string[];
  share_tests?: boolean;
  share_rounds?: boolean;
}

export interface ScorecardBody {
  recommendation: Recommendation;
  rating: number;
  notes: string;
  /** §10 — every criterion of the interview, 1–5. */
  criteria_ratings?: Record<string, number>;
}

/* ---------------------------------- tests --------------------------------- */

export type QuestionType = 'single' | 'multiple' | 'text';

export interface TestListItemDto {
  id: number;
  name: string;
  description?: string | null;
  durationMinutes: number;
  passPercent: number;
  questionCount?: number | null;
  totalQuestions?: number;
  status: 'active' | 'archived';
}

export interface TestQuestionDto {
  id?: number;
  type: QuestionType;
  prompt: string;
  options?: string[] | null;
  answer?: Array<number | string> | null;
  /** Descriptive questions: what a good answer covers, for reviewers. */
  answerGuide?: string | null;
  marks: number;
}

/** §9.1 proctoring settings as the server returns them (camelCase). */
export interface ProctoringDto {
  blockCopyPaste?: boolean | null;
  requireFullscreen?: boolean | null;
  maxTabSwitches?: number | null;
  shuffleOptions?: boolean | null;
}

/** §9.1 proctoring settings as create/update bodies send them (snake_case). */
export interface ProctoringBody {
  block_copy_paste: boolean;
  require_fullscreen: boolean;
  max_tab_switches: number | null;
  shuffle_options: boolean;
}

export interface TestDetailDto extends TestListItemDto {
  questions: TestQuestionDto[];
  proctoring?: ProctoringDto | null;
}

export interface TestBody {
  name: string;
  description: string;
  duration_minutes: number;
  pass_percent: number;
  question_count: number | null;
  questions: Array<{ id?: number; type: QuestionType; prompt: string; options: string[]; answer: number[]; answer_guide?: string | null; marks: number }>;
  proctoring?: ProctoringBody;
}

export interface TestAttemptDetailDto {
  id: number;
  applicationId?: number;
  testId?: number;
  testName?: string;
  test?: { id: number; name: string } | null;
  candidateName?: string;
  status: 'sent' | 'started' | 'submitted' | 'expired' | 'cancelled' | string;
  result?: 'pending' | 'passed' | 'failed' | null;
  scorePercent?: number | null;
  autoScore?: number | string | null;
  manualScore?: number | string | null;
  maxScore?: number | string | null;
  passPercent?: number | null;
  durationMinutes?: number | null;
  sentAt?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  expiresAt?: string | null;
  questions: TestQuestionDto[];
  answers?: Record<string, Array<number> | string | null> | null;
  marks?: Record<string, number | null> | null;
  /** §9 — absent / null on attempts made before proctoring existed. */
  proctoring?: ProctoringDto | null;
  integrity?: IntegrityDto | null;
  aiReview?: AiReviewDto | null;
}

/* ------------------------- §9.3 integrity summary ------------------------- */

export type RiskLevel = 'low' | 'medium' | 'high';
export type ReasonSeverity = 'info' | 'warn' | 'high';

export interface IntegrityReasonDto {
  code: string;
  label: string;
  severity: ReasonSeverity | string;
}

export interface IntegrityCountersDto {
  tabSwitches?: number;
  awayMs?: number;
  blurs?: number;
  fullscreenExits?: number;
  copies?: number;
  pastes?: number;
  pasteBlocked?: number;
  contextMenus?: number;
  prints?: number;
  shortcutsBlocked?: number;
  resumes?: number;
  ipChanges?: number;
  deviceChanges?: number;
  multiScreen?: number | boolean;
  devtools?: number;
  offline?: number;
}

export interface IntegrityQuestionDto {
  timeMs?: number | null;
  visits?: number | null;
  answerChanges?: number | null;
  typedChars?: number | null;
  pastedChars?: number | null;
  pastedPercent?: number | null;
  pasteCount?: number | null;
  typingCpm?: number | null;
  firstInputMs?: number | null;
  flags?: string[] | null;
}

export interface IntegrityEventDto {
  type: string;
  at?: string | null;
  receivedAt?: string | null;
  questionId?: string | number | null;
  data?: Record<string, unknown> | null;
}

export interface IntegrityDto {
  risk?: RiskLevel | null;
  score?: number | null;
  reasons?: IntegrityReasonDto[] | null;
  counters?: IntegrityCountersDto | null;
  network?: { startIp?: string | null; lastIp?: string | null; startDevice?: string | null; lastDevice?: string | null } | null;
  timing?: { startedAt?: string | null; submittedAt?: string | null; durationMs?: number | null; fastAnswers?: number | null } | null;
  perQuestion?: Record<string, IntegrityQuestionDto> | null;
  autoSubmitted?: 'tab_switches' | 'deadline' | string | null;
  events?: IntegrityEventDto[] | null;
}

/* ---------------------------- §9.4 AI review ----------------------------- */

export type AiReviewStatus = 'none' | 'pending' | 'done' | 'failed';

export interface AiAnswerReviewDto {
  accuracy?: number | null;
  suggestedMarks?: number | null;
  aiLikelihood?: number | null;
  aiSignals?: string[] | null;
  covered?: string[] | null;
  missing?: string[] | null;
  feedback?: string | null;
}

export interface AiReviewDto {
  status?: AiReviewStatus | string | null;
  ranAt?: string | null;
  error?: string | null;
  overall?: { score?: number | null; aiLikelihood?: number | null; summary?: string | null } | null;
  answers?: Record<string, AiAnswerReviewDto> | null;
}
