'use client';

import { Dialog } from '@/components/ui/Dialog';
import { longDayText } from '@/features/detailed-attendance/utils/format';
import type { RosterSlot } from '../types/roster.model';
import { RosterSlotCard } from './RosterSlotCard';

/** What the roster puts on one date (a day ahead in the calendar). Closed while `date` is null. */
export function RosterDayDialog({ date, slots, onClose }: { date: string | null; slots: RosterSlot[]; onClose: () => void }) {
  const team = slots.find((s) => s.team)?.team;
  return (
    <Dialog open={!!date} onClose={onClose} title={date ? longDayText(date) : ''} maxWidthClassName="max-w-md">
      <div className="space-y-2">
        {team && <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Roster · {team}</p>}
        {slots.map((s) => <RosterSlotCard key={`${s.date}-${s.seq}`} slot={s} showTeam={false} />)}
      </div>
    </Dialog>
  );
}
