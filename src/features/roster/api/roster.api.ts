import { apiClient } from '@/lib/apiClient';
import type {
  AvailabilityRow, Candidate, CellChange, Colleague, DemandInput, DiffChange, EmployeeLite, Insights, MemberInput,
  OpenShift, Pattern, PatternPreset, PreviewEmployee, RosterBoard, RosterRow, RosterSummary, RosterUnit, RosterUnitDetail,
  ScheduleDay, Skill, SwapRequest, UnitFilters, UnitInput, Violation, ClaimRow,
} from '../types/roster.types';

const auth = { withAuth: true } as const;

type Q = Record<string, string | number | undefined | null>;
const clean = (q: Q = {}) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const listUnits = (q: Q = {}) => apiClient.get<{ units: RosterUnit[] }>('/roster/units', clean(q), auth);
export const getUnit = (id: number) => apiClient.get<RosterUnitDetail>(`/roster/units/${id}`, undefined, auth);
export const createUnit = (body: UnitInput) => apiClient.post<RosterUnitDetail>('/roster/units', body, auth);
export const updateUnit = (id: number, body: Partial<UnitInput>) => apiClient.put<RosterUnitDetail>(`/roster/units/${id}`, body, auth);
export const deleteUnit = (id: number) => apiClient.delete<{ deleted: boolean }>(`/roster/units/${id}`, auth);
export const saveMembers = (id: number, members: MemberInput[]) => apiClient.put<RosterUnitDetail>(`/roster/units/${id}/members`, { members }, auth);
export const saveManagers = (id: number, employeeIds: number[]) => apiClient.put<RosterUnitDetail>(`/roster/units/${id}/managers`, { employeeIds }, auth);
export const saveDemands = (id: number, demands: DemandInput[]) => apiClient.put<RosterUnitDetail>(`/roster/units/${id}/demands`, { demands }, auth);
export const previewUnitMembers = (id: number) => apiClient.post<{ total: number; employees: PreviewEmployee[] }>(`/roster/units/${id}/preview`, {}, auth);
export const previewFilters = (body: { filters: UnitFilters; sub_organization_id?: number | null; parent_unit_id?: number | null }) =>
  apiClient.post<{ total: number; employees: PreviewEmployee[] }>('/roster/units/preview', body, auth);
export const searchEmployees = (q: { q?: string; sub_organization_id?: number | null }) => apiClient.get<{ employees: EmployeeLite[] }>('/roster/employees', clean(q), auth);

export const listPatterns = () => apiClient.get<{ patterns: Pattern[]; presets: PatternPreset[] }>('/roster/patterns', undefined, auth);
export const buildPreset = (body: { key: string; morningId: number; eveningId?: number | null; nightId?: number | null }) =>
  apiClient.post<{ name: string; cycle: (number | 'OFF')[] }>('/roster/patterns/preset', body, auth);
export const createPattern = (body: { name: string; cycle: (number | 'OFF')[]; sub_organization_id?: number | null }) => apiClient.post<Pattern>('/roster/patterns', body, auth);
export const updatePattern = (id: number, body: { name?: string; cycle?: (number | 'OFF')[]; status?: string }) => apiClient.put<Pattern>(`/roster/patterns/${id}`, body, auth);
export const deletePattern = (id: number) => apiClient.delete<{ deleted: boolean }>(`/roster/patterns/${id}`, auth);

export const listSkills = () => apiClient.get<{ skills: Skill[] }>('/roster/skills', undefined, auth);
export const createSkill = (body: { name: string; sub_organization_id?: number | null }) => apiClient.post<Skill>('/roster/skills', body, auth);
export const renameSkill = (id: number, name: string) => apiClient.put<Skill>(`/roster/skills/${id}`, { name }, auth);
export const deleteSkill = (id: number) => apiClient.delete<{ deleted: boolean }>(`/roster/skills/${id}`, auth);
export const getEmployeeSkills = (employeeId: number) => apiClient.get<{ skills: { skill_id: number; name: string; valid_until: string | null }[] }>(`/roster/employees/${employeeId}/skills`, undefined, auth);
export const saveEmployeeSkills = (employeeId: number, skills: { skillId: number; validUntil?: string | null }[]) =>
  apiClient.put<{ skills: { skill_id: number; name: string }[] }>(`/roster/employees/${employeeId}/skills`, { skills }, auth);

export const listRosters = (q: Q = {}) => apiClient.get<{ rosters: RosterRow[] }>('/roster/rosters', clean(q), auth);
export const createRoster = (body: { unitId: number; periodStart: string; periodEnd: string }) => apiClient.post<RosterBoard>('/roster/rosters', body, auth);
export const getRoster = (id: number) => apiClient.get<RosterBoard>(`/roster/rosters/${id}`, undefined, auth);
export const getRosterStatus = (id: number) => apiClient.get<{ id: number; status: string; version: number; summary: RosterSummary | null; error: string | null }>(`/roster/rosters/${id}/status`, undefined, auth);
export const generateRoster = (id: number, body: { seed?: number; keepLocked?: boolean; allowOvertimeToCover?: boolean; weights?: Record<string, number> } = {}) =>
  apiClient.post<{ id: number; status: string }>(`/roster/rosters/${id}/generate`, body, auth);
export const updateAssignments = (id: number, body: { version?: number; changes: CellChange[] }) => apiClient.put<{ version: number }>(`/roster/rosters/${id}/assignments`, body, auth);
export const validateRoster = (id: number) => apiClient.post<{ violations: Violation[]; summary: RosterSummary }>(`/roster/rosters/${id}/validate`, {}, auth);
export const suggestReplacement = (id: number, body: { date: string; templateId: number; employeeId?: number; roleId?: number | null; skillId?: number | null }) =>
  apiClient.post<{ candidates: Candidate[] }>(`/roster/rosters/${id}/suggest`, body, auth);
export const diffRoster = (id: number) => apiClient.get<{ changes: DiffChange[]; employeeIds: number[] }>(`/roster/rosters/${id}/diff`, undefined, auth);
export const publishRoster = (id: number, body: { version?: number; notify?: boolean } = {}) => apiClient.post<{ id: number; changes: number; employees: number }>(`/roster/rosters/${id}/publish`, body, auth);
export const archiveRoster = (id: number) => apiClient.post<{ id: number; status: string }>(`/roster/rosters/${id}/archive`, {}, auth);
export const deleteRoster = (id: number) => apiClient.delete<{ deleted: boolean }>(`/roster/rosters/${id}`, auth);
export const getInsights = (q: { unitId: number; from: string; to: string }) => apiClient.get<Insights>('/roster/insights', clean(q), auth);

export const getMySchedule = (q: { from: string; to: string }) => apiClient.get<{ days: ScheduleDay[]; holidays: { date: string; name: string }[] }>('/roster/me/schedule', clean(q), auth);

export const listSwaps = (q: { scope?: 'mine' | 'approvals'; status?: string } = {}) => apiClient.get<{ requests: SwapRequest[] }>('/roster/swaps', clean(q), auth);
export const swapCandidates = (q: { fromDate: string; fromSeq?: number }) => apiClient.get<{ colleagues: Colleague[] }>('/roster/swaps/candidates', clean(q), auth);
export const createSwap = (body: { type: 'swap' | 'give_away' | 'drop_to_open'; fromDate: string; fromSeq?: number; toEmployeeId?: number; toDate?: string; toSeq?: number; reason?: string }) =>
  apiClient.post<SwapRequest>('/roster/swaps', body, auth);
export const decideSwap = (id: number, body: { decision: 'approved' | 'rejected'; note?: string }) => apiClient.post<SwapRequest>(`/roster/swaps/${id}/decide`, body, auth);
export const cancelSwap = (id: number) => apiClient.post<SwapRequest>(`/roster/swaps/${id}/cancel`, {}, auth);

export const listOpenShifts = (q: { scope?: 'mine' | 'manage'; unitId?: number; from?: string; to?: string; status?: string } = {}) => apiClient.get<{ open_shifts: OpenShift[] }>('/roster/open-shifts', clean(q), auth);
export const createOpenShift = (body: { unitId: number; date: string; templateId: number; roleId?: number | null; skillId?: number | null; needed?: number; isOvertime?: boolean }) => apiClient.post<OpenShift>('/roster/open-shifts', body, auth);
export const closeOpenShift = (id: number) => apiClient.post<{ id: number; status: string }>(`/roster/open-shifts/${id}/close`, {}, auth);
export const assignOpenShift = (id: number, body: { employeeId: number; force?: boolean }) => apiClient.post<OpenShift>(`/roster/open-shifts/${id}/assign`, body, auth);
export const claimOpenShift = (id: number) => apiClient.post<ClaimRow>(`/roster/open-shifts/${id}/claim`, {}, auth);
export const decideClaim = (id: number, body: { decision: 'approved' | 'rejected'; note?: string }) => apiClient.post<ClaimRow>(`/roster/open-shift-claims/${id}/decide`, body, auth);
export const withdrawClaim = (id: number) => apiClient.post<ClaimRow>(`/roster/open-shift-claims/${id}/withdraw`, {}, auth);

export const listAvailability = (q: { scope?: 'mine' | 'approvals'; status?: string; from?: string; to?: string } = {}) => apiClient.get<{ availability: AvailabilityRow[] }>('/roster/availability', clean(q), auth);
export const createAvailability = (body: { kind: 'unavailable' | 'prefer' | 'avoid'; fromDate: string; toDate?: string; daysMask?: number; shiftTemplateId?: number | null; note?: string; employeeId?: number }) =>
  apiClient.post<{ id: number; status: string }>('/roster/availability', body, auth);
export const decideAvailability = (id: number, body: { decision: 'approved' | 'rejected' }) => apiClient.post<{ id: number; status: string }>(`/roster/availability/${id}/decide`, body, auth);
export const cancelAvailability = (id: number) => apiClient.post<{ id: number; status: string }>(`/roster/availability/${id}/cancel`, {}, auth);
