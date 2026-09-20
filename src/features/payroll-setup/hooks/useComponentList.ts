'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/payrollSetup.api';
import { toComponents } from '../types/payroll-setup.mapper';
import type { SalaryComponent } from '../types/payroll-setup.model';
import { messageOf } from '../utils/asyncAction';
import type { StatusFilter } from '../constants/payroll-setup.constants';
import { SEARCH_DEBOUNCE_MS } from '../constants/payroll-setup.constants';

export function useComponentList() {
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilterState] = useState<'all' | 'credit' | 'debit'>('all');
  const inFlightRef = useRef(false);

  const fetchComponents = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listComponents({ status: 'all' });
      setComponents(toComponents(dto.components));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const setStatus = useCallback((v: StatusFilter) => setStatusState(v), []);
  const setTypeFilter = useCallback((v: 'all' | 'credit' | 'debit') => setTypeFilterState(v), []);

  const searchTerm = search.trim().toLowerCase();
  const filtered = components.filter((c) => {
    if (status !== 'all' && c.status !== status) return false;
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (searchTerm && !c.name.toLowerCase().includes(searchTerm) && !(c.description || '').toLowerCase().includes(searchTerm)) return false;
    return true;
  });

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatusState('all');
    setTypeFilterState('all');
  }, []);

  return {
    components: filtered,
    allComponents: components,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    typeFilter,
    setTypeFilter,
    total: filtered.length,
    refetch: fetchComponents,
    clearFilters,
    hasActiveFilters: Boolean(search) || status !== 'all' || typeFilter !== 'all',
  };
}
