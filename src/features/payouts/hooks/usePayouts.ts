'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/payouts.api';
import { SEARCH_DEBOUNCE_MS } from '../constants/payouts.constants';
import { toOverview, toPayout } from '../types/payouts.mapper';
import type { Payout, PayoutFilters, PayoutOverview, PayoutSortKey } from '../types/payouts.model';

const DEFAULT_FILTERS: PayoutFilters = { tab: 'to_pay', source: null, month: '', siteId: null, subOrgId: null, search: '', sort: { key: 'due_on', dir: 'asc' } };

/** The payouts list with its filters, paging, totals and row selection. */
export function usePayouts() {
  const [filters, setFilters] = useState<PayoutFilters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(25);
  const [rows, setRows] = useState<Payout[]>([]);
  const [total, setTotal] = useState(0);
  const [amount, setAmount] = useState(0);
  const [overview, setOverview] = useState<PayoutOverview | null>(null);
  const [selected, setSelected] = useState<Map<string, Payout>>(new Map());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

  const query = useMemo<api.PayoutQuery>(() => ({
    tab: filters.tab,
    source: filters.source,
    month: filters.month,
    siteId: filters.siteId,
    subOrgId: filters.subOrgId,
    search: filters.search,
    sort: filters.sort.dir === 'desc' ? `-${filters.sort.key}` : filters.sort.key,
  }), [filters]);

  const load = useCallback(async () => {
    const id = ++request.current;
    setIsFetching(true);
    setError('');
    try {
      const [list, ov] = await Promise.all([api.listPayouts({ ...query, page, pageSize }), api.getOverview(filters.subOrgId)]);
      if (id !== request.current) return;
      setRows(list.items.map(toPayout));
      setTotal(list.total);
      setAmount(list.amount);
      setOverview(toOverview(ov));
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
  }, [query, page, pageSize, filters.subOrgId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === searchInput.trim() ? f : { ...f, search: searchInput.trim() }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const update = useCallback((patch: Partial<PayoutFilters>) => {
    setFilters((f) => ({ ...f, ...patch, ...(patch.tab && !patch.sort ? { sort: patch.tab === 'paid' ? { key: 'paid_on' as const, dir: 'desc' as const } : { key: 'due_on' as const, dir: 'asc' as const } } : {}) }));
    setPage(1);
    setSelected(new Map());
  }, []);

  const toggleSort = useCallback((key: PayoutSortKey) => {
    setFilters((f) => ({ ...f, sort: { key, dir: f.sort.key === key && f.sort.dir === 'asc' ? 'desc' : 'asc' } }));
    setPage(1);
  }, []);

  const toggle = useCallback((row: Payout) => {
    setSelected((s) => {
      const next = new Map(s);
      if (next.has(row.key)) next.delete(row.key);
      else next.set(row.key, row);
      return next;
    });
  }, []);

  const togglePage = useCallback((list: Payout[]) => {
    setSelected((s) => {
      const next = new Map(s);
      const all = list.every((r) => next.has(r.key));
      for (const r of list) {
        if (all) next.delete(r.key);
        else next.set(r.key, r);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Map()), []);

  const done = useCallback(() => {
    setSelected(new Map());
    load();
  }, [load]);

  return {
    filters, update, toggleSort, searchInput, setSearchInput,
    page, setPage, pageSize, setPageSize: (n: number) => { setPageSizeState(n); setPage(1); },
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows, total, amount, overview, query,
    selected, toggle, togglePage, clearSelection,
    isInitialLoading, isFetching, error, refresh: done,
    hasActiveFilters: Boolean(filters.source || filters.month || filters.siteId || filters.search),
    clearFilters: () => { setSearchInput(''); update({ source: null, month: '', siteId: null, search: '' }); },
  };
}
