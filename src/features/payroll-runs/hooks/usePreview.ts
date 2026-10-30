'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/payrollRuns.api';
import { DEFAULT_PAGE_SIZE, POLL_MS, SEARCH_DEBOUNCE_MS } from '../constants/payrollRuns.constants';
import { toPreview } from '../types/payrollRuns.mapper';
import type { ItemFilters, ItemSortKey, PayItem, Preview, Run } from '../types/payrollRuns.model';

const INITIAL: ItemFilters = { search: '', status: 'all', siteId: null, departmentId: null, sort: 'name', dir: 'asc' };

export function previewTarget(run: Run): api.PreviewTarget {
  return { month: run.month, subOrganizationId: run.subOrganizationId, periodStart: run.periodStart, periodEnd: run.periodEnd };
}

function sortValue(item: PayItem, key: ItemSortKey) {
  if (key === 'net_pay') return item.netPay;
  if (key === 'payable_days') return item.payableDays;
  if (key === 'lop_days') return item.lopDays;
  return item.employee.name.toLowerCase();
}

/**
 * Calculates a not-started payroll without saving it and pages its employees on the client, with the same
 * filters as a real payroll's list. `run` is the not-started payroll; null closes the preview.
 */
export function usePreview(run: Run | null) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<ItemFilters>(INITIAL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const reqRef = useRef(0);

  const target = useMemo(() => (run ? previewTarget(run) : null), [run]);
  const targetKey = target ? `${target.month}|${target.subOrganizationId}|${target.periodStart}|${target.periodEnd}` : '';

  const begin = useCallback(
    async (refresh: boolean) => {
      if (!target) return;
      const req = ++reqRef.current;
      setError('');
      if (refresh) setPreview((p) => (p ? { ...p, state: 'running', done: 0 } : p));
      try {
        const started = toPreview(await api.startPreview(target, refresh));
        if (req !== reqRef.current) return;
        setPreview(started.state === 'done' ? toPreview(await api.getPreview(target)) : started);
      } catch (err) {
        if (req === reqRef.current) setError(messageOf(err));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetKey]
  );

  useEffect(() => {
    setPreview(null);
    setSearchInput('');
    setFilters(INITIAL);
    setPage(1);
    if (target) begin(false);
    else ++reqRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const running = preview?.state === 'running';
  useEffect(() => {
    if (!running || !target) return;
    const req = reqRef.current;
    const timer = setInterval(async () => {
      try {
        const next = toPreview(await api.getPreview(target));
        if (req === reqRef.current) setPreview(next);
      } catch (err) {
        if (req === reqRef.current) setError(messageOf(err));
      }
    }, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, targetKey]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const matching = useMemo(() => {
    const all = preview?.items || [];
    const q = filters.search.trim().toLowerCase();
    const rows = all.filter(
      (i) =>
        (filters.status === 'all' || i.status === filters.status) &&
        (filters.siteId === null || i.siteId === filters.siteId) &&
        (filters.departmentId === null || i.departmentId === filters.departmentId) &&
        (!q || i.employee.name.toLowerCase().includes(q) || (i.employee.code || '').toLowerCase().includes(q))
    );
    const sign = filters.dir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => {
      const x = sortValue(a, filters.sort);
      const y = sortValue(b, filters.sort);
      return x < y ? -sign : x > y ? sign : 0;
    });
  }, [preview, filters]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const i of preview?.items || []) out[i.status] = (out[i.status] || 0) + 1;
    return out;
  }, [preview]);

  const update = useCallback((patch: Partial<ItemFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const toggleSort = useCallback((key: ItemSortKey) => {
    setFilters((f) => (f.sort === key ? { ...f, dir: f.dir === 'asc' ? 'desc' : 'asc' } : { ...f, sort: key, dir: key === 'name' ? 'asc' : 'desc' }));
    setPage(1);
  }, []);

  const clear = useCallback(() => {
    setSearchInput('');
    setFilters(INITIAL);
    setPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(matching.length / pageSize));

  return {
    target,
    preview,
    error,
    loading: Boolean(target) && !preview && !error,
    running,
    refresh: () => begin(true),
    all: matching,
    items: matching.slice((page - 1) * pageSize, page * pageSize),
    counts,
    searchInput,
    setSearchInput,
    filters,
    update,
    toggleSort,
    clear,
    narrowed: Boolean(filters.search) || filters.status !== 'all' || filters.siteId !== null || filters.departmentId !== null,
    page,
    setPage,
    pageSize,
    setPageSize,
    total: matching.length,
    totalPages,
  };
}
