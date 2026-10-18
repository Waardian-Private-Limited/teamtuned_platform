// Raw response shapes of /api/v1/recruitment (docs/RECRUITMENT_DESIGN.md §6.1).
// The API answers camelCase; a few nested shapes the contract leaves open are
// typed loosely here and normalised in recruitment.mapper.ts.

export type Ref = { id: number; name: string } | string | null | undefined;

export interface ListResponseDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  summary?: unknown;
}

export interface StageCountsDto {
  applied?: number;
  screening?: number;
  assessment?: number;
  interview?: number;
  offer?: number;
  hired?: number;
  rejected?: number;
}

export interface UpcomingInterviewDto {
  id: number;
  application?: { id: number; candidateName?: string; positionTitle?: string } | null;
  applicationId?: number;
  candidateName?: string;
  positionTitle?: string;
  position?: { id: number; title?: string } | null;
  roundName?: string;
  mode?: string;
  scheduledAt: string;
  durationMinutes?: number;
  status?: string;
}

export interface OverviewDto {
  openPositions: number;
  activeCandidates: number;
  byStage: StageCountsDto;
  interviewsToday: number;
  interviewsThisWeek: number;
  offersPending: number;
  hiredThisMonth: number;
  upcomingInterviews: UpcomingInterviewDto[];
}

export interface PositionListItemDto {
  id: number;
  title: string;
  slug: string;
  status: string;
  published: boolean | number;
  department?: Ref;
  role?: Ref;
  site?: Ref;
  locationText?: string | null;
  workMode?: string;
  openings: number;
  hiredCount: number;
  hiringManager?: Ref;
  recruiter?: Ref;
  closesOn?: string | null;
  counts?: StageCountsDto;
  createdAt?: string;
}

export interface InterviewRoundDto {
  key?: string;
  name: string;
  mode?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  interviewerIds?: number[];
  interviewer_ids?: number[];
  interviewers?: { id: number; name: string }[];
  criteria?: string[] | null;
}

export interface PositionFormDto {
  standard?: Record<string, string>;
  questions?: Array<{ key: string; label: string; type: string; required?: boolean | number; options?: string[] }>;
}

export interface PositionDetailDto extends PositionListItemDto {
  subOrganizationId?: number | null;
  subOrganization?: Ref;
  departmentId?: number | null;
  roleId?: number | null;
  employmentTypeId?: number | null;
  employmentType?: Ref;
  siteId?: number | null;
  hiringManagerEmployeeId?: number | null;
  recruiterEmployeeId?: number | null;
  experienceMin?: number | string | null;
  experienceMax?: number | string | null;
  salaryMin?: number | string | null;
  salaryMax?: number | string | null;
  salaryVisible?: boolean | number;
  description?: string | null;
  skills?: string[] | null;
  interviewPlan?: InterviewRoundDto[] | null;
  testId?: number | null;
  test?: Ref;
  form?: PositionFormDto | null;
  careersUrl?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
}

export interface ApplicationCardDto {
  id: number;
  candidate: {
    id: number;
    name: string;
    email?: string;
    phone?: string | null;
    currentTitle?: string | null;
    currentCompany?: string | null;
    totalExperience?: number | string | null;
  };
  stage: string;
  status: string;
  rating?: number | null;
  source?: string;
  appliedAt?: string;
  stageChangedAt?: string;
  nextInterview?: { at: string; roundName?: string } | null;
  test?: { status: string; result?: string | null; scorePercent?: number | null } | null;
  offer?: { status: string } | null;
  feedback?: { submitted: number; total: number; recommendation?: string | null } | null;
  position?: { id: number; title: string } | null;
}

export interface PipelineDto {
  position: PositionDetailDto;
  stages: Array<{ stage: string; items: ApplicationCardDto[]; more?: number; total?: number }>;
}

export interface TimelineEventDto {
  id: number;
  type: string;
  data?: Record<string, unknown> | null;
  actorName?: string | null;
  actor?: { name?: string } | null;
  createdAt: string;
}

export interface PanelistDto {
  employeeId: number;
  name: string;
  submitted?: boolean | number;
  recommendation?: string | null;
  rating?: number | null;
  notes?: string | null;
  criteriaRatings?: Record<string, number> | null;
  submittedAt?: string | null;
}

export interface InterviewDto {
  id: number;
  roundKey?: string | null;
  roundName: string;
  mode: string;
  scheduledAt: string;
  durationMinutes: number;
  location?: string | null;
  meetingUrl?: string | null;
  status: string;
  cancelReason?: string | null;
  criteria?: string[] | null;
  shareTests?: boolean | number | null;
  panel?: PanelistDto[];
  criteriaAverages?: Array<{ name: string; average: number | null; count: number }> | null;
}

export interface TestAttemptDto {
  id: number;
  testId?: number;
  testName?: string;
  name?: string;
  test?: { id: number; name: string } | null;
  status: string;
  result?: string | null;
  scorePercent?: number | null;
  autoScore?: number | null;
  manualScore?: number | null;
  maxScore?: number | null;
  sentAt?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  expiresAt?: string | null;
  /** §9.3 integrity risk; absent on attempts made before proctoring. */
  risk?: 'low' | 'medium' | 'high' | string | null;
  /** §9.4 Tuner's overall score of descriptive answers (0-100). */
  aiScore?: number | string | null;
}

export interface OfferSummaryDto {
  id: number;
  status: string;
  designation?: string | null;
  annualCtc?: number | string | null;
  joiningDate?: string | null;
  expiresOn?: string | null;
  sentAt?: string | null;
  respondedAt?: string | null;
}

export interface CandidateDto {
  id: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  totalExperience?: number | string | null;
  currentCompany?: string | null;
  currentTitle?: string | null;
  noticePeriodDays?: number | null;
  currentCtc?: number | string | null;
  expectedCtc?: number | string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  resumeName?: string | null;
  hasResume?: boolean;
  resumeKey?: string | null;
  source?: string;
  referredBy?: Ref;
  employeeId?: number | null;
}

export interface ApplicationDetailDto {
  application: {
    id: number;
    stage: string;
    status: string;
    rating?: number | null;
    source?: string;
    appliedAt?: string;
    stageChangedAt?: string;
    decidedAt?: string | null;
    rejectionReason?: string | null;
    owner?: Ref;
    ownerEmployeeId?: number | null;
    referredBy?: Ref;
    employeeId?: number | null;
  };
  candidate: CandidateDto;
  position: { id: number; title: string };
  answers?: Array<{ label: string; value: unknown }>;
  timeline?: TimelineEventDto[];
  interviews?: InterviewDto[];
  tests?: TestAttemptDto[];
  offer?: OfferSummaryDto | null;
  otherApplications?: Array<{ id: number; positionTitle: string; stage: string; status: string }>;
  permissions?: { manage?: boolean; offer?: boolean; hire?: boolean };
}

export interface OptionsDto {
  departments?: Array<{ id: number; name: string }>;
  roles?: Array<{ id: number; name: string; departmentId?: number | null }>;
  employmentTypes?: Array<{ id: number; name: string }>;
  sites?: Array<{ id: number; name: string }>;
  tests?: Array<{ id: number; name: string }>;
}

export interface EmployeeOptionDto {
  id: number;
  name: string;
  code?: string | null;
  designation?: string | null;
}

export interface ResumeUrlDto {
  url: string;
  expiresIn?: number;
  name?: string | null;
  /** Only PDF renders in the browser; Word files are downloaded. */
  type?: 'pdf' | 'word' | null;
}

/** A scorecard criterion from Recruitment settings; required ones must be rated by every panelist. */
export interface ScorecardCriterionDto {
  name: string;
  required: boolean;
}

/** GET /recruitment/scorecard-setup — what scheduling and the position editor offer. */
export interface ScorecardSetupDto {
  criteria: ScorecardCriterionDto[];
  testsMode: 'show' | 'hide' | 'ask';
  roundsMode: 'show' | 'hide' | 'ask';
}
