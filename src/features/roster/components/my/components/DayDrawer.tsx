'use client';

import { useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { InfoRow } from '@/components/ui/FormControls';
import type { ScheduleDay, SwapRequest } from '../../../types/roster.types';
import { clockOf, formatDay } from '../../../utils/rosterTime';
import { hoursText, shiftLabel, workedMinutes } from '../../../utils/myRosterUtils';
import { SwapDialog, type SwapMode } from './SwapDialog';

interface Props {
  day: ScheduleDay | null;
  pending: SwapRequest | null;
  canAct: boolean;
  onClose: () => void;
  onSubmit: (body: { type: SwapMode; fromDate: string; fromSeq: number; toEmployeeId?: number; toDate?: string; toSeq?: number; reason?: string }) => Promise<string | null>;
  onCancelRequest: (id: number) => Promise<void>;
}

const TYPE_TEXT: Record<SwapRequest['type'], string> = {
  swap: 'Swap request',
  give_away: 'Give-away request',
  drop_to_open: 'Release request',
};

export function DayDrawer({ day, pending, canAct, onClose, onSubmit, onCancelRequest }: Props) {
  const [mode, setMode] = useState<SwapMode | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const close = () => {
    setMode(null);
    onClose();
  };

  return (
    <>
      <Drawer open={Boolean(day)} onClose={close} title={day ? formatDay(day.work_date, { weekday: 'long', day: 'numeric', month: 'long' }) : ''}>
        {day && (
          <div className="space-y-5">
            <div>
              <p className="text-lg font-bold text-fg">{shiftLabel(day)}</p>
              <p className="text-sm text-fg-muted">{clockOf(day.start_at)} – {clockOf(day.end_at)}</p>
            </div>
            <div className="divide-y divide-line rounded-lg border border-line px-3">
              <InfoRow label="Working time" value={hoursText(workedMinutes(day))} />
              <InfoRow label="Break" value={day.break_minutes ? `${day.break_minutes} min` : 'None'} />
              {day.unit_name && <InfoRow label="Team" value={day.unit_name} />}
            </div>
            {(day.is_overtime || day.earns_comp_off) && (
              <ul className="space-y-1 text-sm text-fg-muted">
                {day.is_overtime ? <li>This is an overtime shift.</li> : null}
                {day.earns_comp_off ? <li>Working this shift earns you a comp off.</li> : null}
              </ul>
            )}

            {pending ? (
              <div className="rounded-lg border border-line-strong bg-bg-subtle p-3">
                <p className="text-sm font-bold text-fg">{TYPE_TEXT[pending.type]} is pending</p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {pending.type === 'drop_to_open' ? 'Waiting for approval.' : pending.to_name ? `With ${pending.to_name}.` : ''} You can cancel it until it is decided.
                </p>
                <Button
                  variant="secondary"
                  className="mt-3 !h-9 !w-auto !px-3 !text-[13px]"
                  loading={cancelling}
                  onClick={async () => {
                    setCancelling(true);
                    await onCancelRequest(pending.id);
                    setCancelling(false);
                  }}
                >
                  Cancel request
                </Button>
              </div>
            ) : canAct ? (
              <div className="space-y-2">
                <Button variant="secondary" className="!h-10 !text-sm" onClick={() => setMode('swap')}>Swap with a colleague</Button>
                <Button variant="secondary" className="!h-10 !text-sm" onClick={() => setMode('give_away')}>Give away to a colleague</Button>
                <Button variant="secondary" className="!h-10 !text-sm" onClick={() => setMode('drop_to_open')}>Release to open shifts</Button>
              </div>
            ) : (
              <p className="text-sm text-fg-muted">This shift has already started or passed, so it can no longer be changed.</p>
            )}
          </div>
        )}
      </Drawer>
      {day && mode && <SwapDialog day={day} mode={mode} onClose={() => setMode(null)} onSubmit={onSubmit} />}
    </>
  );
}
