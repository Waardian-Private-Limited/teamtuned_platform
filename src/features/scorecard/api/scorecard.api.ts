import { apiClient } from '@/lib/apiClient';
import type { ScorecardFilters, ScorecardListDto, ScorecardPersonDto, ScorecardSort } from '../types/scorecard.dto';

const auth = { withAuth: true } as const;

const period = (f: ScorecardFilters) => ({ period: f.period, date: f.date || undefined, year_start: f.yearStart });

export interface ScorecardQuery {
  sort: ScorecardSort;
  dir: 'asc' | 'desc';
  search?: string;
  limit: number;
  offset: number;
}

/** Scorecards of everyone the viewer may see for the period (just their own for a self viewer). */
export function getScorecards(f: ScorecardFilters, q: ScorecardQuery, signal?: AbortSignal) {
  return apiClient.get<ScorecardListDto>('/scorecard', {
    ...period(f), site_id: f.siteId ?? undefined, department_id: f.departmentId ?? undefined, ...q, search: q.search || undefined,
  }, { ...auth, signal });
}

/** One person's scorecard for the period, with trend and comparisons. */
export function getScorecard(f: ScorecardFilters, employeeId: number, signal?: AbortSignal) {
  return apiClient.get<ScorecardPersonDto>(`/scorecard/employees/${employeeId}`, period(f), { ...auth, signal });
}
