'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../api/otherLocations.api';
import { toOtherLocationList } from '../types/otherLocations.mapper';
import type { OtherLocation, OtherLocationType } from '../types/otherLocations.model';
import { messageOf } from '@/lib/api/errors';
import { SEARCH_DEBOUNCE_MS, type OtherLocationStatusFilter } from '../constants/otherLocations.constants';

// The list endpoint returns the whole org collection (cached server-side), so
// search / type / status filtering happens client-side over that set.
export function useOtherLocationList() {
  const [all, setAll] = useState<OtherLocation[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OtherLocationStatusFilter>('all');
  const [type, setType] = useState<OtherLocationType | 'all'>('all');

  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const fetchLocations = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!hasLoadedRef.current) setIsInitialLoading(true);
    setIsFetching(true);
    setError('');
    try {
      const dto = await api.listOtherLocations();
      setAll(toOtherLocationList(dto));
      hasLoadedRef.current = true;
    } catch (err) {
      setError(messageOf(err));
    } finally {
      inFlightRef.current = false;
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const locations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((loc) => {
      const matchesSearch =
        !term ||
        loc.name.toLowerCase().includes(term) ||
        (loc.address ?? '').toLowerCase().includes(term);
      const matchesStatus = status === 'all' || loc.status === status;
      const matchesType = type === 'all' || loc.type === type;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [all, search, status, type]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatus('all');
    setType('all');
  }, []);

  const updateStatusLocally = useCallback((id: number, next: 'active' | 'inactive') => {
    setAll((prev) => prev.map((loc) => (loc.id === id ? { ...loc, status: next } : loc)));
  }, []);

  return {
    all,
    locations,
    total: all.length,
    filteredTotal: locations.length,
    isLoading: isInitialLoading || isFetching,
    isInitialLoading,
    isFetching,
    error,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    type,
    setType,
    refetch: fetchLocations,
    clearFilters,
    updateStatusLocally,
    hasActiveFilters: Boolean(search) || status !== 'all' || type !== 'all',
  };
}
