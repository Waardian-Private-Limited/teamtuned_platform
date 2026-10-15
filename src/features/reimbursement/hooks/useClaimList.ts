'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/reimbursement.api';
import { toClaim } from '../types/reimbursement.mapper';
import type { Channel, Claim, ClaimListTab, ClaimSortKey, ClaimSort, PayoutMode, PhysicalFilter } from '../types/reimbursement.model';
import { CLAIM_TAB_VALUES, DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/reimbursement.constants';

export interface ClaimListFilters {
  tab: ClaimListTab;
  channel: Channel | null;
  payoutMode: PayoutMode | null;
  categoryId: number | null;
  departmentId: number | null;
  /** Paper bill filter. */
  physical: PhysicalFilter | null;
  /** Expense (spent) date range. */
  from: string;
  to: string;
  search: string;
  subOrgId: number | null;
  sort: ClaimSort;
}

function initialTab(raw: string | null): ClaimListTab {
  return raw && (CLAIM_TAB_VALUES as string[]).includes(raw) ? (raw as ClaimListTab) : 'pending';
}

function initialId(raw: string | null): number | null {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n > 0 ? n : null;
}

export function useClaimList() {
  const params = useSearchParams();
  const [filters, setFilters] = useState<ClaimListFilters>(() => ({
    tab: initialTab(params.get('status')),
    channel: params.get('channel') === 'wallet' || params.get('channel') === 'claim' ? (params.get('channel') as Channel) : null,
    payoutMode: params.get('payout_mode') === 'payroll' || params.get('payout_mode') === 'manual' ? (params.get('payout_mode') as PayoutMode) : null,
    categoryId: initialId(params.get('category')),
    departmentId: null,
    physical: params.get('physical') === 'pending' || params.get('physical') === 'collected' ? (params.get('physical') as PhysicalFilter) : null,
    from: '',
    to: '',
    search: '',
    subOrgId: initialId(params.get('subOrgId')),
    sort: { key: 'submitted_at', dir: 'desc' },
  }));
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [rows, setRows] = useState<Claim[]>([]);
  const [total, setTotal] = useState(0);
  const [amount, setAmount] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listClaims({
        status: filters.tab,
        channel: filters.channel,
        payoutMode: filters.payoutMode,
        categoryId: filters.categoryId,
        departmentId: filters.departmentId,
        physical: filters.physical,
        // The page's date range is the expense date ("Spent from / to").
        spentFrom: filters.from,
        spentTo: filters.to,
        search: filters.search,
        subOrgId: filters.subOrgId,
        sort: filters.sort.dir === 'desc' ? `-${filters.sort.key}` : filters.sort.key,
        page,
        pageSize,
      });
      if (id !== request.current) return;
      setRows((dto.items || []).map(toClaim));
      setTotal(Number(dto.total) || 0);
      setAmount(Number(dto.amount) || 0);
      setCounts(Object.fromEntries(Object.entries(dto.counts || {}).map(([k, v]) => [k, Number(v) || 0])));
    } catch (err) {
      if (id !== request.current) return;
      setRows([]);
      setTotal(0);
      setAmount(0);
      setError(messageOf(err));
    } finally {
      if (id === request.current) {
        setIsFetching(false);
        setIsInitialLoading(false);
      }
    }
  }, [filters, page, pageSize]);

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

  const update = useCallback((patch: Partial<ClaimListFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const toggleSort = useCallback((key: ClaimSortKey) => {
    setFilters((f) => ({
      ...f,
      sort: f.sort.key === key ? { key, dir: f.sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' },
    }));
    setPage(1);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setFilters((f) => ({ ...f, channel: null, payoutMode: null, categoryId: null, departmentId: null, physical: null, from: '', to: '', search: '' }));
    setPage(1);
  }, []);

  return {
    filters,
    update,
    toggleSort,
    searchInput,
    setSearchInput,
    rows,
    total,
    amount,
    counts,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    isInitialLoading,
    isFetching,
    error,
    refetch: load,
    clearFilters,
    hasActiveFilters: Boolean(filters.search || filters.channel || filters.payoutMode || filters.categoryId || filters.departmentId || filters.physical || filters.from || filters.to),
  };
}
