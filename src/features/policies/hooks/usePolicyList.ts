'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as policiesApi from '../api/policies.api';
import { toPolicyList } from '../types/policies.mapper';
import type { Policy } from '../types/policies.model';
import { messageOf } from '@/lib/api/errors';
import { SEARCH_DEBOUNCE_MS, type PolicyStatusFilter } from '../constants/policies.constants';

export function usePolicyList() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PolicyStatusFilter>('all');

  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const fetchPolicies = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!hasLoadedRef.current) setIsInitialLoading(true);
    setIsFetching(true);
    setError('');
    try {
      const dto = await policiesApi.listPolicies({ search, status });
      const result = toPolicyList(dto);
      setPolicies(result.policies);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, [search, status]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatus('all');
  }, []);

  const updatePolicyStatusLocally = useCallback((id: number, nextStatus: Policy['status']) => {
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, status: nextStatus } : p)));
  }, []);

  return {
    policies,
    isLoading: isInitialLoading || isFetching,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    refetch: fetchPolicies,
    clearFilters,
    updatePolicyStatusLocally,
    hasActiveFilters: Boolean(search) || status !== 'all',
  };
}
