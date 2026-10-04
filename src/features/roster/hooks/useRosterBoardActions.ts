'use client';

import { useCallback } from 'react';
import { showError } from '@/lib/toast';
import type { Assignment, Candidate, CellChange, CellKind, ShiftInfo } from '../types/roster.types';
import { cellKey, parseCellKey } from '../utils/rosterBoard';

interface Args {
  cellMap: Map<string, Assignment[]>;
  activeTemplates: ShiftInfo[];
  selected: string[];
  applyEdit: (changes: CellChange[]) => Promise<boolean>;
  editable: boolean;
}

function shiftChange(employeeId: number, date: string, templateId: number, isOvertime = false): CellChange {
  return { employeeId, date, kind: 'shift', templateId, locked: true, isOvertime };
}

function offChange(employeeId: number, date: string, kind: CellKind = 'off'): CellChange {
  return { employeeId, date, kind, locked: true };
}

export function useRosterBoardActions({ cellMap, activeTemplates, selected, applyEdit, editable }: Args) {
  const primary = useCallback((key: string) => cellMap.get(key)?.find((a) => a.seq === 1) ?? cellMap.get(key)?.[0], [cellMap]);

  const setShiftFor = useCallback(
    (keys: string[], templateId: number) => {
      if (!editable) return Promise.resolve(false);
      const changes = keys.map((k) => {
        const { employeeId, date } = parseCellKey(k);
        const cur = primary(k);
        return shiftChange(employeeId, date, templateId, cur?.kind === 'shift' ? cur.is_overtime : false);
      });
      return applyEdit(changes);
    },
    [editable, primary, applyEdit]
  );

  const setKindFor = useCallback(
    (keys: string[], kind: CellKind) => {
      if (!editable) return Promise.resolve(false);
      return applyEdit(keys.map((k) => {
        const { employeeId, date } = parseCellKey(k);
        return offChange(employeeId, date, kind);
      }));
    },
    [editable, applyEdit]
  );

  const toggleLock = useCallback(
    (keys: string[]) => {
      if (!editable) return Promise.resolve(false);
      const rows = keys.map((k) => ({ k, a: primary(k) })).filter((r): r is { k: string; a: Assignment } => Boolean(r.a));
      if (!rows.length) return Promise.resolve(false);
      const next = !rows.every((r) => r.a.locked);
      return applyEdit(rows.map(({ k, a }) => {
        const { employeeId, date } = parseCellKey(k);
        return { employeeId, date, seq: a.seq, kind: a.kind, templateId: a.shift_template_id, locked: next, isOvertime: a.is_overtime };
      }));
    },
    [editable, primary, applyEdit]
  );

  const toggleOvertime = useCallback(
    (keys: string[]) => {
      if (!editable) return Promise.resolve(false);
      const rows = keys.map((k) => ({ k, a: primary(k) })).filter((r): r is { k: string; a: Assignment } => Boolean(r.a && r.a.kind === 'shift'));
      if (!rows.length) return Promise.resolve(false);
      const next = !rows.every((r) => r.a.is_overtime);
      return applyEdit(rows.map(({ k, a }) => {
        const { employeeId, date } = parseCellKey(k);
        return { employeeId, date, seq: a.seq, kind: 'shift' as const, templateId: a.shift_template_id, locked: true, isOvertime: next };
      }));
    },
    [editable, primary, applyEdit]
  );

  const clearCells = useCallback(
    (keys: string[]) => {
      if (!editable) return Promise.resolve(false);
      const changes: CellChange[] = [];
      for (const k of keys) {
        const { employeeId, date } = parseCellKey(k);
        for (const a of cellMap.get(k) ?? []) changes.push({ employeeId, date, seq: a.seq, clear: true });
      }
      return applyEdit(changes);
    },
    [editable, cellMap, applyEdit]
  );

  const moveOrSwap = useCallback(
    (fromKey: string, toKey: string) => {
      if (!editable || fromKey === toKey) return Promise.resolve(false);
      const src = primary(fromKey);
      if (!src || src.kind !== 'shift' || !src.shift_template_id) return Promise.resolve(false);
      const dst = primary(toKey);
      const from = parseCellKey(fromKey);
      const to = parseCellKey(toKey);
      if (dst && (dst.kind === 'leave' || dst.kind === 'holiday' || dst.kind === 'unavailable')) {
        showError(`That day is marked ${dst.kind === 'leave' ? 'as leave' : dst.kind === 'holiday' ? 'as a holiday' : 'as unavailable'}. Change it first to place a shift there.`);
        return Promise.resolve(false);
      }
      if (dst && dst.kind === 'shift' && dst.shift_template_id) {
        return applyEdit([
          shiftChange(from.employeeId, from.date, dst.shift_template_id, dst.is_overtime),
          shiftChange(to.employeeId, to.date, src.shift_template_id, src.is_overtime),
        ]);
      }
      return applyEdit([shiftChange(to.employeeId, to.date, src.shift_template_id, src.is_overtime), offChange(from.employeeId, from.date)]);
    },
    [editable, primary, applyEdit]
  );

  const replaceWith = useCallback(
    (key: string, candidate: Candidate) => {
      const src = primary(key);
      if (!editable || !src || src.kind !== 'shift' || !src.shift_template_id) return Promise.resolve(false);
      const { employeeId, date } = parseCellKey(key);
      return applyEdit([shiftChange(candidate.employeeId, date, src.shift_template_id, candidate.overtime), offChange(employeeId, date)]);
    },
    [editable, primary, applyEdit]
  );

  const assignNth = useCallback(
    (n: number) => {
      const t = activeTemplates[n - 1];
      if (!t || !selected.length) return Promise.resolve(false);
      return setShiftFor(selected, t.id);
    },
    [activeTemplates, selected, setShiftFor]
  );

  return { primary, setShiftFor, setKindFor, toggleLock, toggleOvertime, clearCells, moveOrSwap, replaceWith, assignNth, keyOf: cellKey };
}
