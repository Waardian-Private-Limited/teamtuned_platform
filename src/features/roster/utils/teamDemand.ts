import type { DemandInput, UnitDemand } from '../types/roster.types';
import { ALL_DAYS_MASK } from '../constants/roster.constants';
import { maskToDays } from './rosterTime';

export interface DemandDraft {
  key: string;
  kind: 'shift' | 'interval';
  shiftTemplateId: number | null;
  startTime: string;
  endTime: string;
  mask: number;
  specificDate: string;
  roleId: number | null;
  skillId: number | null;
  min: number;
  max: string;
  priority: number;
}

let counter = 0;
export const newKey = () => `d${Date.now().toString(36)}${counter++}`;

export function blankDemand(kind: 'shift' | 'interval'): DemandDraft {
  return {
    key: newKey(), kind, shiftTemplateId: null, startTime: '09:00', endTime: '13:00', mask: ALL_DAYS_MASK,
    specificDate: '', roleId: null, skillId: null, min: 1, max: '', priority: 5,
  };
}

export function toDrafts(rows: UnitDemand[]): DemandDraft[] {
  return rows.map((d) => ({
    key: newKey(),
    kind: d.kind,
    shiftTemplateId: d.shift_template_id,
    startTime: (d.start_time ?? '09:00').slice(0, 5),
    endTime: (d.end_time ?? '13:00').slice(0, 5),
    mask: d.days_mask,
    specificDate: d.specific_date ?? '',
    roleId: d.role_id,
    skillId: d.skill_id,
    min: d.min_headcount,
    max: d.max_headcount === null || d.max_headcount === undefined ? '' : String(d.max_headcount),
    priority: d.priority ?? 5,
  }));
}

export function toInputs(rows: DemandDraft[]): DemandInput[] {
  return rows.map((d) => ({
    kind: d.kind,
    shiftTemplateId: d.kind === 'shift' ? d.shiftTemplateId : null,
    startTime: d.kind === 'interval' ? d.startTime : null,
    endTime: d.kind === 'interval' ? d.endTime : null,
    daysMask: d.specificDate ? ALL_DAYS_MASK : d.mask,
    specificDate: d.specificDate || null,
    roleId: d.roleId,
    skillId: d.skillId,
    minHeadcount: d.min,
    maxHeadcount: d.max === '' ? null : Number(d.max),
    priority: d.priority,
  }));
}

export function validateDrafts(rows: DemandDraft[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of rows) {
    if (d.kind === 'shift' && !d.shiftTemplateId) out[d.key] = 'Pick a shift.';
    else if (d.kind === 'interval' && (!d.startTime || !d.endTime || d.startTime === d.endTime)) out[d.key] = 'Set a start and end time that differ.';
    else if (!d.specificDate && d.mask === 0) out[d.key] = 'Pick at least one weekday or a date.';
    else if (d.max !== '' && Number(d.max) < d.min) out[d.key] = 'Maximum cannot be below the minimum.';
  }
  return out;
}

export function weekdaySummary(rows: DemandDraft[]) {
  const shift = Array(7).fill(0) as number[];
  const peak = Array(7).fill(0) as number[];
  for (const d of rows) {
    if (d.specificDate) continue;
    for (const day of maskToDays(d.mask)) {
      if (d.kind === 'shift') shift[day] += d.min;
      else peak[day] = Math.max(peak[day], d.min);
    }
  }
  return { shift, peak };
}
