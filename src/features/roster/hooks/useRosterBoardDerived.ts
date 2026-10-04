'use client';

import { useMemo } from 'react';
import type { RosterBoard, ShiftInfo, Violation } from '../types/roster.types';
import { buildCellMap, buildDates, coverageCounts, groupByEmployee, indexViolations, staffedPerDay } from '../utils/rosterBoard';

export function useRosterBoardDerived(board: RosterBoard | null, violations: Violation[]) {
  const dates = useMemo(() => (board ? buildDates(board.roster.period_start, board.roster.period_end) : []), [board?.roster.period_start, board?.roster.period_end]);
  const templateMap = useMemo(() => new Map<number, ShiftInfo>((board?.templates ?? []).map((t) => [t.id, t])), [board?.templates]);
  const employeeIds = useMemo(() => (board?.employees ?? []).map((e) => e.id), [board?.employees]);
  const employeesById = useMemo(() => new Map((board?.employees ?? []).map((e) => [e.id, e])), [board?.employees]);
  const assignments = board?.assignments;
  const cellMap = useMemo(() => buildCellMap(assignments ?? []), [assignments]);
  const byEmployee = useMemo(() => groupByEmployee(assignments ?? [], employeeIds), [assignments, employeeIds]);
  const staffed = useMemo(() => staffedPerDay(assignments ?? []), [assignments]);
  const coverage = useMemo(() => coverageCounts(assignments ?? []), [assignments]);
  const violationIndex = useMemo(() => indexViolations(violations), [violations]);
  const usedTemplates = useMemo(() => {
    const ids = new Set<number>();
    for (const a of assignments ?? []) if (a.shift_template_id) ids.add(a.shift_template_id);
    for (const v of violations) if (v.templateId) ids.add(v.templateId);
    return (board?.templates ?? []).filter((t) => t.status === 'active' || ids.has(t.id));
  }, [assignments, violations, board?.templates]);
  const activeTemplates = useMemo(() => (board?.templates ?? []).filter((t) => t.status === 'active'), [board?.templates]);

  return { dates, templateMap, employeeIds, employeesById, cellMap, byEmployee, staffed, coverage, violationIndex, usedTemplates, activeTemplates };
}
