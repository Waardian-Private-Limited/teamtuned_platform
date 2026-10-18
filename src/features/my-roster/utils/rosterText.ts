import { formatClock, formatDate } from '@/lib/datetime';
import { minutesText } from '@/features/detailed-attendance/utils/format';
import type { RosterSlot, RosterState, SlotKind } from '../types/roster.model';

const KIND: Record<SlotKind, string> = {
  shift: 'Shift',
  off: 'Week off',
  leave: 'On leave',
  holiday: 'Holiday',
  comp_off: 'Comp-off',
  unavailable: 'Unavailable',
};

export const STATE_LABEL: Record<RosterState, string> = { current: 'Current', upcoming: 'Upcoming', past: 'Past' };

/** The slot in a few words: the shift's name, or what the day is. */
export const slotTitle = (s: RosterSlot) => (s.kind === 'shift' ? s.name || s.code || KIND.shift : KIND[s.kind]);

/** "6:00 AM – 3:00 PM", with "(next day)" when the shift ends after midnight. */
export const slotTimes = (s: RosterSlot) => (s.start && s.end ? `${formatClock(s.start)} – ${formatClock(s.end)}${s.endsNextDay ? ' (next day)' : ''}` : '');

/** What fits in a calendar cell: the shift code (or start time), or "Off". */
export const slotShort = (s: RosterSlot) => (s.kind === 'shift' ? s.code || formatClock(s.start) : s.kind === 'off' ? 'Off' : null);

/** "1 – 30 Nov 2026" / "28 Nov – 4 Dec 2026". */
export function periodText(from: string, to: string) {
  if (from.slice(0, 7) === to.slice(0, 7)) return `${Number(from.slice(8))} – ${formatDate(to, 'medium')}`;
  return `${formatDate(from, from.slice(0, 4) === to.slice(0, 4) ? 'short' : 'medium')} – ${formatDate(to, 'medium')}`;
}

export const plannedText = (minutes: number) => (minutes > 0 ? minutesText(minutes) : '—');
