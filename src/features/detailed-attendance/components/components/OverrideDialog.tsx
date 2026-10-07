'use client';

import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { cx } from '@/theme/tokens';
import { showSuccess } from '@/lib/toast';
import { OVERRIDE_OPTIONS } from '../../constants/detailed.constants';
import { useOverride } from '../../hooks/useOverride';
import type { DayDetail } from '../../types/detailed.model';
import { clockText, longDayText } from '../../utils/format';
import { controlClass } from './controls';
import { ImpactPanel } from './ImpactPanel';

interface Props {
  day: DayDetail;
  onClose: () => void;
  onSaved: () => void;
}

const FROM_TEXT = { recorded: 'Starting from the recorded times.', shift: 'Starting from the shift this day was rostered for.', empty: 'Nothing was recorded or rostered: enter the start and end time.' } as const;

function Form({ day, onClose, onSaved }: Props) {
  const f = useOverride(day.employee.id, day.date, day.form);
  const hasForced = !!day.form.forcedStatus;
  const submit = async () => {
    if (await f.save()) {
      showSuccess(f.mode === 'clear' ? 'Forced status removed' : 'Attendance updated');
      onSaved();
      onClose();
    }
  };
  const button = 'inline-flex h-9 items-center justify-center rounded-lg px-4 text-xs font-semibold transition-colors sm:text-sm';
  return (
    <Dialog
      open
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      title={<div className="min-w-0"><h2 className="truncate text-base font-bold text-fg">Override attendance</h2><p className="text-xs text-fg-muted">{day.employee.name} · {longDayText(day.date)}</p></div>}
      footer={
        <>
          <button type="button" onClick={onClose} className={cx(button, 'border border-line bg-surface text-fg hover:bg-bg-subtle')}>Cancel</button>
          <button type="button" disabled={!f.canSave} onClick={submit} className={cx(button, 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40')}>
            {f.saving ? 'Saving…' : f.mode === 'clear' ? 'Remove forced status' : 'Apply override'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {hasForced && (
          <div role="tablist" aria-label="What to do" className="grid grid-cols-2 gap-1 rounded-lg border border-line/60 bg-bg-subtle p-0.5">
            {([['set', 'Set the hours'], ['clear', 'Remove forced status']] as const).map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={f.mode === value} onClick={() => f.setMode(value)}
                className={cx('h-8 rounded-md text-xs font-semibold transition-colors', f.mode === value ? 'border border-line/70 bg-surface font-bold text-fg shadow-xs' : 'text-fg-muted hover:text-fg')}>
                {label}
              </button>
            ))}
          </div>
        )}

        {f.mode === 'set' ? (
          <>
            <fieldset>
              <legend className="mb-1 text-xs font-semibold text-fg-muted">Start and end of the day, in {day.timezone}</legend>
              <p className="mb-2 text-xs text-fg-muted">{FROM_TEXT[day.form.from]}</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Start</span><input type="time" required value={f.inTime} onChange={(e) => f.setInTime(e.target.value)} className={controlClass} /></label>
                <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">End</span><input type="time" required value={f.outTime} onChange={(e) => f.setOutTime(e.target.value)} className={controlClass} /></label>
              </div>
              {f.nextDay && <p className="mt-1.5 text-xs text-fg-muted">The end is earlier than the start, so it counts as the next morning ({clockText(f.outTime)}).</p>}
            </fieldset>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">The day counts as</span>
              <select value={f.status} onChange={(e) => f.setStatus(e.target.value as typeof f.status)} className={controlClass} aria-label="The day counts as">
                {OVERRIDE_OPTIONS.map((o) => <option key={o.value || 'auto'} value={o.value}>{o.label}</option>)}
              </select>
              <span className="text-xs text-fg-muted">Leave it on &quot;Let the policy decide&quot; and the policy works out late marks, penalties, comp-off and overtime from these times.</span>
            </label>
          </>
        ) : (
          <p className="rounded-xl border border-line bg-bg-subtle/50 p-3 text-sm text-fg-muted">The forced status is removed and the policy decides from the recorded times.</p>
        )}

        <ImpactPanel impact={f.impact} loading={f.previewing} />
        {f.error && <Alert message={f.error} />}

        <Textarea label="Reason" required rows={2} value={f.reason} maxLength={255} onChange={(e) => f.setReason(e.target.value)} hint="Saved on the day's history with your name and the time, so anyone can see why." />
      </div>
    </Dialog>
  );
}

export function OverrideDialog(props: Props & { open: boolean }) {
  if (!props.open) return null;
  return <Form day={props.day} onClose={props.onClose} onSaved={props.onSaved} />;
}
