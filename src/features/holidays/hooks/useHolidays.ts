'use client';

import { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/holidays.api';
import type { Holiday } from '../types/holidays';
import type { HolidayStatusFilter } from '../constants';

export function useHolidays() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<HolidayStatusFilter>('all');
  const [type, setType] = useState('');
  const [subOrgId, setSubOrgId] = useState<number | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setFetching(true);
    setError('');
    try {
      const res = await api.listHolidays({ year, search, status, type, subOrgId });
      setHolidays(res.holidays);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [year, search, status, type, subOrgId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const clearFilters = () => { setSearchInput(''); setSearch(''); setStatus('all'); setType(''); };

  return {
    year, setYear, searchInput, setSearchInput, status, setStatus, type, setType, subOrgId, setSubOrgId,
    holidays, loading, fetching, error, refetch: fetchAll, clearFilters,
    hasFilters: Boolean(search) || status !== 'all' || Boolean(type),
  };
}
