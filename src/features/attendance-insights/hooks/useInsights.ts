'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { getFilterOptions } from '@/features/attendance-dashboard/api/dashboard.api';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';
import { getEmployeeInsights, getInsights } from '../api/insights.api';
import { EMPLOYEE_PAGE_SIZE } from '../constants/insights.constants';
import type { EmployeeInsightsDto, InsightFilters, InsightGroup, InsightPeriod, InsightsDto, InsightSort } from '../types/insights.dto';

const PREFS_KEY = 'tt.insights.prefs';

// The period and year basis are remembered per viewer; storage can be missing or blocked.
function readPrefs(): { period: InsightPeriod; yearStart: 1 | 4 } {
  try {
    const p = JSON.parse(window.localStorage.getItem(PREFS_KEY) || '{}');
    return { period: ['week', 'month', 'quarter', 'year'].includes(p.period) ? p.period : 'month', yearStart: p.yearStart === 4 ? 4 : 1 };
  } catch {
    return { period: 'month', yearStart: 1 };
  }
}

function writePrefs(period: InsightPeriod, yearStart: 1 | 4) {
  try { window.localStorage.setItem(PREFS_KEY, JSON.stringify({ period, yearStart })); } catch { /* not kept */ }
}

/**
 * Everything the insights page shows, in step with the filters: the period figures (reloaded
 * on any change), filter options (reloaded when the sub-org or department changes), and the
 * employee opened in the side panel.
 */
export function useInsights() {
  const [filters, setFilters] = useState<InsightFilters>({ period: 'month', date: '', yearStart: 1, subOrgId: null, siteId: null, departmentId: null, roleId: null });
  const [prefsRead, setPrefsRead] = useState(false);
  const [group, setGroup] = useState<InsightGroup>('site');
  const [sort, setSort] = useState<{ key: InsightSort; dir: 'asc' | 'desc' }>({ key: 'headcount', dir: 'desc' });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState<FilterOptionsDto | null>(null);
  const [data, setData] = useState<InsightsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personId, setPersonId] = useState<number | null>(null);
  const [person, setPerson] = useState<EmployeeInsightsDto | null>(null);
  const [personError, setPersonError] = useState<string | null>(null);

  useEffect(() => {
    const p = readPrefs();
    setFilters((f) => ({ ...f, period: p.period, yearStart: p.yearStart }));
    setPrefsRead(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getFilterOptions(filters.subOrgId, filters.departmentId, controller.signal)
      .then((o) => {
        setOptions(o);
        setFilters((f) => {
          const next = { ...f };
          if (next.siteId && !o.sites.some((s) => s.id === next.siteId)) next.siteId = null;
          if (next.departmentId && !o.departments.some((d) => d.id === next.departmentId)) next.departmentId = null;
          if (next.roleId && !o.roles.some((r) => r.id === next.roleId)) next.roleId = null;
          return next;
        });
      })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); });
    return () => controller.abort();
  }, [filters.subOrgId, filters.departmentId]);

  // Search waits for typing to pause.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const key = JSON.stringify({ filters, group, sort, search, page });
  useEffect(() => {
    if (!prefsRead) return undefined;
    const controller = new AbortController();
    setLoading(true);
    getInsights(filters, {
      group, sort: sort.key, dir: sort.dir,
      ...(group === 'employee' ? { search, limit: EMPLOYEE_PAGE_SIZE, offset: (page - 1) * EMPLOYEE_PAGE_SIZE } : {}),
    }, controller.signal)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, prefsRead]);

  // The person panel follows the period and sub-org, not the department or role filters.
  const personKey = JSON.stringify({ personId, period: filters.period, date: filters.date, yearStart: filters.yearStart, subOrgId: filters.subOrgId });
  useEffect(() => {
    if (!personId) { setPerson(null); return undefined; }
    const controller = new AbortController();
    setPerson(null);
    setPersonError(null);
    getEmployeeInsights(filters, personId, controller.signal)
      .then((d) => setPerson(d))
      .catch((e) => { if (!controller.signal.aborted) setPersonError(messageOf(e)); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personKey]);

  const update = useCallback((patch: Partial<InsightFilters>) => {
    setFilters((f) => {
      const next = { ...f, ...patch };
      if ('subOrgId' in patch && patch.subOrgId !== f.subOrgId) Object.assign(next, { siteId: null, departmentId: null, roleId: null });
      if ('departmentId' in patch && patch.departmentId !== f.departmentId) next.roleId = null;
      if ('period' in patch || 'yearStart' in patch) writePrefs(next.period, next.yearStart);
      return next;
    });
    setPage(1);
  }, []);

  const changeGroup = useCallback((g: InsightGroup) => {
    setGroup(g);
    setSort(g === 'employee' ? { key: 'consistency', dir: 'desc' } : { key: 'headcount', dir: 'desc' });
    setPage(1);
  }, []);

  const toggleSort = useCallback((k: InsightSort) => {
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key: k, dir: k === 'name' ? 'asc' : 'desc' }));
    setPage(1);
  }, []);

  const reset = useCallback(() => {
    setFilters((f) => ({ ...f, date: '', subOrgId: null, siteId: null, departmentId: null, roleId: null }));
    setSearchInput('');
    setPage(1);
  }, []);

  /** Every employee row under the current filters and sort (paged in hundreds), for the CSV. */
  const allEmployees = useCallback(async () => {
    const rows = [];
    for (let offset = 0; ; offset += 100) {
      const d = await getInsights(filters, { group: 'employee', sort: sort.key, dir: sort.dir, search, limit: 100, offset });
      rows.push(...(d.employees?.items ?? []));
      if (!d.employees || offset + 100 >= d.employees.total) break;
    }
    return rows;
  }, [filters, sort, search]);

  const narrowed = useMemo(() => !!(filters.subOrgId || filters.siteId || filters.departmentId || filters.roleId), [filters]);

  return {
    filters, update, reset, narrowed, options, data, loading: loading && !data, refreshing: loading, error,
    group, setGroup: changeGroup, sort, toggleSort, searchInput, setSearchInput, page, setPage, allEmployees,
    personId, openPerson: setPersonId, closePerson: () => setPersonId(null), person, personError,
  };
}
