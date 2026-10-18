// Screen-facing shapes. Every nested reference is normalised to NamedRef so
// components never branch on "string or object".

export type Stage = 'applied' | 'screening' | 'assessment' | 'interview' | 'offer' | 'hired';
export type ApplicationStatus = 'active' | 'hired' | 'rejected' | 'withdrawn';
export type PositionStatus = 'draft' | 'open' | 'paused' | 'closed' | 'filled';
export type WorkMode = 'onsite' | 'hybrid' | 'remote';
export type Source = 'careers' | 'api' | 'referral' | 'manual';
export type InterviewMode = 'in_person' | 'video' | 'phone';
export type Recommendation = 'strong_yes' | 'yes' | 'no' | 'strong_no';
export type FieldRule = 'off' | 'optional' | 'required';
export type QuestionType = 'text' | 'long_text' | 'yes_no' | 'choice' | 'number';

export interface NamedRef {
  id: number | null;
  name: string;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export type StageCounts = Record<Stage | 'rejected', number>;

export interface UpcomingInterview {
  id: number;
  applicationId: number | null;
  candidateName: string;
  positionTitle: string;
  roundName: string;
  mode: string;
  scheduledAt: string;
  durationMinutes: number;
}

export interface RecruitmentOverview {
  openPositions: number;
  activeCandidates: number;
  byStage: StageCounts;
  interviewsToday: number;
  interviewsThisWeek: number;
  offersPending: number;
  hiredThisMonth: number;
  upcomingInterviews: UpcomingInterview[];
}

export interface Position {
  id: number;
  title: string;
  slug: string;
  status: PositionStatus;
  published: boolean;
  department: NamedRef | null;
  role: NamedRef | null;
  site: NamedRef | null;
  locationText: string;
  workMode: WorkMode;
  openings: number;
  hiredCount: number;
  hiringManager: NamedRef | null;
  recruiter: NamedRef | null;
  closesOn: string | null;
  counts: StageCounts;
  createdAt: string | null;
}

export interface InterviewRound {
  key: string;
  name: string;
  mode: InterviewMode;
  durationMinutes: number;
  interviewers: NamedRef[];
  /** §10 rating criteria panelists score 1–5. */
  criteria: string[];
}

export interface FormQuestion {
  key: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
}

export type StandardFieldKey =
  | 'phone' | 'city' | 'experience' | 'current_company' | 'notice_period'
  | 'current_ctc' | 'expected_ctc' | 'linkedin' | 'portfolio' | 'resume';

export interface PositionForm {
  standard: Record<StandardFieldKey, FieldRule>;
  questions: FormQuestion[];
}

export interface PositionDetail extends Position {
  subOrganizationId: number | null;
  departmentId: number | null;
  roleId: number | null;
  employmentTypeId: number | null;
  employmentType: NamedRef | null;
  siteId: number | null;
  hiringManagerId: number | null;
  recruiterId: number | null;
  experienceMin: number | null;
  experienceMax: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryVisible: boolean;
  description: string;
  skills: string[];
  interviewPlan: InterviewRound[];
  testId: number | null;
  test: NamedRef | null;
  form: PositionForm;
  careersUrl: string | null;
}

/** One card on the Kanban board / one row on the candidates list. */
export interface ApplicationCard {
  id: number;
  candidate: {
    id: number;
    name: string;
    email: string;
    phone: string;
    currentTitle: string;
    currentCompany: string;
    totalExperience: number | null;
  };
  stage: Stage;
  status: ApplicationStatus;
  rating: number | null;
  source: Source;
  appliedAt: string | null;
  stageChangedAt: string | null;
  nextInterview: { at: string; roundName: string } | null;
  test: { status: string; result: string | null; scorePercent: number | null } | null;
  offer: { status: string } | null;
  feedback: { submitted: number; total: number; recommendation: string | null } | null;
  position: { id: number; title: string } | null;
}

export interface PipelineColumn {
  stage: Stage;
  items: ApplicationCard[];
  more: number;
}

export interface Pipeline {
  position: PositionDetail;
  columns: PipelineColumn[];
}

export interface TimelineEvent {
  id: number;
  type: string;
  data: Record<string, unknown>;
  actorName: string;
  createdAt: string;
}

export interface Panelist {
  employeeId: number;
  name: string;
  submitted: boolean;
  recommendation: Recommendation | null;
  rating: number | null;
  notes: string;
  /** §10 — { criterion: 1–5 } or null. */
  criteriaRatings: Record<string, number> | null;
}

export interface CriterionAverage {
  name: string;
  average: number | null;
  count: number;
}

export interface ApplicationInterview {
  id: number;
  roundName: string;
  mode: InterviewMode;
  scheduledAt: string;
  durationMinutes: number;
  location: string;
  meetingUrl: string;
  status: string;
  cancelReason: string;
  criteria: string[];
  shareTests: boolean;
  panel: Panelist[];
  criteriaAverages: CriterionAverage[];
}

export interface ApplicationTest {
  id: number;
  testName: string;
  status: string;
  result: string | null;
  scorePercent: number | null;
  sentAt: string | null;
  submittedAt: string | null;
  expiresAt: string | null;
  risk: 'low' | 'medium' | 'high' | null;
  aiScore: number | null;
}

export interface OfferSummary {
  id: number;
  status: string;
  designation: string;
  annualCtc: number | null;
  joiningDate: string | null;
  expiresOn: string | null;
  sentAt: string | null;
  respondedAt: string | null;
}

export interface Candidate {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  totalExperience: number | null;
  currentCompany: string;
  currentTitle: string;
  noticePeriodDays: number | null;
  currentCtc: number | null;
  expectedCtc: number | null;
  linkedinUrl: string;
  portfolioUrl: string;
  resumeName: string;
  hasResume: boolean;
  employeeId: number | null;
}

export interface ApplicationDetail {
  id: number;
  stage: Stage;
  status: ApplicationStatus;
  rating: number | null;
  source: Source;
  appliedAt: string | null;
  stageChangedAt: string | null;
  rejectionReason: string;
  owner: NamedRef | null;
  referredBy: NamedRef | null;
  employeeId: number | null;
  candidate: Candidate;
  position: { id: number; title: string };
  answers: Array<{ label: string; value: string }>;
  timeline: TimelineEvent[];
  interviews: ApplicationInterview[];
  tests: ApplicationTest[];
  offer: OfferSummary | null;
  otherApplications: Array<{ id: number; positionTitle: string; stage: Stage; status: ApplicationStatus }>;
  permissions: { manage: boolean; offer: boolean; hire: boolean };
}

export interface RecruitmentOptions {
  departments: NamedRef[];
  roles: Array<NamedRef & { departmentId: number | null }>;
  employmentTypes: NamedRef[];
  sites: NamedRef[];
  tests: NamedRef[];
}

export interface EmployeeOption {
  id: number;
  name: string;
  code: string;
  designation: string;
}

/** Editor state for create/edit position (camelCase; api turns it into the snake_case body). */
export interface PositionInput {
  title: string;
  departmentId: number | null;
  roleId: number | null;
  employmentTypeId: number | null;
  siteId: number | null;
  locationText: string;
  workMode: WorkMode;
  subOrganizationId: number | null;
  openings: number | null;
  hiringManager: NamedRef | null;
  recruiter: NamedRef | null;
  experienceMin: number | null;
  experienceMax: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryVisible: boolean;
  description: string;
  skills: string[];
  interviewPlan: InterviewRound[];
  testId: number | null;
  form: PositionForm;
  status: 'draft' | 'open' | PositionStatus;
  published: boolean;
  closesOn: string;
}

export interface ManualCandidateInput {
  positionId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentTitle: string;
  currentCompany: string;
  totalExperience: string;
  resume: File | null;
}
