'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { cx } from '@/theme/tokens';
import type { ScheduleDay } from '../../../types/roster.types';
import { useMyRosterCandidates } from '../../../hooks/useMyRosterCandidates';
import { formatDay } from '../../../utils/rosterTime';
import { shiftLabel } from '../../../utils/myRosterUtils';

export type SwapMode = 'swap' | 'give_away' | 'drop_to_open';

interface Props {
  day: ScheduleDay;
  mode: SwapMode;
  onClose: () => void;
  onSubmit: (body: { type: SwapMode; fromDate: string; fromSeq: number; toEmployeeId?: number; toDate?: string; toSeq?: number; reason?: string }) => Promise<string | null>;
}

const TITLES: Record<SwapMode, string> = {
  swap: 'Swap with a colleague',
  give_away: 'Give this shift away',
  drop_to_open: 'Release to open shifts',
};

export function SwapDialog({ day, mode, onClose, onSubmit }: Props) {
  const needsPerson = mode !== 'drop_to_open';
  const { colleagues, people, loading, error: loadError } = useMyRosterCandidates(day.work_date, day.seq, needsPerson);
  const [pick, setPick] = useState<string | null>(null);
  const [person, setPerson] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError('');
    if (mode === 'swap' && !pick) return setError('Choose the colleague shift you want to swap with');
    if (mode === 'give_away' && !person) return setError('Choose who should take this shift');
    const base = { type: mode, fromDate: day.work_date, fromSeq: day.seq, reason: reason.trim() || undefined };
    let body: Parameters<Props['onSubmit']>[0] = base;
    if (mode === 'swap') {
      const c = colleagues.find((x) => `${x.employee_id}:${x.work_date}:${x.seq}` === pick);
      if (!c) return setError('Choose the colleague shift you want to swap with');
      body = { ...base, toEmployeeId: c.employee_id, toDate: c.work_date, toSeq: c.seq };
    } else if (mode === 'give_away') {
      body = { ...base, toEmployeeId: person as number };
    }
    setSaving(true);
    const err = await onSubmit(body);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  const errorClass = error ? 'border-[var(--tt-danger)]' : 'border-line';

  return (
    <Dialog
      open
      onClose={onClose}
      title={TITLES[mode]}
      footer={
        <>
          <Button variant="secondary" className="!h-10 !w-auto !px-4 !text-sm" onClick={onClose}>Close</Button>
          <Button className="!h-10 !w-auto !px-4 !text-sm" loading={saving} onClick={submit} disabled={needsPerson && (loading || colleagues.length === 0)}>
            Send request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Your {shiftLabel(day)} on {formatDay(day.work_date, { weekday: 'long', day: 'numeric', month: 'long' })}.
        </p>

        {mode === 'drop_to_open' && (
          <p className="text-sm text-fg-muted">The shift goes back to the open shifts list once your manager approves, and a colleague can pick it up.</p>
        )}

        {needsPerson && loading && <p className="text-sm text-fg-muted">Loading colleagues…</p>}
        {needsPerson && loadError && <p className="text-xs font-medium text-[var(--tt-danger)]">{loadError}</p>}
        {needsPerson && !loading && !loadError && colleagues.length === 0 && (
          <p className="text-sm text-fg-muted">No colleagues in your team have upcoming shifts to swap with right now.</p>
        )}

        {mode === 'swap' && colleagues.length > 0 && (
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Swap with</span>
            <div className={cx('max-h-64 divide-y divide-line overflow-y-auto rounded-lg border', errorClass)} role="radiogroup">
              {colleagues.map((c) => {
                const key = `${c.employee_id}:${c.work_date}:${c.seq}`;
                const active = pick === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPick(key)}
                    className={cx('flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors', active ? 'bg-fg text-fg-inverted' : 'hover:bg-bg-subtle')}
                  >
                    <span className="text-sm font-semibold">{c.name}</span>
                    <span className={cx('text-xs', active ? 'text-fg-inverted/80' : 'text-fg-muted')}>
                      {c.shift_name}, {formatDay(c.work_date, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === 'give_away' && people.length > 0 && (
          <SelectField
            label="Give to"
            value={person}
            numeric
            placeholder="Choose a colleague"
            onChange={setPerson}
            options={people.map((p) => ({ value: p.id, label: p.name }))}
            error={error && !person ? error : undefined}
          />
        )}

        <Textarea label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Let them know why" />

        {error && (mode !== 'give_away' || person) && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      </div>
    </Dialog>
  );
}
