import { Clock, Coffee } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { minutesText } from '@/features/detailed-attendance/utils/format';
import type { RosterSlot } from '../types/roster.model';
import { slotTimes, slotTitle } from '../utils/rosterText';

/** One slot of a day: a shift with its code, times, break and planned hours, or what the day is. */
export function RosterSlotCard({ slot, showTeam = true }: { slot: RosterSlot; showTeam?: boolean }) {
  const shift = slot.kind === 'shift';
  const facts = [
    shift && slot.breakMinutes > 0 ? `Break ${minutesText(slot.breakMinutes)}` : null,
    shift && slot.plannedMinutes > 0 ? `${minutesText(slot.plannedMinutes)} planned` : null,
    showTeam ? slot.team : null,
  ].filter(Boolean);
  const notes = [
    slot.overtime ? (slot.plannedOtMinutes > 0 ? `Overtime ${minutesText(slot.plannedOtMinutes)}` : 'Overtime shift') : null,
    slot.earnsCompOff ? 'Earns a comp-off' : null,
  ].filter(Boolean);
  return (
    <div className="flex items-start gap-3 rounded border border-line bg-bg-subtle/40 p-3">
      <span aria-hidden className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded border text-sm font-extrabold',
        shift ? 'border-fg bg-fg text-surface' : 'border-line bg-surface text-fg-muted')}>
        {shift && slot.code ? slot.code : shift ? <Clock className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-fg">{slotTitle(slot)}</p>
        {shift && slot.start && <p className="text-base font-extrabold tabular-nums text-fg">{slotTimes(slot)}</p>}
        {facts.length > 0 && <p className="text-xs text-fg-muted">{facts.join(' · ')}</p>}
        {notes.map((n) => <p key={n} className="text-xs font-bold text-fg">{n}</p>)}
      </div>
    </div>
  );
}
