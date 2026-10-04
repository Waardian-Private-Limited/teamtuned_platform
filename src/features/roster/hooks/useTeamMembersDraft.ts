'use client';

import { useCallback, useState } from 'react';
import type { MemberInput, Pattern, UnitMember } from '../types/roster.types';

export type ScheduleKind = 'demand' | 'pattern' | 'fixed';

export interface MemberRow {
  employeeId: number;
  name: string;
  code: string | null;
  mode: 'include' | 'exclude';
  patternId: number | null;
  offset: number;
  fixedTemplateId: number | null;
}

export function kindOf(r: MemberRow): ScheduleKind {
  return r.patternId ? 'pattern' : r.fixedTemplateId ? 'fixed' : 'demand';
}

const fromUnit = (m: UnitMember): MemberRow => ({
  employeeId: m.employee_id,
  name: m.name,
  code: m.employee_code,
  mode: m.mode,
  patternId: m.pattern_id,
  offset: m.pattern_offset ?? 0,
  fixedTemplateId: m.fixed_template_id,
});

export function useTeamMembersDraft(initial: UnitMember[], patterns: Pattern[]) {
  const [rows, setRows] = useState<MemberRow[]>(() => initial.map(fromUnit));

  const patch = useCallback((ids: number[], change: Partial<MemberRow>) => {
    setRows((prev) => prev.map((r) => (ids.includes(r.employeeId) ? { ...r, ...change } : r)));
  }, []);

  const add = useCallback((people: { id: number; name: string; code: string | null }[], mode: 'include' | 'exclude') => {
    setRows((prev) => {
      const byId = new Map(prev.map((r) => [r.employeeId, r]));
      for (const p of people) {
        const existing = byId.get(p.id);
        if (existing && existing.mode === mode) continue;
        byId.set(p.id, { employeeId: p.id, name: p.name, code: p.code, mode, patternId: null, offset: 0, fixedTemplateId: null });
      }
      return [...byId.values()];
    });
  }, []);

  const remove = useCallback((id: number) => setRows((prev) => prev.filter((r) => r.employeeId !== id)), []);

  const setSchedule = useCallback((ids: number[], kind: ScheduleKind, refId: number | null) => {
    if (kind === 'demand') patch(ids, { patternId: null, fixedTemplateId: null, offset: 0 });
    else if (kind === 'pattern') patch(ids, { patternId: refId, fixedTemplateId: null });
    else patch(ids, { fixedTemplateId: refId, patternId: null, offset: 0 });
  }, [patch]);

  const stagger = useCallback((ids: number[]) => {
    setRows((prev) => {
      const targets = prev.filter((r) => ids.includes(r.employeeId) && r.patternId);
      const groups = new Map<number, MemberRow[]>();
      for (const r of targets) groups.set(r.patternId as number, [...(groups.get(r.patternId as number) ?? []), r]);
      const next = new Map<number, number>();
      groups.forEach((members, patternId) => {
        const len = patterns.find((p) => p.id === patternId)?.cycle_days ?? members.length;
        members.forEach((m, i) => next.set(m.employeeId, Math.floor((i * len) / members.length)));
      });
      return prev.map((r) => (next.has(r.employeeId) ? { ...r, offset: next.get(r.employeeId) as number } : r));
    });
  }, [patterns]);

  const toInput = useCallback((): MemberInput[] => rows.map((r) => ({
    employeeId: r.employeeId,
    mode: r.mode,
    patternId: r.mode === 'include' ? r.patternId : null,
    patternOffset: r.mode === 'include' && r.patternId ? r.offset : 0,
    fixedTemplateId: r.mode === 'include' ? r.fixedTemplateId : null,
  })), [rows]);

  return { rows, add, remove, setSchedule, patch, stagger, toInput };
}
