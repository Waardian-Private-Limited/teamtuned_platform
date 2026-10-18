import { cx } from '@/theme/tokens';
import type { RosterSlot } from '../types/roster.model';
import { slotShort, slotTimes, slotTitle } from '../utils/rosterText';

/** The day's shift for chips: the first shift, else the first slot. */
const mainSlot = (slots: RosterSlot[]) => slots.find((s) => s.kind === 'shift') || slots[0];

/** A day's roster in a small square chip: filled for a shift (its code or start time), outlined for a day off. */
export function RosterCodeChip({ slots, className }: { slots: RosterSlot[]; className?: string }) {
  const s = mainSlot(slots);
  const label = s ? slotShort(s) : null;
  if (!s || !label) return null;
  const shift = s.kind === 'shift';
  return (
    <span title={[slotTitle(s), slotTimes(s)].filter(Boolean).join(' · ')}
      className={cx('inline-flex shrink-0 items-center rounded-[3px] border px-1 text-[10px] font-extrabold leading-4 tracking-wide',
        shift ? 'border-fg bg-fg text-surface' : 'border-line bg-transparent text-fg-muted', className)}>
      {label}
    </span>
  );
}

/** "Rostered [M] Morning · 6:00 AM – 3:00 PM": the published plan, shown next to what happened. */
export function RosteredLine({ slots }: { slots: RosterSlot[] }) {
  const s = mainSlot(slots);
  if (!s) return null;
  return (
    <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-fg-muted">
      <span className="font-semibold">Rostered</span>
      <RosterCodeChip slots={slots} />
      <span className="truncate font-bold tabular-nums text-fg">{[slotTitle(s), s.kind === 'shift' ? slotTimes(s) : null].filter(Boolean).join(' · ')}</span>
    </span>
  );
}
