'use client';

import { useCallback, useMemo, useState } from 'react';
import { cellKey, parseCellKey } from '../utils/rosterBoard';

export type SelectMode = 'single' | 'toggle' | 'range';

export function useRosterBoardSelection(employeeIds: number[], dates: string[]) {
  const [selected, setSelected] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const select = useCallback(
    (key: string, mode: SelectMode) => {
      if (mode === 'single') {
        setSelected([key]);
        setAnchor(key);
        setFocus(key);
        return;
      }
      if (mode === 'toggle') {
        setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
        setAnchor(key);
        setFocus(key);
        return;
      }
      const a = anchor ?? key;
      const pa = parseCellKey(a);
      const pb = parseCellKey(key);
      const r1 = employeeIds.indexOf(pa.employeeId);
      const r2 = employeeIds.indexOf(pb.employeeId);
      const c1 = dates.indexOf(pa.date);
      const c2 = dates.indexOf(pb.date);
      if (r1 < 0 || r2 < 0 || c1 < 0 || c2 < 0) {
        setSelected([key]);
        setFocus(key);
        return;
      }
      const out: string[] = [];
      for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
        for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) out.push(cellKey(employeeIds[r], dates[c]));
      }
      setSelected(out);
      setFocus(key);
    },
    [anchor, employeeIds, dates]
  );

  const move = useCallback(
    (dx: number, dy: number, extend: boolean) => {
      const from = focus ?? selected[selected.length - 1] ?? (employeeIds.length && dates.length ? cellKey(employeeIds[0], dates[0]) : null);
      if (!from) return null;
      const p = parseCellKey(from);
      const r = Math.min(employeeIds.length - 1, Math.max(0, employeeIds.indexOf(p.employeeId) + dy));
      const c = Math.min(dates.length - 1, Math.max(0, dates.indexOf(p.date) + dx));
      const key = cellKey(employeeIds[r], dates[c]);
      select(key, extend ? 'range' : 'single');
      return key;
    },
    [focus, selected, employeeIds, dates, select]
  );

  const clear = useCallback(() => {
    setSelected([]);
    setAnchor(null);
    setFocus(null);
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const selectedByEmployee = useMemo(() => {
    const m = new Map<number, string>();
    for (const k of selected) {
      const { employeeId, date } = parseCellKey(k);
      m.set(employeeId, `${m.get(employeeId) ?? '|'}${date}|`);
    }
    return m;
  }, [selected]);

  return { selected, selectedSet, selectedByEmployee, focus, select, move, clear };
}
