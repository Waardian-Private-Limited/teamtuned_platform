import type { ScheduleDay } from '../types/roster.types';
import { addDays, daysBetween, formatDay, todayLocal } from './rosterTime';

export function minutesOfDay(dateTime: string): number {
  const [h, m] = dateTime.slice(11, 16).split(':').map(Number);
  return h * 60 + m;
}

export function wallMinutes(dateTime: string): number {
  return daysBetween('1970-01-01', dateTime.slice(0, 10)) * 1440 + minutesOfDay(dateTime);
}

export function workedMinutes(day: Pick<ScheduleDay, 'start_at' | 'end_at' | 'break_minutes'>): number {
  if (!day.start_at || !day.end_at) return 0;
  return Math.max(0, wallMinutes(day.end_at) - wallMinutes(day.start_at) - (day.break_minutes || 0));
}

export function nowWall(): number {
  const n = new Date();
  return wallMinutes(`${todayLocal()} ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}:00`);
}

export function groupByDate(days: ScheduleDay[]): Map<string, ScheduleDay[]> {
  const map = new Map<string, ScheduleDay[]>();
  for (const d of days) {
    const list = map.get(d.work_date) || [];
    list.push(d);
    map.set(d.work_date, list);
  }
  return map;
}

export function relativeDay(date: string): string {
  const today = todayLocal();
  if (date === today) return 'today';
  if (date === addDays(today, 1)) return 'tomorrow';
  return formatDay(date, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function shiftLabel(day: Pick<ScheduleDay, 'shift_name' | 'short_code'>): string {
  return day.shift_name || day.short_code || 'Shift';
}

export function kindText(kind: ScheduleDay['kind']): string {
  switch (kind) {
    case 'off': return 'OFF';
    case 'leave': return 'LEAVE';
    case 'holiday': return 'HOLIDAY';
    case 'comp_off': return 'COMP OFF';
    case 'unavailable': return 'UNAVAILABLE';
    default: return 'SHIFT';
  }
}

export function hoursText(minutes: number): string {
  const h = Math.round((minutes / 60) * 10) / 10;
  return `${h}h`;
}

export function toneFor(day: ScheduleDay): 'light' | 'mid' | 'dark' {
  if (day.kind !== 'shift' || !day.start_at) return 'light';
  const start = minutesOfDay(day.start_at);
  if (start >= 20 * 60 || start < 5 * 60) return 'dark';
  return start >= 12 * 60 ? 'mid' : 'light';
}
