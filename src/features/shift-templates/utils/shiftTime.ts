import type { ShiftTemplateFormInput } from '../types/shiftTemplates.model';
import { MAX_SHIFT_MINUTES, type ShiftFieldName } from '../constants/shiftTemplates.constants';

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** 'HH:MM[:SS]' -> '9:00 am' */
export function formatClock(time: string): string {
  const total = minutesOf(time);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** Same rule as the backend: end at or before start runs past midnight. */
export function spanMinutes(start: string, end: string): number {
  const diff = minutesOf(end) - minutesOf(start);
  return diff > 0 ? diff : diff + 1440;
}

/**
 * Client copy of ShiftTemplatePolicy.assertName/assertTiming so the user sees
 * the problem on the field before a round trip; the server stays the
 * authority.
 */
export function validateShiftInput(input: ShiftTemplateFormInput): { field: ShiftFieldName; message: string } | null {
  const name = input.name.trim();
  if (!name) return { field: 'name', message: 'Shift name is required' };
  if (name.length > 100) return { field: 'name', message: 'Shift name is too long' };
  if (!input.startTime) return { field: 'start_time', message: 'Enter a start time' };
  const long = input.durationMinutes !== null;
  if (long) {
    const d = input.durationMinutes as number;
    if (!Number.isInteger(d) || d < 1 || d > MAX_SHIFT_MINUTES) {
      return { field: 'duration_minutes', message: `Length must be up to ${MAX_SHIFT_MINUTES / 60} hours` };
    }
  } else {
    if (!input.endTime) return { field: 'end_time', message: 'Enter an end time' };
    if (input.startTime.slice(0, 5) === input.endTime.slice(0, 5)) {
      return { field: 'end_time', message: 'Shift end must differ from shift start' };
    }
  }
  if (!Number.isInteger(input.breakMinutes) || input.breakMinutes < 0) {
    return { field: 'break_minutes', message: 'Break must be whole minutes, 0 or more' };
  }
  if (input.breakMinutes >= (long ? (input.durationMinutes as number) : spanMinutes(input.startTime, input.endTime))) {
    return { field: 'break_minutes', message: 'Break must be shorter than the shift' };
  }
  return null;
}
