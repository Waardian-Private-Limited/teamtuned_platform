'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/petty-cash.api';
import { DEFAULT_PAGE_SIZE, EXPENSE_TAB_VALUES } from '../constants/petty-cash.constants';
import { toExpense, toExpenseCounts } from '../types/petty-cash.mapper';
import type { Expense, ExpenseCounts, ExpenseFilters, ExpenseSortKey, ExpenseTab } from '../types/petty-cash.model';
import { SEARCH_DEBOUNCE_MS } from '@/features/expense-bills/constants/bill.constants';

export type ExpenseListMode = 'hr' | 'me' | 'inward';

export interface ExpenseSort {
  key: ExpenseSortKey;
  dir: 'asc' | 'desc';
}

const asId = (raw: string | null) => {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n > 0 ? n : null;
};

/** The filters as the API's query: the tab becomes `status`; the goods register is read through `inward`. */
export function filtersQuery(f: ExpenseFilters, mode: ExpenseListMode): api.ExpenseQuery {
  const status = mode === 'inward' ? undefined : f.tab === 'all' ? undefined : f.tab;
  return {
    status,
    walletId: f.walletId,
    siteId: mode === 'me' ? null : f.siteId,
    subOrgId: mode === 'me' ? null : f.subOrgId,
    categoryId: f.categoryId,
    spentBy: mode === 'hr' || mode === 'inward' ? f.spentBy : null,
    paymentMode: f.paymentMode,
    physical: f.physical,
    inward: f.inward,
    from: f.from,
    to: f.to,
    minAmount: f.minAmount,
    maxAmount: f.maxAmount,
    flagged: f.flagged,
    search: f.search,
  };
}

export const emptyFilters = (tab: ExpenseTab): ExpenseFilters => ({
  tab,
  walletId: null,
  siteId: null,
  subOrgId: null,
  categoryId: null,
  spentBy: null,
  paymentMode: null,
  physical: null,
  inward: null,
  from: '',
  to: '',
  minAmount: '',
  maxAmount: '',
  flagged: false,
  search: '',
});

export interface ExpenseListOptions {
  /** Filters the list starts with (the paper-bill view starts on `physical: pending`). */
  initial?: Partial<ExpenseFilters>;
  /** The filter a page drives with its own tabs: it is not counted as an extra filter and survives Clear. */
  viewKey?: 'inward' | 'physical';
}

/**
 * Paged expense list for the HR list (`/expenses`), the goods register (`/inward`, driven by the `inward`
 * filter) and the employee's own (`/me/expenses`). Search is debounced; a request sequence drops stale answers.
 */
export function useExpenseList(mode: ExpenseListMode, defaultTab: ExpenseTab = 'pending', options: ExpenseListOptions = {}) {
  const viewKey = options.viewKey ?? (mode === 'inward' ? 'inward' : null);
  const optionsRef = useRef(options);
  const params = useSearchParams();
  const [filters, setFilters] = useState<ExpenseFilters>(() => {
    const raw = params.get('status');
    const tab = raw && (EXPENSE_TAB_VALUES as string[]).includes(raw) ? (raw as ExpenseTab) : defaultTab;
    const physical = params.get('physical');
    const inward = params.get('inward');
    return {
      ...emptyFilters(tab),
      walletId: asId(params.get('wallet_id')),
      subOrgId: asId(params.get('subOrgId')),
      categoryId: asId(params.get('category_id')),
      physical: physical === 'pending' || physical === 'received' || physical === 'receivable' || physical === 'none' ? physical : null,
      inward: inward === 'waiting' || inward === 'pending' || inward === 'partial' || inward === 'received' || inward === 'none' ? inward : mode === 'inward' ? 'waiting' : null,
      ...optionsRef.current.initial,
    };
  });
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<ExpenseSort>({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [rows, setRows] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [amount, setAmount] = useState(0);
  const [counts, setCounts] = useState<ExpenseCounts>(() => toExpenseCounts(null));
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setIsFetching(true);
    setError('');
    try {
      const q = { ...filtersQuery(filters, mode), page, pageSize };
      // Only the HR list takes a sort; `/me/expenses` and the register order themselves.
      const dto =
        mode === 'me'
          ? await api.listMyExpenses(q)
          : mode === 'hr'
            ? await api.listExpenses({ ...q, sort: sort.dir === 'desc' ? `-${sort.key}` : sort.key })
            : await api.listInward(q);
      if (id !== request.current) return;
      setRows((dto.items || []).map(toExpense));
      setTotal(Number(dto.total) || 0);
      setAmount(Number('amount' in dto ? dto.amount : 0) || 0);
      const c = (dto.counts ?? {}) as Record<string, unknown>;
      setCounts(toExpenseCounts(c));
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
  }, [filters, page, pageSize, sort, mode]);

  useEffect(() => {
    load();
  }, [load]);

  // The search applied so far: the first page is shown again only when it really changes.
  const appliedSearch = useRef('');
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      if (next === appliedSearch.current) return;
      appliedSearch.current = next;
      setFilters((f) => ({ ...f, search: next }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const update = useCallback((patch: Partial<ExpenseFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const toggleSort = useCallback((key: ExpenseSortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
    setPage(1);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    appliedSearch.current = '';
    // The company picker sits apart from the filters and stays as chosen.
    setFilters((f) => ({ ...emptyFilters(f.tab), subOrgId: f.subOrgId, ...(viewKey ? { [viewKey]: f[viewKey] } : {}) }));
    setPage(1);
  }, [viewKey]);

  const hasActiveFilters = Boolean(
    filters.search || filters.walletId || filters.siteId || filters.categoryId || filters.spentBy || filters.paymentMode || (viewKey !== 'physical' && filters.physical) || (viewKey !== 'inward' && filters.inward) || filters.from || filters.to || filters.minAmount || filters.maxAmount || filters.flagged
  );

  return {
    filters,
    update,
    sort,
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
    hasActiveFilters,
  };
}
