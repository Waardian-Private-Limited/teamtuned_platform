'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { cx } from '@/theme/tokens';
import { showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/detailedAttendance.api';
import type { DayDetail } from '../../types/detailed.model';
import { longDayText } from '../../utils/format';
import { controlClass } from './controls';

interface Props {
  open: boolean;
  day: DayDetail;
  onClose: () => void;
  onSaved: () => void;
}

const KINDS = [
  { value: 'overtime', label: 'Overtime' },
  { value: 'night_ot', label: 'Night overtime' },
  { value: 'holiday_work', label: 'Holiday work' },
  { value: 'week_off_work', label: 'Week-off work' },
  { value: 'other', label: 'Other' },
] as const;
const AMOUNTS = [{ value: 0.5, label: 'Half day (0.5)' }, { value: 1, label: 'Full day (1)' }] as const;

/**
 * HR grants comp-off for the day by hand, e.g. the employee fell a few minutes short of the policy's overtime:
 * what the extra work was, half a day or a full day, and why. It is credited at once and kept apart from what the
 * policy grants; who, how much and why show on the day's history.
 */
function Form({ day, onClose, onSaved }: Omit<Props, 'open'>) {
  const [kind, setKind] = React.useState<string>('overtime');
  const [units, setUnits] = React.useState<number>(0.5);
  const [note, setNote] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.grantCompOff(day.employee.id, day.date, { reason: kind, units, note: note.trim() });
      showSuccess('Comp-off granted');
      onSaved();
      onClose();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setSaving(false);
    }
  };
  const button = 'inline-flex h-9 items-center justify-center rounded-lg px-4 text-xs font-semibold transition-colors sm:text-sm';
  return (
    <Dialog
      open
      onClose={onClose}
      maxWidthClassName="max-w-md"
      title={<div className="min-w-0"><h2 className="truncate text-base font-bold text-fg">Grant comp-off</h2><p className="text-xs text-fg-muted">{day.employee.name} · {longDayText(day.date)}</p></div>}
      footer={
        <>
          <button type="button" onClick={onClose} className={cx(button, 'border border-line bg-surface text-fg hover:bg-bg-subtle')}>Cancel</button>
          <button type="button" disabled={saving || !note.trim()} onClick={submit} className={cx(button, 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40')}>
            {saving ? 'Granting…' : 'Grant comp-off'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-fg-muted">For when the policy did not grant it, e.g. the employee fell a few minutes short. It goes straight to their comp-off balance, and your name and reason stay on the day&apos;s history.</p>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">What was the extra work</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={controlClass} aria-label="What was the extra work">
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </label>
        <div role="radiogroup" aria-label="How much" className="grid grid-cols-2 gap-1 rounded-lg border border-line/60 bg-bg-subtle p-0.5">
          {AMOUNTS.map((a) => (
            <button key={a.value} type="button" role="radio" aria-checked={units === a.value} onClick={() => setUnits(a.value)}
              className={cx('h-8 rounded-md text-xs font-semibold transition-colors', units === a.value ? 'border border-line/70 bg-surface font-bold text-fg shadow-xs' : 'text-fg-muted hover:text-fg')}>
              {a.label}
            </button>
          ))}
        </div>
        {error && <Alert message={error} />}
        <Textarea label="Reason" required rows={2} value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} hint="Saved on the day's history with your name, so anyone can see why." />
      </div>
    </Dialog>
  );
}

export function CompOffDialog(props: Props) {
  if (!props.open) return null;
  return <Form day={props.day} onClose={props.onClose} onSaved={props.onSaved} />;
}
