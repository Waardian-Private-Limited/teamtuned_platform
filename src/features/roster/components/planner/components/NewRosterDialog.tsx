'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { FieldLabel, FieldMessage, SelectField, shellClass } from '@/components/ui/FormControls';
import type { RosterUnit } from '../../../types/roster.types';
import type { RosterFieldError } from '../../../hooks/useRostersMutations';
import { addDays, daysBetween, fmtDate, monthRange, todayLocal } from '../../../utils/rosterTime';
import { MAX_ROSTER_DAYS } from '../../../utils/rosterStatus';

interface Props {
  open: boolean;
  units: RosterUnit[];
  defaultUnitId: number | null;
  saving: boolean;
  fieldError: RosterFieldError | null;
  onClearError: () => void;
  onClose: () => void;
  onSubmit: (unitId: number, start: string, end: string) => void;
}

function quickPicks(): { label: string; from: string; to: string }[] {
  const t = todayLocal();
  const [y, m] = t.split('-').map(Number);
  const cur = monthRange(y, m - 1);
  const next = monthRange(y, m);
  return [
    { label: 'This month', from: cur.from, to: cur.to },
    { label: 'Next month', from: next.from, to: next.to },
    { label: 'Next 14 days', from: t, to: addDays(t, 13) },
  ];
}

export function NewRosterDialog({ open, units, defaultUnitId, saving, fieldError, onClearError, onClose, onSubmit }: Props) {
  const [unitId, setUnitId] = useState<number | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const picks = useMemo(() => quickPicks(), [open]);

  useEffect(() => {
    if (!open) return;
    setUnitId(defaultUnitId ?? (units.length === 1 ? units[0].id : null));
    const next = picks[1];
    setStart(next.from);
    setEnd(next.to);
  }, [open, defaultUnitId, units, picks]);

  const span = start && end ? daysBetween(start, end) + 1 : 0;
  let periodError = '';
  if (start && end && span < 1) periodError = 'End date is before the start date';
  else if (span > MAX_ROSTER_DAYS) periodError = `A roster covers at most ${MAX_ROSTER_DAYS} days`;
  if (!periodError && fieldError?.field === 'period') periodError = fieldError.message;
  const unitError = fieldError?.field === 'unit' ? fieldError.message : '';
  const clientInvalid = !unitId || !start || !end || span < 1 || span > MAX_ROSTER_DAYS;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New roster"
      footer={
        <>
          <Button variant="secondary" className="!h-10 !w-auto px-4 !text-sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="!h-10 !w-auto px-5 !text-sm" loading={saving} disabled={clientInvalid} onClick={() => unitId && onSubmit(unitId, start, end)}>Create roster</Button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectField
          label="Team"
          required
          numeric
          value={unitId}
          onChange={(v) => {
            setUnitId(v);
            onClearError();
          }}
          options={units.map((u) => ({ value: u.id, label: u.name }))}
          error={unitError}
        />
        <div>
          <FieldLabel label="Period" required />
          <div className="mb-2 flex flex-wrap gap-1.5">
            {picks.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setStart(p.from);
                  setEnd(p.to);
                  onClearError();
                }}
                className="h-8 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={shellClass(Boolean(periodError))}>
              <input type="date" aria-label="Start date" value={start} onChange={(e) => { setStart(e.target.value); onClearError(); }} className="w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none focus:ring-0" />
            </div>
            <div className={shellClass(Boolean(periodError))}>
              <input type="date" aria-label="End date" min={start || undefined} max={start ? fmtDate(new Date(Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10) + MAX_ROSTER_DAYS - 1))) : undefined} value={end} onChange={(e) => { setEnd(e.target.value); onClearError(); }} className="w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none focus:ring-0" />
            </div>
          </div>
          <FieldMessage error={periodError} hint={span > 0 ? `${span} day${span === 1 ? '' : 's'} (up to ${MAX_ROSTER_DAYS})` : undefined} />
        </div>
      </div>
    </Dialog>
  );
}
