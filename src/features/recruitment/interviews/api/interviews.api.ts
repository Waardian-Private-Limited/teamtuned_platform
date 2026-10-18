import { apiClient } from '@/lib/apiClient';
import type { ListResponseDto, PositionDetailDto, ResumeUrlDto } from '../../shared/types/recruitment.dto';
import type {
  AiReviewDto,
  InterviewDetailDto,
  InterviewListItemDto,
  InterviewStatus,
  QuestionType,
  ScheduleInterviewBody,
  ScorecardBody,
  TestAttemptDetailDto,
  TestBody,
  TestDetailDto,
  TestListItemDto,
} from '../types/interviews.dto';

const auth = { withAuth: true } as const;

export interface InterviewListParams {
  from?: string;
  to?: string;
  status?: InterviewStatus | 'all';
  positionId?: number | null;
  interviewerId?: number | null;
  page?: number;
  pageSize?: number;
}

export function listInterviews(p: InterviewListParams) {
  return apiClient.get<ListResponseDto<InterviewListItemDto>>(
    '/recruitment/interviews',
    {
      from: p.from || undefined,
      to: p.to || undefined,
      status: p.status && p.status !== 'all' ? p.status : undefined,
      position_id: p.positionId || undefined,
      interviewer_id: p.interviewerId || undefined,
      page: p.page,
      pageSize: p.pageSize,
    },
    auth
  );
}

/** pending = my scorecard is still to submit; done = submitted, cancelled or no-show. `counts` feeds the tab badges. */
export function listMyInterviews(scope: 'pending' | 'done', page = 1, pageSize = 20) {
  return apiClient.get<ListResponseDto<InterviewListItemDto> & { counts?: { pending: number; done: number } }>(
    '/recruitment/interviews/mine',
    { scope, page, pageSize },
    auth
  );
}

export function getInterview(id: number) {
  return apiClient.get<InterviewDetailDto>(`/recruitment/interviews/${id}`, undefined, auth);
}

export function scheduleInterview(applicationId: number, body: ScheduleInterviewBody) {
  return apiClient.post<InterviewListItemDto>(`/recruitment/applications/${applicationId}/interviews`, body, auth);
}

export function updateInterview(id: number, body: ScheduleInterviewBody) {
  return apiClient.put<InterviewListItemDto>(`/recruitment/interviews/${id}`, body, auth);
}

export function cancelInterview(id: number, reason: string, notifyCandidate: boolean) {
  return apiClient.post(`/recruitment/interviews/${id}/cancel`, { reason, notify_candidate: notifyCandidate }, auth);
}

export function completeInterview(id: number, status: 'completed' | 'no_show') {
  return apiClient.post(`/recruitment/interviews/${id}/complete`, { status }, auth);
}

export function submitScorecard(id: number, body: ScorecardBody) {
  return apiClient.put(`/recruitment/interviews/${id}/scorecard`, body, auth);
}

export function getResumeUrl(candidateId: number) {
  return apiClient.get<ResumeUrlDto>(`/recruitment/candidates/${candidateId}/resume-url`, undefined, auth);
}

export function getPosition(id: number) {
  return apiClient.get<PositionDetailDto>(`/recruitment/positions/${id}`, undefined, auth);
}

export function listPositionOptions() {
  return apiClient.get<ListResponseDto<{ id: number; title: string }>>('/recruitment/positions', { pageSize: 100 }, auth);
}

/* ---------------------------------- tests --------------------------------- */

export function listTests(params: { status?: string; search?: string; page?: number; pageSize?: number } = {}) {
  return apiClient.get<ListResponseDto<TestListItemDto> | TestListItemDto[]>(
    '/recruitment/tests',
    { status: params.status, search: params.search || undefined, page: params.page, pageSize: params.pageSize ?? 100 },
    auth
  );
}

export function getTest(id: number) {
  return apiClient.get<TestDetailDto>(`/recruitment/tests/${id}`, undefined, auth);
}

export function createTest(body: TestBody) {
  return apiClient.post<TestDetailDto>('/recruitment/tests', body, auth);
}

export function updateTest(id: number, body: TestBody) {
  return apiClient.put<TestDetailDto>(`/recruitment/tests/${id}`, body, auth);
}

export function archiveTest(id: number) {
  return apiClient.post(`/recruitment/tests/${id}/archive`, undefined, auth);
}

export function sendTest(applicationId: number, testId: number) {
  return apiClient.post<TestAttemptDetailDto & { link?: string }>(`/recruitment/applications/${applicationId}/tests`, { test_id: testId }, auth);
}

/** A fresh link for an open test (the old one stops working); `email` sends the invite again. */
export function renewTestLink(attemptId: number, email = false) {
  return apiClient.post<{ attemptId: number; link: string; expiresAt: string | null; status: string }>(`/recruitment/test-attempts/${attemptId}/link`, { email }, auth);
}

export function getTestAttempt(id: number) {
  return apiClient.get<TestAttemptDetailDto>(`/recruitment/test-attempts/${id}`, undefined, auth);
}

export function reviewTestAttempt(id: number, marks: Record<string, number>) {
  return apiClient.post<TestAttemptDetailDto>(`/recruitment/test-attempts/${id}/review`, { marks }, auth);
}

/** §9.4 Tuner reviews the descriptive answers now (15-60 s). AI never sets marks. */
export function runTestAiReview(id: number) {
  return apiClient.post<AiReviewDto | { aiReview?: AiReviewDto | null }>(`/recruitment/test-attempts/${id}/ai-review`, {}, auth);
}

export function cancelTestAttempt(id: number) {
  return apiClient.post(`/recruitment/test-attempts/${id}/cancel`, undefined, auth);
}

/* --------------------------- Tuner suggestions --------------------------- */

export interface SuggestQuestionsBody {
  position_id?: number | null;
  job_description?: string;
  topic?: string;
  single: number;
  multiple: number;
  text: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  existing_prompts?: string[];
}

export interface SuggestedQuestionDto {
  type: QuestionType;
  prompt: string;
  options: string[];
  answer: number[];
  answerGuide: string | null;
  marks: number;
  rationale: string | null;
}

/** Tuner drafts questions from a position and/or a job description. Nothing is saved. */
export function suggestQuestions(body: SuggestQuestionsBody) {
  return apiClient.post<{ suggestions: SuggestedQuestionDto[]; position: { id: number; title: string } | null }>(
    '/recruitment/tests/suggest-questions', body, auth
  );
}

/** The current link of an open test, unchanged (409 RECRUIT_TEST_LINK_UNAVAILABLE when it was not kept). */
export function getTestLink(attemptId: number) {
  return apiClient.get<{ attemptId: number; link: string; expiresAt: string | null; status: string }>(`/recruitment/test-attempts/${attemptId}/link`, undefined, auth);
}
