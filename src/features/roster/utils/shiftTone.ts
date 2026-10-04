import type { ShiftInfo } from '../types/roster.types';

export type Tone = 'light' | 'mid' | 'dark';

export function toneOf(shift: Pick<ShiftInfo, 'start_min' | 'is_night'> | null | undefined): Tone {
  if (!shift) return 'light';
  if (shift.is_night) return 'dark';
  return shift.start_min >= 12 * 60 ? 'mid' : 'light';
}

export const TONE_CLASS: Record<Tone, string> = {
  light: 'bg-bg-subtle text-fg border border-line',
  mid: 'bg-fg/20 text-fg border border-line-strong',
  dark: 'bg-fg text-fg-inverted border border-fg',
};
