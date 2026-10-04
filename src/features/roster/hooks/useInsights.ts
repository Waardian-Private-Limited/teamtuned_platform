'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getInsights, listUnits } from '../api/roster.api';
import type { InsightEmployee } from '../types/roster.types';
import { monthRange, todayLocal } from '../utils/rosterTime';
import { useEmployeeRosterQuery } from './useEmployeeRosterQuery';

export type InsightSortKey = 'name' | 'shifts' | 'hours' | 'nights' | 'weekends' | 'holidays' | 'overtime_minutes' | 'off_days' | 'leave_days' | 'comp_off_days';
export type PeriodMode = 'month' | 'custom';

export function useInsights() {
  const today = todayLocal();
  const units = useEmployeeRosterQuery(() => listUnits({ status: 'active' }), 'insight-units');
  const [unitId, setUnitId] = useState<number | null>(null);
  const [mode, setMode] = useState<PeriodMode>('month');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<InsightSortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const unitList = useMemo(() => units.data?.units || [], [units.data]);

  useEffect(() => {
    if (unitId === null && unitList.length > 0) setUnitId(unitList[0].id);
  }, [unitId, unitList]);

  const range = useMemo(() => {
    if (mode === 'month') {
      const [y, m] = month.split('-').map(Number);
      if (!y || !m) return null;
      return monthRange(y, m - 1);
    }
    if (!customFrom || !customTo) return null;
    return { from: customFrom, to: customTo };
  }, [mode, month, customFrom, customTo]);

  const rangeError = range && range.to < range.from ? 'The end date cannot be before the start date' : '';
  const ready = unitId !== null && Boolean(range) && !rangeError;

  const insights = useEmployeeRosterQuery(
    () => getInsights({ unitId: unitId as number, from: range!.from, to: range!.to }),
    `insights:${unitId}:${range?.from}:${range?.to}`,
    ready
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (insights.data?.employees || []).filter((e) => !term || e.name.toLowerCase().includes(term));
    const value = (e: InsightEmployee): number | string => {
      if (sortKey === 'name') return e.name.toLowerCase();
      if (sortKey === 'overtime_minutes') return e.overtime_minutes;
      return e[sortKey];
    };
    return [...list].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const cmp = typeof av === 'string' ? av.localeCompare(String(bv)) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [insights.data, search, sortKey, sortDir]);

  const toggleSort = useCallback((key: InsightSortKey) => {
    setSortKey((current) => {
      if (current === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return current;
      }
      setSortDir(key === 'name' ? 'asc' : 'desc');
      return key;
    });
  }, []);

  const exportCsv = useCallback(() => {
    const head = ['Name', 'Shifts', 'Hours', 'Night shifts', 'Weekend shifts', 'Holiday shifts', 'Overtime hours', 'Days off', 'Leave days', 'Comp-off days'];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [head.map(esc).join(',')];
    for (const e of rows) {
      lines.push([e.name, e.shifts, e.hours, e.nights, e.weekends, e.holidays, Math.round((e.overtime_minutes / 60) * 10) / 10, e.off_days, e.leave_days, e.comp_off_days].map(esc).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster-insights-${range?.from || 'period'}-to-${range?.to || ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, range]);

  return {
    units: unitList,
    unitsLoading: units.loading && !units.data,
    unitsError: units.error,
    unitId, setUnitId, mode, setMode, month, setMonth, customFrom, setCustomFrom, customTo, setCustomTo, rangeError,
    data: insights.data, loading: (insights.loading && !insights.data) || (ready === false && unitList.length > 0 && unitId === null),
    error: insights.error, reload: insights.reload,
    search, setSearch, sortKey, sortDir, toggleSort, rows, exportCsv,
  };
}
