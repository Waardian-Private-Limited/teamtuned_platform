'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import { usePolling } from '@/lib/hooks/usePolling';
import { getEmployees, getFilterOptions, getOverview } from '../api/dashboard.api';
import { PAGE_SIZE } from '../constants/dashboard.constants';
import type { DashboardFilters, EmployeesResponseDto, EmployeeView, FilterOptionsDto, OverviewDto } from '../types/dashboard.dto';

const REFRESH_MS = 60_000;

/**
 * Everything the dashboard shows, kept in step with the filters. Options reload when the
 * sub-org or department changes (sites, departments and roles depend on them); the overview
 * and the list reload on any filter change and every minute while looking at today (the
 * list only while its popup is open).
 */
export function useAttendanceDashboard() {
  const [filters, setFilters] = useState<DashboardFilters>({ date: '', subOrgId: null, siteId: null, departmentId: null, roleId: null });
  const [options, setOptions] = useState<FilterOptionsDto | null>(null);
  const [overview, setOverview] = useState<OverviewDto | null>(null);
  const [list, setList] = useState<EmployeesResponseDto | null>(null);
  const [view, setView] = useState<EmployeeView>('all');
  // The people list lives in a popup; it loads only while the popup is open.
  const [listOpen, setListOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingList, setLoadingList] = useState(true);

  // Filter options: first load sets today's date in the org's time zone.
  useEffect(() => {
    const controller = new AbortController();
    getFilterOptions(filters.subOrgId, filters.departmentId, controller.signal)
      .then((o) => {
        setOptions(o);
        setFilters((f) => {
          const next = { ...f, date: f.date || o.today };
          // A site, department or role that is not offered any more (another sub-org) is dropped.
          if (next.siteId && !o.sites.some((s) => s.id === next.siteId)) next.siteId = null;
          if (next.departmentId && !o.departments.some((d) => d.id === next.departmentId)) next.departmentId = null;
          if (next.roleId && !o.roles.some((r) => r.id === next.roleId)) next.roleId = null;
          return next;
        });
      })
      .catch((e) => { if (!controller.signal.aborted) setError(messageOf(e)); });
    return () => controller.abort();
  }, [filters.subOrgId, filters.departmentId]);

  const ready = !!filters.date;
  const key = JSON.stringify(filters);
  const isToday = !!options && filters.date === options.today;

  usePolling(
    async (signal) => {
      setLoadingOverview(true);
      try {
        const data = await getOverview(filters, signal);
        if (!signal.aborted) { setOverview(data); setError(null); }
      } catch (e) {
        if (!signal.aborted) setError(messageOf(e));
      } finally {
        if (!signal.aborted) setLoadingOverview(false);
      }
    },
    isToday ? REFRESH_MS : 24 * 3600_000,
    ready,
    key,
  );

  const listKey = `${key}|${view}|${search}|${page}`;
  usePolling(
    async (signal) => {
      setLoadingList(true);
      try {
        const data = await getEmployees(filters, view, search, page, PAGE_SIZE, signal);
        if (!signal.aborted) setList(data);
      } catch (e) {
        if (!signal.aborted) setError(messageOf(e));
      } finally {
        if (!signal.aborted) setLoadingList(false);
      }
    },
    isToday ? REFRESH_MS : 24 * 3600_000,
    ready && listOpen,
    listKey,
  );

  const update = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((f) => {
      const next = { ...f, ...patch };
      // A new sub-org changes what the other lists contain; a new department narrows roles.
      if ('subOrgId' in patch && patch.subOrgId !== f.subOrgId) Object.assign(next, { siteId: null, departmentId: null, roleId: null });
      if ('departmentId' in patch && patch.departmentId !== f.departmentId) next.roleId = null;
      return next;
    });
    setPage(1);
  }, []);

  const reset = useCallback(() => {
    setFilters((f) => ({ date: options?.today || f.date, subOrgId: null, siteId: null, departmentId: null, roleId: null }));
    setView('all');
    setSearch('');
    setPage(1);
  }, [options?.today]);

  const narrowed = useMemo(() => !!(filters.subOrgId || filters.siteId || filters.departmentId || filters.roleId), [filters]);

  return {
    filters, update, reset, narrowed, options, overview, list, error, isToday,
    loadingOverview: loadingOverview && !overview, refreshingOverview: loadingOverview,
    loadingList, view, setView: (v: EmployeeView) => { setView(v); setPage(1); },
    listOpen,
    openList: (v: EmployeeView) => { setView(v); setSearch(''); setPage(1); setList(null); setListOpen(true); },
    closeList: () => setListOpen(false),
    search, setSearch: (s: string) => { setSearch(s); setPage(1); }, page, setPage,
  };
}
