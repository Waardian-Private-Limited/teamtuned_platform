'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/roster.api';
import type { RosterRow, RosterStatus, RosterUnit } from '../types/roster.types';
import { monthRange } from '../utils/rosterTime';

export type RosterStatusFilter = 'all' | RosterStatus;

function monthBounds(value: string): { from: string; to: string } | null {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const [y, m] = value.split('-').map(Number);
  return monthRange(y, m - 1);
}

export function useRosters() {
  const [rosters, setRosters] = useState<RosterRow[]>([]);
  const [units, setUnits] = useState<RosterUnit[]>([]);
  const [unitsLoaded, setUnitsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const [unitId, setUnitId] = useState<number | null>(null);
  const [status, setStatus] = useState<RosterStatusFilter>('all');
  const [subOrgId, setSubOrgIdState] = useState<number | null>(null);
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const seq = useRef(0);

  const loadUnits = useCallback(async () => {
    try {
      const res = await api.listUnits({ status: 'active' });
      setUnits(res.units);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setUnitsLoaded(true);
    }
  }, []);

  const fetchRosters = useCallback(async () => {
    const mine = ++seq.current;
    setFetching(true);
    setError('');
    try {
      const from = monthBounds(fromMonth)?.from;
      const to = monthBounds(toMonth)?.to;
      const res = await api.listRosters({ unitId, status: status === 'all' ? undefined : status, from, to });
      if (mine === seq.current) setRosters(res.rosters);
    } catch (err) {
      if (mine === seq.current) setError(messageOf(err));
    } finally {
      if (mine === seq.current) {
        setLoading(false);
        setFetching(false);
      }
    }
  }, [unitId, status, fromMonth, toMonth]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  useEffect(() => {
    fetchRosters();
  }, [fetchRosters]);

  const visibleUnits = useMemo(
    () => (subOrgId === null ? units : units.filter((u) => u.sub_organization_id === subOrgId)),
    [units, subOrgId]
  );

  const visibleRosters = useMemo(
    () => (subOrgId === null ? rosters : rosters.filter((r) => r.sub_organization_id === subOrgId)),
    [rosters, subOrgId]
  );

  const setSubOrgId = useCallback((next: number | null) => {
    setSubOrgIdState(next);
    setUnitId(null);
  }, []);

  const hasFilters = unitId !== null || status !== 'all' || subOrgId !== null || Boolean(fromMonth) || Boolean(toMonth);

  const clearFilters = useCallback(() => {
    setUnitId(null);
    setStatus('all');
    setSubOrgIdState(null);
    setFromMonth('');
    setToMonth('');
  }, []);

  return {
    rosters: visibleRosters,
    units,
    visibleUnits,
    unitsLoaded,
    loading,
    fetching,
    error,
    unitId,
    setUnitId,
    status,
    setStatus,
    subOrgId,
    setSubOrgId,
    fromMonth,
    setFromMonth,
    toMonth,
    setToMonth,
    hasFilters,
    clearFilters,
    refetch: fetchRosters,
  };
}
