import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type { CycleReport, Pip, PipSuggestion, CalibrationSessionRow, CalibrationView, Dimensions, FeedbackForm, FeedbackToGive, FeedbackView, PersonOption as Person, ReleaseResult, ReviewDraft, ReviewView, ComputeResult, Cycle, GenerateResult, ImportResult, ScoreRow, Scorecard, Meta, Sheet, SheetOptions, SheetRow, MetricOption, Named, Paged, PersonOption, PresetMeta, PresetResult, RuleOptions, Settings, SettingsResult, Template, Kudos, KudosWall, OneOnOne, OneOnOneList, Objective, OkrTree, KrCheckin, GoalOption, NineBox, KeyPosition, Readiness } from '../types/perf.types';

const auth = { withAuth: true };
const B = '/performance';

export type Resource = 'kras' | 'kpis' | 'competencies' | 'scales' | 'templates' | 'template-rules';

export const getMeta = () => apiClient.get<Meta>(`${B}/meta`, undefined, auth);
export const metricOptions = () => apiClient.get<{ items: MetricOption[]; forms: { id: number; name: string }[] }>(`${B}/options/metrics`, undefined, auth);
export const ruleOptions = () => apiClient.get<RuleOptions>(`${B}/options/rule-dimensions`, undefined, auth);
export const searchPeople = (q: string) => apiClient.get<{ items: PersonOption[] }>(`${B}/options/employees`, q ? { q } : undefined, auth);

export const list = <T>(resource: Resource, status: 'active' | 'archived', subOrgId: number | null, q = '') =>
  apiClient.get<Paged<T>>(`${B}/${resource}`, { status, pageSize: 200, ...(q ? { q } : {}), ...(subOrgId ? { subOrgId } : {}) }, auth);
export const listNamed = (resource: Resource) => apiClient.get<Paged<Named>>(`${B}/${resource}`, { pageSize: 200 }, auth);
export const save = <T>(resource: Resource, id: number | null, body: unknown) =>
  id ? apiClient.put<T>(`${B}/${resource}/${id}`, body, auth) : apiClient.post<T>(`${B}/${resource}`, body, auth);
export const setArchived = <T>(resource: Resource, id: number, archived: boolean) => apiClient.post<T>(`${B}/${resource}/${id}/${archived ? 'archive' : 'restore'}`, {}, auth);
export const getTemplate = (id: number) => apiClient.get<Template>(`${B}/templates/${id}`, undefined, auth);
export const resolveTemplate = (employeeId: number) => apiClient.get<{ employee: { id: number; name: string }; rule_id: number | null; template: Template | null }>(`${B}/templates/resolve`, { employeeId }, auth);

export const getSettings = (subOrgId: number | null) => apiClient.get<SettingsResult>(`${B}/settings`, subOrgId ? { subOrgId } : undefined, auth);
export const saveSettings = (subOrgId: number | null, config: Partial<Settings>) => apiClient.put<SettingsResult>(`${B}/settings`, { sub_organization_id: subOrgId, config }, auth);

export const listPresets = () => apiClient.get<{ items: PresetMeta[] }>(`${B}/presets`, undefined, auth);
export const importPreset = (key: string, subOrgId: number | null) => apiClient.post<PresetResult>(`${B}/presets/${key}/import`, { sub_organization_id: subOrgId }, auth);

// ---- cycles and goal sheets ----
export const listCycles = (status: string, subOrgId: number | null) => apiClient.get<Paged<Cycle>>(`${B}/cycles`, { status, pageSize: 100, ...(subOrgId ? { subOrgId } : {}) }, auth);
export const getCycle = (id: number) => apiClient.get<Cycle>(`${B}/cycles/${id}`, undefined, auth);
export const saveCycle = (id: number | null, body: unknown) => (id ? apiClient.put<Cycle>(`${B}/cycles/${id}`, body, auth) : apiClient.post<Cycle>(`${B}/cycles`, body, auth));
export const generateSheets = (id: number) => apiClient.post<GenerateResult>(`${B}/cycles/${id}/generate`, {}, auth);
export const cycleAction = (id: number, action: 'open-goals' | 'start' | 'close') => apiClient.post<Cycle>(`${B}/cycles/${id}/${action}`, {}, auth);
export const breakAction = (id: number, periodId: number, action: 'close' | 'reopen') => apiClient.post<Cycle>(`${B}/cycles/${id}/breaks/${periodId}/${action}`, {}, auth);
export const cycleSheets = (id: number, status: string, q: string) => apiClient.get<Paged<SheetRow>>(`${B}/cycles/${id}/sheets`, { pageSize: 200, ...(status !== 'all' ? { status } : {}), ...(q ? { q } : {}) }, auth);

export const mySheets = () => apiClient.get<{ items: SheetRow[] }>(`${B}/sheets/mine`, undefined, auth);
export const teamSheets = () => apiClient.get<{ items: SheetRow[] }>(`${B}/sheets/team`, undefined, auth);
export const getSheet = (id: number) => apiClient.get<Sheet>(`${B}/sheets/${id}`, undefined, auth);
export const sheetOptions = (id: number) => apiClient.get<SheetOptions>(`${B}/sheets/${id}/options`, undefined, auth);
export const saveSheet = (id: number, body: unknown) => apiClient.put<Sheet>(`${B}/sheets/${id}`, body, auth);
export const submitSheet = (id: number) => apiClient.post<Sheet>(`${B}/sheets/${id}/submit`, {}, auth);
export const withdrawSheet = (id: number) => apiClient.post<Sheet>(`${B}/sheets/${id}/withdraw`, {}, auth);

// ---- actual values and scores ----
export const getScorecard = (sheetId: number) => apiClient.get<Scorecard>(`${B}/sheets/${sheetId}/scorecard`, undefined, auth);
export const enterActuals = (sheetId: number, entries: unknown[]) => apiClient.put<Scorecard>(`${B}/sheets/${sheetId}/actuals`, { entries }, auth);
export const cycleScores = (cycleId: number) => apiClient.get<{ items: ScoreRow[]; total: number }>(`${B}/cycles/${cycleId}/scores`, { pageSize: 200 }, auth);
export const computeActuals = (cycleId: number) => apiClient.post<ComputeResult>(`${B}/cycles/${cycleId}/actuals/compute`, {}, auth);
export const importActuals = (cycleId: number, rows: unknown[]) => apiClient.post<ImportResult>(`${B}/cycles/${cycleId}/actuals/import`, { rows }, auth);

// ---- reviews and results ----
export const getReview = (sheetId: number) => apiClient.get<ReviewView>(`${B}/sheets/${sheetId}/review`, undefined, auth);
export const saveReview = (sheetId: number, kind: 'self' | 'manager', body: unknown) => apiClient.put<ReviewView>(`${B}/sheets/${sheetId}/review/${kind}`, body, auth);
export const saveCheckin = (sheetId: number, periodId: number, body: unknown) => apiClient.put<ReviewView>(`${B}/sheets/${sheetId}/checkins/${periodId}`, body, auth);
export const replyToRating = (sheetId: number, body: unknown) => apiClient.post<ReviewView>(`${B}/sheets/${sheetId}/reply`, body, auth);
export const withdrawDispute = (sheetId: number) => apiClient.post<ReviewView>(`${B}/sheets/${sheetId}/dispute/withdraw`, {}, auth);
export const adjustRating = (sheetId: number, body: unknown) => apiClient.post<ReviewView>(`${B}/sheets/${sheetId}/adjust`, body, auth);
export const openReviews = (cycleId: number) => apiClient.post<Cycle>(`${B}/cycles/${cycleId}/open-reviews`, {}, auth);
export const reviewDraft = (sheetId: number, body: { kind: 'self' | 'manager' | 'checkin'; period_id?: number; text?: string; ratings?: Record<number, number> }) => apiClient.post<ReviewDraft>(`${B}/sheets/${sheetId}/review/draft`, body, auth);
export const releaseRatings = (cycleId: number, overrideReason?: string) => apiClient.post<ReleaseResult>(`${B}/cycles/${cycleId}/release`, overrideReason ? { override_reason: overrideReason } : {}, auth);

// ---- 360 feedback ----
export const getFeedback = (sheetId: number) => apiClient.get<FeedbackView>(`${B}/sheets/${sheetId}/feedback`, undefined, auth);
export const feedbackCandidates = (sheetId: number, q: string) => apiClient.get<{ items: Person[] }>(`${B}/sheets/${sheetId}/feedback/candidates`, { q }, auth);
export const askFeedback = (sheetId: number, body: { employee_id: number; relation: string } | { external_name: string; external_email: string }) => apiClient.post<FeedbackView>(`${B}/sheets/${sheetId}/feedback`, body, auth);
export const decideFeedback = (sheetId: number, requestId: number, approve: boolean) => apiClient.post<FeedbackView>(`${B}/sheets/${sheetId}/feedback/${requestId}/${approve ? 'approve' : 'decline'}`, {}, auth);
export const resendFeedback = (sheetId: number, requestId: number) => apiClient.post<FeedbackView>(`${B}/sheets/${sheetId}/feedback/${requestId}/resend`, {}, auth);
export const removeFeedback = (sheetId: number, requestId: number) => apiClient.delete<FeedbackView>(`${B}/sheets/${sheetId}/feedback/${requestId}`, auth);
export const feedbackToGive = () => apiClient.get<{ items: FeedbackToGive[] }>(`${B}/feedback/mine`, undefined, auth);
export const feedbackForm = (id: number) => apiClient.get<FeedbackForm>(`${B}/feedback/${id}`, undefined, auth);
export const answerFeedback = (id: number, body: unknown) => apiClient.put<FeedbackForm>(`${B}/feedback/${id}/respond`, body, auth);
export const declineFeedback = (id: number) => apiClient.post<{ ok: boolean }>(`${B}/feedback/${id}/decline`, {}, auth);

// ---- calibration ----
export const startCalibration = (cycleId: number) => apiClient.post<Cycle>(`${B}/cycles/${cycleId}/start-calibration`, {}, auth);
export const calibrationSessions = (cycleId: number) => apiClient.get<{ items: CalibrationSessionRow[] }>(`${B}/cycles/${cycleId}/calibration`, undefined, auth);
export const createCalibration = (cycleId: number, name: string, scope: Dimensions) => apiClient.post<CalibrationView>(`${B}/cycles/${cycleId}/calibration`, { name, scope }, auth);
export const getCalibration = (id: number) => apiClient.get<CalibrationView>(`${B}/calibration/${id}`, undefined, auth);
export const adjustCalibration = (id: number, body: { sheet_id: number; to_band: string; reason: string }) => apiClient.post<CalibrationView>(`${B}/calibration/${id}/adjust`, body, auth);
export const closeCalibration = (id: number, overrideReason?: string) => apiClient.post<CalibrationView>(`${B}/calibration/${id}/close`, overrideReason ? { override_reason: overrideReason } : {}, auth);

// ---- improvement plans ----
export const listPips = (scope: 'mine' | 'team' | 'all', status: 'open' | 'closed') => apiClient.get<Paged<Pip>>(`${B}/pips`, { scope, status, pageSize: 100 }, auth);
export const pipSuggestions = () => apiClient.get<{ items: PipSuggestion[] }>(`${B}/pips/suggestions`, undefined, auth);
export const getPip = (id: number) => apiClient.get<Pip>(`${B}/pips/${id}`, undefined, auth);
export const createPip = (body: unknown) => apiClient.post<Pip>(`${B}/pips`, body, auth);
export const updatePip = (id: number, body: unknown) => apiClient.put<Pip>(`${B}/pips/${id}`, body, auth);
export const pipAction = (id: number, action: 'submit' | 'withdraw' | 'cancel', body: unknown = {}) => apiClient.post<Pip>(`${B}/pips/${id}/${action}`, body, auth);
export const pipCheckin = (id: number, note: string) => apiClient.post<Pip>(`${B}/pips/${id}/checkins`, { note }, auth);
export const pipMarkItem = (id: number, itemId: number, body: { status: string; note: string }) => apiClient.put<Pip>(`${B}/pips/${id}/items/${itemId}`, body, auth);
export const pipExtend = (id: number, body: { end_date: string; reason: string }) => apiClient.post<Pip>(`${B}/pips/${id}/extend`, body, auth);
export const pipClose = (id: number, body: { outcome: string; note: string }) => apiClient.post<Pip>(`${B}/pips/${id}/close`, body, auth);
export const pipCandidates = (q: string) => apiClient.get<{ items: Person[] }>(`${B}/pips/candidates`, { q }, auth);

export const cycleReport = (cycleId: number) => apiClient.get<CycleReport>(`${B}/cycles/${cycleId}/report`, undefined, auth);
export const exportCycleReport = (cycleId: number) => apiClient.post<ExportJobDto>('/exports/performance-cycle-report', { cycle_id: cycleId }, auth);

// kudos
export const kudosWall = (q: { before?: number; to?: number | 'me'; from?: number | 'me' } = {}) => apiClient.get<KudosWall>(`${B}/kudos`, q, auth);
export const kudosPeople = (q: string) => apiClient.get<{ items: PersonOption[] }>(`${B}/kudos/people`, { q }, auth);
export const giveKudos = (body: { to_employee_id: number; message: string; competency_id?: number | null }) => apiClient.post<Kudos>(`${B}/kudos`, body, auth);
export const removeKudos = (id: number) => apiClient.delete<{ ok: true }>(`${B}/kudos/${id}`, auth);
export const likeKudos = (id: number, on: boolean) => (on ? apiClient.put<{ like_count: number; liked_by_me: boolean }>(`${B}/kudos/${id}/like`, {}, auth) : apiClient.delete<{ like_count: number; liked_by_me: boolean }>(`${B}/kudos/${id}/like`, auth));

// one-on-ones
export const oneOnOnes = (q: { when?: 'upcoming' | 'past'; role?: 'manager' | 'employee' } = {}) => apiClient.get<OneOnOneList>(`${B}/one-on-ones`, q, auth);
export const oneOnOnePeople = (q: string) => apiClient.get<{ items: PersonOption[] }>(`${B}/one-on-ones/people`, q ? { q } : undefined, auth);
export const scheduleOneOnOne = (body: { employee_id?: number; scheduled_at: string; agenda?: string[] }) => apiClient.post<OneOnOne>(`${B}/one-on-ones`, body, auth);
export const getOneOnOne = (id: number) => apiClient.get<OneOnOne>(`${B}/one-on-ones/${id}`, undefined, auth);
export const updateOneOnOne = (id: number, body: { shared_notes?: string; scheduled_at?: string; status?: string }) => apiClient.patch<OneOnOne>(`${B}/one-on-ones/${id}`, body, auth);
export const addOneOnOneItem = (id: number, body: { kind: 'agenda' | 'action'; text: string; owner_employee_id?: number | null; due_date?: string | null }) => apiClient.post<OneOnOne>(`${B}/one-on-ones/${id}/items`, body, auth);
export const updateOneOnOneItem = (id: number, itemId: number, body: { text?: string; done?: boolean }) => apiClient.patch<OneOnOne>(`${B}/one-on-ones/${id}/items/${itemId}`, body, auth);
export const removeOneOnOneItem = (id: number, itemId: number) => apiClient.delete<OneOnOne>(`${B}/one-on-ones/${id}/items/${itemId}`, auth);
export const savePrivateNotes = (id: number, notes: string) => apiClient.put<OneOnOne>(`${B}/one-on-ones/${id}/private`, { notes }, auth);
export const nextOneOnOne = (id: number, scheduledAt: string) => apiClient.post<OneOnOne>(`${B}/one-on-ones/${id}/next`, { scheduled_at: scheduledAt }, auth);

// OKRs
export const okrTree = (on?: string) => apiClient.get<OkrTree>(`${B}/okrs`, on ? { on } : undefined, auth);
export const okrGoalOptions = (owner?: number | null) => apiClient.get<{ items: GoalOption[] }>(`${B}/okrs/goal-options`, owner ? { owner } : undefined, auth);
export const createObjective = (body: unknown) => apiClient.post<Objective>(`${B}/okrs`, body, auth);
export const updateObjective = (id: number, body: unknown) => apiClient.put<Objective>(`${B}/okrs/${id}`, body, auth);
export const removeObjective = (id: number) => apiClient.delete<{ ok: true }>(`${B}/okrs/${id}`, auth);
export const krCheckin = (krId: number, body: { value?: number | null; confidence?: string | null; note?: string }) => apiClient.post<{ objective: Objective; history: KrCheckin[] }>(`${B}/okrs/key-results/${krId}/checkins`, body, auth);
export const krHistory = (krId: number) => apiClient.get<{ items: KrCheckin[] }>(`${B}/okrs/key-results/${krId}/checkins`, undefined, auth);

// talent
export const nineBox = (cycleId: number, departmentId?: number | null) => apiClient.get<NineBox>(`${B}/cycles/${cycleId}/nine-box`, departmentId ? { department_id: departmentId } : undefined, auth);
export const keyPositions = (status: 'active' | 'archived' = 'active') => apiClient.get<{ items: KeyPosition[] }>(`${B}/key-positions`, { status }, auth);
export const talentPeople = (q: string) => apiClient.get<{ items: PersonOption[] }>(`${B}/key-positions/people`, { q }, auth);
export const createKeyPosition = (body: unknown) => apiClient.post<KeyPosition>(`${B}/key-positions`, body, auth);
export const updateKeyPosition = (id: number, body: unknown) => apiClient.put<KeyPosition>(`${B}/key-positions/${id}`, body, auth);
export const setSuccessor = (id: number, employeeId: number, body: { readiness: Readiness; notes?: string }) => apiClient.put<{ items: KeyPosition[] }>(`${B}/key-positions/${id}/successors/${employeeId}`, body, auth);
export const removeSuccessor = (id: number, employeeId: number) => apiClient.delete<{ items: KeyPosition[] }>(`${B}/key-positions/${id}/successors/${employeeId}`, auth);
