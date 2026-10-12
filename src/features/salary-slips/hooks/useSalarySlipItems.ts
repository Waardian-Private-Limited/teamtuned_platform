'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/salarySlips.api';
import { toSlipPage } from '../types/salarySlips.mapper';
import type { PayRun, SalarySlipRow } from '../types/salarySlips.model';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/salarySlips.constants';

export function useSalarySlipItems(run: PayRun | null) {
  const runId = run?.id ?? null;
  const [rows, setRows] = useState<SalarySlipRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [siteId, setSiteIdState] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const request = useRef(0);
  const seen = useRef(new Map<number, SalarySlipRow>());
  const runRef = useRef(run);
  runRef.current = run;

  const load = useCallback(async () => {
    const current = runRef.current;
    if (!runId || !current) {
      setRows([]);
      setTotal(0);
      setIsInitialLoading(false);
      return;
    }
    const id = ++request.current;
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listRunItems(runId, { page, pageSize, search, siteId });
      if (id !== request.current) return;
      const result = toSlipPage(dto, current);
      result.rows.forEach((r) => seen.current.set(r.employeeId, r));
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      if (id !== request.current) return;
      setRows([]);
      setTotal(0);
      setError(messageOf(err));
    } finally {
      if (id === request.current) {
        setIsFetching(false);
        setIsInitialLoading(false);
      }
    }
  }, [runId, page, pageSize, search, siteId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setIsInitialLoading(true);
    seen.current = new Map();
    setSelected(new Set());
    setPage(1);
  }, [runId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const setSiteId = useCallback((next: number | null) => {
    setSiteIdState(next);
    setPage(1);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setSiteIdState(null);
    setPage(1);
  }, []);

  const toggle = useCallback((employeeId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  }, []);

  const pageIds = useMemo(() => rows.map((r) => r.employeeId), [rows]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const togglePage = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const every = pageIds.every((id) => next.has(id));
      pageIds.forEach((id) => (every ? next.delete(id) : next.add(id)));
      return next;
    });
  }, [pageIds]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const knownRow = useCallback((employeeId: number) => seen.current.get(employeeId) ?? null, []);

  return {
    rows,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    siteId,
    setSiteId,
    page,
    setPage,
    pageSize,
    setPageSize,
    clearFilters,
    hasActiveFilters: Boolean(search) || siteId !== null,
    selected,
    toggle,
    togglePage,
    allOnPageSelected,
    clearSelection,
    knownRow,
    refetch: load,
  };
}
