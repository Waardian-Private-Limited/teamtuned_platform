import type { ShiftOpt } from '../hooks/useTeamsCatalog';
import { TONE_CLASS, toneOf } from './shiftTone';

export type CycleCell = number | 'OFF';

export function shiftMap(shifts: ShiftOpt[]) {
  return new Map(shifts.map((s) => [s.value, s]));
}

export function cellLabel(cell: CycleCell, shifts: Map<number, ShiftOpt>): string {
  if (cell === 'OFF') return 'OFF';
  return shifts.get(cell)?.code ?? '?';
}

export function cellTitle(cell: CycleCell, shifts: Map<number, ShiftOpt>): string {
  if (cell === 'OFF') return 'Day off';
  return shifts.get(cell)?.label ?? 'Shift';
}

export function cellClass(cell: CycleCell, shifts: Map<number, ShiftOpt>): string {
  if (cell === 'OFF') return 'border border-dashed border-line-strong bg-transparent text-fg-muted';
  const s = shifts.get(cell);
  return TONE_CLASS[toneOf(s ? { start_min: s.startMin, is_night: s.isNight } : null)];
}

export function cycleStats(cycle: CycleCell[], shifts: Map<number, ShiftOpt>) {
  const worked = cycle.filter((c) => c !== 'OFF');
  const minutes = worked.reduce<number>((sum, c) => sum + (shifts.get(c as number)?.workingMinutes ?? 0), 0);
  const weeklyHours = cycle.length ? (minutes / cycle.length) * 7 / 60 : 0;
  return { working: worked.length, total: cycle.length, weeklyHours: Math.round(weeklyHours * 10) / 10 };
}

export function rotateCycle(cycle: CycleCell[], by: number): CycleCell[] {
  if (!cycle.length) return cycle;
  const n = cycle.length;
  const k = ((by % n) + n) % n;
  return [...cycle.slice(k), ...cycle.slice(0, k)];
}

export interface RotationStep {
  shiftId: number | null;
  blocks: number;
}

export function buildRotation(workDays: number, offDays: number, steps: RotationStep[]): CycleCell[] {
  const out: CycleCell[] = [];
  for (const step of steps) {
    if (!step.shiftId) continue;
    for (let b = 0; b < step.blocks; b++) {
      for (let i = 0; i < workDays; i++) out.push(step.shiftId);
      for (let i = 0; i < offDays; i++) out.push('OFF');
    }
  }
  return out;
}

export function rotationBlockLength(workDays: number, offDays: number): number {
  return workDays + offDays;
}
