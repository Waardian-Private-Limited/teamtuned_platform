import { apiClient } from '@/lib/apiClient';
import type {
  CompEmployeeDto,
  CycleDto,
  BonusBase,
  BonusPayoutsDto,
  LinkablePerformanceCycleDto,
  PerformanceImportDto,
  CycleSummaryDto,
  GratuityCalcDto,
  GratuityRowDto,
  HistoryDto,
  PayoutDto,
  RevisionDto,
  SettingsResponseDto,
  BonusRowDto,
  CompensationSettings,
  BenchmarkDto,
  MarketImportDto,
  MarketSurveyDto,
  ManagerReviewSummaryDto,
  RatingUploadDto,
  TeamAppraisalDto,
} from '../types/compensation.dto';

const auth = { withAuth: true };
type Params = Record<string, string | number | boolean | undefined | null>;

interface PagedResponse {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  counts?: Record<string, number>;
}

export const getSettings = (subOrgId: number | null) =>
  apiClient.get<SettingsResponseDto>('/compensation/settings', { forSubOrgId: subOrgId ?? undefined }, auth);
export const updateSettings = (subOrgId: number | null, settings: CompensationSettings) =>
  apiClient.put<SettingsResponseDto>('/compensation/settings', { sub_organization_id: subOrgId, settings }, auth);

export const searchEmployees = (search: string, subOrgId?: number | null) =>
  apiClient.get<{ employees: CompEmployeeDto[] }>('/compensation/employees', { search: search || undefined, subOrgId: subOrgId ?? undefined }, auth);
export const employeeHistory = (id: number) => apiClient.get<HistoryDto>(`/compensation/employees/${id}/history`, undefined, auth);
export const employeeGratuity = (id: number, params: Params) => apiClient.get<GratuityCalcDto>(`/compensation/employees/${id}/gratuity`, params, auth);

export const listCycles = () => apiClient.get<{ cycles: CycleDto[] }>('/compensation/cycles', undefined, auth);
export const getCycle = (id: number) => apiClient.get<CycleDto>(`/compensation/cycles/${id}`, undefined, auth);
export const createCycle = (body: Record<string, unknown>) => apiClient.post<CycleDto>('/compensation/cycles', body, auth);
export const updateCycle = (id: number, body: Record<string, unknown>) => apiClient.put<CycleDto>(`/compensation/cycles/${id}`, body, auth);
export const generateProposals = (id: number) => apiClient.post<{ eligible: number; added: number }>(`/compensation/cycles/${id}/generate`, {}, auth);
export const listProposals = (id: number, params: Params) =>
  apiClient.get<PagedResponse & { revisions: RevisionDto[] }>(`/compensation/cycles/${id}/proposals`, params, auth);
export const updateProposals = (id: number, items: Record<string, unknown>[]) =>
  apiClient.put<{ updated: number; summary: CycleSummaryDto }>(`/compensation/cycles/${id}/proposals`, { items }, auth);
export const applyRatings = (id: number) => apiClient.post<{ updated: number; summary: CycleSummaryDto }>(`/compensation/cycles/${id}/apply-ratings`, {}, auth);
/** enabled: false when the organization has no Performance module (cycles is then empty). */
export const performanceCycles = () => apiClient.get<{ enabled: boolean; cycles: LinkablePerformanceCycleDto[] }>('/compensation/performance-cycles', undefined, auth);
/** Replaces the performance cycles an appraisal cycle takes ratings from (empty list unlinks). */
export const linkPerformanceCycles = (id: number, performanceCycleIds: number[]) =>
  apiClient.put<CycleDto>(`/compensation/cycles/${id}/performance-link`, { performance_cycle_ids: performanceCycleIds }, auth);
/** Rebuilds a draft's guide from the linked cycles' ratings when it is missing any of them. */
export const syncRatings = (id: number) => apiClient.post<CycleDto>(`/compensation/cycles/${id}/sync-ratings`, {}, auth);
export const importPerformanceRatings = (id: number, apply: boolean) =>
  apiClient.post<PerformanceImportDto>(`/compensation/cycles/${id}/import-performance-ratings`, { apply }, auth);
// Manager review of a manager-rated cycle (HR side)
export const sendManagerReview = (id: number, dueDate: string) => apiClient.post<CycleDto>(`/compensation/cycles/${id}/manager-review/send`, { due_date: dueDate }, auth);
export const remindManagers = (id: number, evaluatorEmployeeId?: number) =>
  apiClient.post<{ reminded: number }>(`/compensation/cycles/${id}/manager-review/remind`, evaluatorEmployeeId ? { evaluator_employee_id: evaluatorEmployeeId } : {}, auth);
export const reopenManagerReview = (id: number, evaluatorEmployeeId: number) =>
  apiClient.post<CycleDto & { reopened: number }>(`/compensation/cycles/${id}/manager-review/reopen`, { evaluator_employee_id: evaluatorEmployeeId }, auth);
export const rateForManager = (id: number, items: Record<string, unknown>[]) =>
  apiClient.put<{ rated: number; manager_review: ManagerReviewSummaryDto }>(`/compensation/cycles/${id}/manager-review/ratings`, { items }, auth);
export const closeManagerReview = (id: number) => apiClient.post<CycleDto>(`/compensation/cycles/${id}/manager-review/close`, {}, auth);
/** HR's rating file: [{ employee_code, rating, increment_percent?, comment? }]. */
export const uploadRatings = (id: number, rows: Record<string, string>[]) => apiClient.post<RatingUploadDto>(`/compensation/cycles/${id}/ratings-upload`, { rows }, auth);

// Managers rating their own people (no compensation permission needed)
export const teamAppraisalStatus = () => apiClient.get<{ has_reviews: boolean }>('/compensation/team-appraisals/status', undefined, auth);
export const teamAppraisals = () => apiClient.get<{ cycles: TeamAppraisalDto[] }>('/compensation/team-appraisals', undefined, auth);
export const saveTeamAppraisal = (id: number, items: Record<string, unknown>[]) => apiClient.put<TeamAppraisalDto | null>(`/compensation/team-appraisals/${id}`, { items }, auth);
export const submitTeamAppraisal = (id: number) => apiClient.post<TeamAppraisalDto | null>(`/compensation/team-appraisals/${id}/submit`, {}, auth);

/** acknowledge = submit even though ratings changed in Performance after the import or disputes are open. */
export const submitCycle = (id: number, acknowledge = false) =>
  apiClient.post<CycleDto>(`/compensation/cycles/${id}/submit`, acknowledge ? { acknowledge_rating_issues: true } : {}, auth);
export const approveCycle = (id: number) => apiClient.post<CycleDto>(`/compensation/cycles/${id}/approve`, {}, auth);
/** Rating-based bonus payouts of a cycle; dry_run (default) only previews. */
export const bonusPayouts = (id: number, body: { base: BonusBase; payout_month: string; payout_type?: string; title?: string; dry_run: boolean }) =>
  apiClient.post<BonusPayoutsDto>(`/compensation/cycles/${id}/bonus-payouts`, body, auth);
/** Bonus % per rating on an existing cycle (null removes it); increment % stays as it is. */
export const setBonusGuide = (id: number, bonus: Record<string, number | null>) => apiClient.put<CycleDto>(`/compensation/cycles/${id}/bonus-guide`, { bonus }, auth);
export const closeCycle = (id: number) => apiClient.post<CycleDto>(`/compensation/cycles/${id}/close`, {}, auth);

export const listPayouts = (params: Params) =>
  apiClient.get<PagedResponse & { payouts: PayoutDto[]; open_amount: number }>('/compensation/payouts', params, auth);
export const createPayouts = (body: Record<string, unknown>) =>
  apiClient.post<{ created: number; employees: number; skipped: { employee_id: number; reason: string }[]; status: string }>('/compensation/payouts', body, auth);
export const decidePayouts = (ids: number[], decision: 'approve' | 'reject') =>
  apiClient.post<{ decided: number; blocked: number }>('/compensation/payouts/decide', { ids, decision }, auth);
export const cancelPayouts = (ids: number[]) => apiClient.post<{ cancelled: number; locked: number }>('/compensation/payouts/cancel', { ids }, auth);
export const clawbackPayout = (id: number, body: Record<string, unknown>) =>
  apiClient.post<{ recovered: number; payout_month: string }>(`/compensation/payouts/${id}/clawback`, body, auth);

export const statutoryBonus = (params: Params) =>
  apiClient.get<PagedResponse & { fy: { start: string; end: string; label: string }; rows: BonusRowDto[] }>('/compensation/statutory-bonus', params, auth);
export const generateStatutoryBonus = (body: Record<string, unknown>) =>
  apiClient.post<{ created: number; amount: number }>('/compensation/statutory-bonus', body, auth);
export const gratuityLiability = (params: Params) =>
  apiClient.get<PagedResponse & { as_of: string; rows: GratuityRowDto[] }>('/compensation/gratuity', params, auth);
export const createGratuityPayout = (body: Record<string, unknown>) =>
  apiClient.post<{ amount: number; payout_month: string }>('/compensation/gratuity/payout', body, auth);

export const listRoles = () => apiClient.get<{ id: number; name: string }[]>('/organization/roles', undefined, auth);

// salary benchmarking
export const marketSurveys = () => apiClient.get<{ surveys: MarketSurveyDto[] }>('/compensation/market-surveys', undefined, auth);
export const importMarketSurvey = (body: { name: string; source?: string; effective_date: string; currency?: string; rows: Record<string, string>[] }) => apiClient.post<MarketImportDto>('/compensation/market-surveys', body, auth);
export const deleteMarketSurvey = (id: number) => apiClient.delete<{ ok: true }>(`/compensation/market-surveys/${id}`, auth);
export const marketBenchmark = (q: { survey_id?: number | null; band?: string; search?: string }) => apiClient.get<BenchmarkDto>('/compensation/market-benchmark', q as Params, auth);
