'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deleteUnit, listUnits, updateUnit } from '../api/roster.api';
import type { RosterUnit } from '../types/roster.types';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';

export type TeamStatusFilter = 'all' | 'active' | 'inactive';

export function useTeamsList() {
  const [units, setUnits] = useState<RosterUnit[]>([]);
  const [allUnits, setAllUnits] = useState<RosterUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TeamStatusFilter>('all');
  const [subOrgId, setSubOrgId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const seq = useRef(0);

  const refetch = useCallback(async () => {
    const mine = ++seq.current;
    setFetching(true);
    setError('');
    try {
      const isFiltered = status !== 'all' || search !== '';
      const [res, full] = await Promise.all([
        listUnits({
          status: status === 'all' ? undefined : status,
          search: search || undefined,
          subOrgId: subOrgId ?? undefined,
        }),
        isFiltered ? listUnits({ subOrgId: subOrgId ?? undefined }) : Promise.resolve(null),
      ]);
      if (mine === seq.current) {
        setUnits(res.units);
        setAllUnits((full ?? res).units);
      }
    } catch (err) {
      if (mine === seq.current) setError(messageOf(err));
    } finally {
      if (mine === seq.current) {
        setLoading(false);
        setFetching(false);
      }
    }
  }, [status, search, subOrgId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const toggleStatus = useCallback(async (unit: RosterUnit) => {
    setBusyId(unit.id);
    try {
      await updateUnit(unit.id, { status: unit.status === 'active' ? 'inactive' : 'active' });
      showSuccess(unit.status === 'active' ? 'Team deactivated' : 'Team activated');
      await refetch();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusyId(null);
    }
  }, [refetch]);

  const remove = useCallback(async (unit: RosterUnit) => {
    setBusyId(unit.id);
    setDeleteError('');
    try {
      await deleteUnit(unit.id);
      showSuccess('Team deleted');
      await refetch();
      return true;
    } catch (err) {
      setDeleteError(messageOf(err));
      return false;
    } finally {
      setBusyId(null);
    }
  }, [refetch]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setStatus('all');
    setSubOrgId(null);
  }, []);

  const filtered = search !== '' || status !== 'all' || subOrgId !== null;
  const nameById = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);

  return {
    units, allUnits, loading, fetching, error, searchInput, setSearchInput, status, setStatus, subOrgId, setSubOrgId,
    refetch, toggleStatus, remove, busyId, deleteError, clearDeleteError: () => setDeleteError(''), clearFilters, filtered, nameById,
  };
}
