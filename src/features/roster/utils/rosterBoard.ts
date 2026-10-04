import type { Assignment, CellChange, CellKind, RosterBoard, ShiftInfo, Violation } from '../types/roster.types';
import { eachDay, weekdayIndex } from './rosterTime';

export const cellKey = (employeeId: number, date: string) => `${employeeId}:${date}`;

export function parseCellKey(key: string): { employeeId: number; date: string } {
  const i = key.indexOf(':');
  return { employeeId: Number(key.slice(0, i)), date: key.slice(i + 1) };
}

export function buildCellMap(assignments: Assignment[]): Map<string, Assignment[]> {
  const map = new Map<string, Assignment[]>();
  for (const a of assignments) {
    const k = cellKey(a.employee_id, a.work_date);
    const list = map.get(k);
    if (list) list.push(a);
    else map.set(k, [a]);
  }
  for (const list of map.values()) if (list.length > 1) list.sort((x, y) => x.seq - y.seq);
  return map;
}

export function groupByEmployee(assignments: Assignment[], employeeIds: number[]): Map<number, Assignment[]> {
  const map = new Map<number, Assignment[]>();
  for (const id of employeeIds) map.set(id, []);
  for (const a of assignments) {
    const list = map.get(a.employee_id);
    if (list) list.push(a);
    else map.set(a.employee_id, [a]);
  }
  return map;
}

export function rowCellMap(list: Assignment[]): Map<string, Assignment[]> {
  const map = new Map<string, Assignment[]>();
  for (const a of list) {
    const l = map.get(a.work_date);
    if (l) l.push(a);
    else map.set(a.work_date, [a]);
  }
  for (const l of map.values()) if (l.length > 1) l.sort((x, y) => x.seq - y.seq);
  return map;
}

export function sameRefs<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export interface ViolationIndex {
  errorCellsByEmployee: Map<number, string>;
  firstDateByEmployee: Map<number, string>;
  understaffed: Map<string, Violation>;
  errorCount: number;
  warningCount: number;
}

export function indexViolations(violations: Violation[]): ViolationIndex {
  const dates = new Map<number, string[]>();
  const first = new Map<number, string>();
  const understaffed = new Map<string, Violation>();
  let errorCount = 0;
  let warningCount = 0;
  for (const v of violations) {
    if (v.severity === 'error') errorCount++;
    else if (v.severity === 'warning') warningCount++;
    if (v.code === 'understaffed' && v.templateId) {
      const k = `${v.templateId}:${v.date}`;
      const prev = understaffed.get(k);
      understaffed.set(k, prev ? { ...prev, slots: (prev.slots || 0) + (v.slots || 1) } : v);
    }
    if (v.employeeId !== undefined && v.severity === 'error') {
      const l = dates.get(v.employeeId);
      if (l) l.push(v.date);
      else dates.set(v.employeeId, [v.date]);
    }
    if (v.employeeId !== undefined && !first.has(v.employeeId)) first.set(v.employeeId, v.date);
  }
  const errorCellsByEmployee = new Map<number, string>();
  for (const [id, l] of dates) errorCellsByEmployee.set(id, `|${[...new Set(l)].join('|')}|`);
  return { errorCellsByEmployee, firstDateByEmployee: first, understaffed, errorCount, warningCount };
}

export function buildDates(start: string, end: string): string[] {
  return eachDay(start, end);
}

export function isWeekend(date: string): boolean {
  return weekdayIndex(date) >= 5;
}

export function shiftMinutes(t: ShiftInfo | undefined): number {
  if (!t) return 0;
  return Math.max(0, t.duration_min - (t.break_min || 0));
}

export function staffedPerDay(assignments: Assignment[]): Map<string, number> {
  const seen = new Map<string, Set<number>>();
  for (const a of assignments) {
    if (a.kind !== 'shift') continue;
    const s = seen.get(a.work_date);
    if (s) s.add(a.employee_id);
    else seen.set(a.work_date, new Set([a.employee_id]));
  }
  const out = new Map<string, number>();
  for (const [d, s] of seen) out.set(d, s.size);
  return out;
}

export function coverageCounts(assignments: Assignment[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of assignments) {
    if (a.kind !== 'shift' || !a.shift_template_id) continue;
    const k = `${a.shift_template_id}:${a.work_date}`;
    out.set(k, (out.get(k) || 0) + 1);
  }
  return out;
}

export function hoursPerWeek(list: Assignment[], templates: Map<number, ShiftInfo>, dayCount: number): number {
  let minutes = 0;
  for (const a of list) {
    if (a.kind === 'shift' && a.shift_template_id) minutes += shiftMinutes(templates.get(a.shift_template_id));
  }
  const weeks = Math.max(1, dayCount / 7);
  return Math.round((minutes / 60 / weeks) * 10) / 10;
}

export function applyChanges(assignments: Assignment[], changes: CellChange[], templates: Map<number, ShiftInfo>, nextId: () => number): Assignment[] {
  const touched = new Set<string>();
  const removals = new Set<string>();
  const upserts = new Map<string, Assignment>();
  const existing = new Map<string, Assignment>();
  for (const a of assignments) existing.set(`${a.employee_id}:${a.work_date}:${a.seq}`, a);
  for (const c of changes) {
    const seq = c.seq || 1;
    const key = `${c.employeeId}:${c.date}:${seq}`;
    touched.add(key);
    if (c.clear) {
      removals.add(key);
      upserts.delete(key);
      continue;
    }
    removals.delete(key);
    const kind: CellKind = c.kind || (c.templateId ? 'shift' : 'off');
    if (kind !== 'shift') {
      const k2 = `${c.employeeId}:${c.date}:2`;
      removals.add(k2);
      touched.add(k2);
    }
    const prev = existing.get(key);
    const tpl = kind === 'shift' && c.templateId ? templates.get(c.templateId) : undefined;
    upserts.set(key, {
      id: prev?.id ?? nextId(),
      employee_id: c.employeeId,
      work_date: c.date,
      seq,
      kind,
      shift_template_id: kind === 'shift' ? c.templateId ?? null : null,
      start_at: null,
      end_at: null,
      break_minutes: tpl?.break_min ?? 0,
      source: 'manual',
      locked: c.locked !== false,
      is_overtime: kind === 'shift' ? !!c.isOvertime : false,
      planned_ot_minutes: c.plannedOtMinutes || 0,
      earns_comp_off: false,
      leave_application_id: null,
      explain: null,
    });
  }
  const out: Assignment[] = [];
  for (const a of assignments) {
    const key = `${a.employee_id}:${a.work_date}:${a.seq}`;
    if (!touched.has(key)) out.push(a);
    else if (upserts.has(key) && !removals.has(key)) out.push(upserts.get(key)!);
  }
  for (const [key, a] of upserts) if (!existing.has(key) && !removals.has(key)) out.push(a);
  return out;
}

export function activeTemplates(board: RosterBoard | null): ShiftInfo[] {
  if (!board) return [];
  return board.templates.filter((t) => t.status === 'active');
}

export function describeCell(a: { kind: CellKind; templateId: number | null } | null | undefined, templates: Map<number, ShiftInfo>, kindLabels: Record<string, string>): string {
  if (!a) return 'Empty';
  if (a.kind === 'shift') return templates.get(a.templateId || 0)?.name || 'Shift';
  return kindLabels[a.kind] || a.kind;
}
