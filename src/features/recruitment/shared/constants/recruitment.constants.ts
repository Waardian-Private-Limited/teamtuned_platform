import type {
  ApplicationStatus, FieldRule, InterviewMode, PositionStatus, QuestionType, Recommendation, Source, Stage,
  StandardFieldKey, WorkMode,
} from '../types/recruitment.model';

export const RECRUIT_PERMISSIONS = {
  VIEW: 'RECRUIT_VIEW',
  MANAGE: 'RECRUIT_MANAGE',
  OFFER: 'RECRUIT_OFFER',
  HIRE: 'RECRUIT_HIRE',
  SETTINGS: 'RECRUIT_SETTINGS',
} as const;

export const ALL_RECRUIT_PERMISSIONS = Object.values(RECRUIT_PERMISSIONS);

/** Pipeline stages in order. `assessment` is skipped for positions without a test. */
export const STAGES: readonly Stage[] = ['applied', 'screening', 'assessment', 'interview', 'offer', 'hired'];

/** Stages a recruiter can move to by hand. `hired` only happens through the hire flow. */
export const MOVABLE_STAGES: readonly Stage[] = ['applied', 'screening', 'assessment', 'interview', 'offer'];

export const STAGE_ORDER: Record<Stage, number> = {
  applied: 0, screening: 1, assessment: 2, interview: 3, offer: 4, hired: 5,
};

export const STAGE_LABELS: Record<Stage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  assessment: 'Assessment',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
};

/** Terminal outcomes live on `status`, not stage. */
export const OUTCOME_LABELS: Record<'rejected' | 'withdrawn', string> = {
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  active: 'Active',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const POSITION_STATUS_LABELS: Record<PositionStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  paused: 'Paused',
  closed: 'Closed',
  filled: 'Filled',
};

export const SOURCE_LABELS: Record<Source, string> = {
  careers: 'Careers page',
  api: 'Website',
  referral: 'Referral',
  manual: 'Added manually',
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote',
};

export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = {
  in_person: 'In person',
  video: 'Video',
  phone: 'Phone',
};

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  strong_yes: 'Strong yes',
  yes: 'Yes',
  no: 'No',
  strong_no: 'Strong no',
};

export const INTERVIEW_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
};

export const TEST_STATUS_LABELS: Record<string, string> = {
  sent: 'Sent',
  started: 'In progress',
  submitted: 'Submitted',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const TEST_RESULT_LABELS: Record<string, string> = {
  pending: 'Needs review',
  passed: 'Passed',
  failed: 'Failed',
};

export const OFFER_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
};

export const REJECTION_REASONS = [
  'Not a fit for the role',
  'Insufficient experience',
  'Skills mismatch',
  'Compensation mismatch',
  'Did not clear assessment',
  'Did not clear interview',
  'Candidate not responsive',
  'Position filled',
  'Other',
] as const;

export const STANDARD_FIELDS: ReadonlyArray<{ key: StandardFieldKey; label: string }> = [
  { key: 'phone', label: 'Phone' },
  { key: 'city', label: 'City' },
  { key: 'experience', label: 'Total experience' },
  { key: 'current_company', label: 'Current company' },
  { key: 'notice_period', label: 'Notice period' },
  { key: 'current_ctc', label: 'Current CTC' },
  { key: 'expected_ctc', label: 'Expected CTC' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'portfolio', label: 'Portfolio / website' },
  { key: 'resume', label: 'Resume' },
];

export const FIELD_RULE_OPTIONS: ReadonlyArray<{ value: FieldRule; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 'optional', label: 'Optional' },
  { value: 'required', label: 'Required' },
];

export const DEFAULT_STANDARD_FORM: Record<StandardFieldKey, FieldRule> = {
  phone: 'required',
  city: 'optional',
  experience: 'optional',
  current_company: 'optional',
  notice_period: 'optional',
  current_ctc: 'off',
  expected_ctc: 'optional',
  linkedin: 'optional',
  portfolio: 'off',
  resume: 'required',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Short text',
  long_text: 'Paragraph',
  yes_no: 'Yes / No',
  choice: 'Choice',
  number: 'Number',
};

export const DEFAULT_PAGE_SIZE = 25;
export const SEARCH_DEBOUNCE_MS = 300;

/** §10 interview rating criteria: what new plan rounds start with, and the limits the server enforces. */
export const DEFAULT_INTERVIEW_CRITERIA: readonly string[] = ['Communication', 'Technical depth', 'Problem solving', 'Culture fit'];
export const MAX_INTERVIEW_CRITERIA = 8;
export const MAX_CRITERION_LENGTH = 60;
