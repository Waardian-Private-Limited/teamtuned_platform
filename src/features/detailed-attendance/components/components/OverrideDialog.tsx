'use client';

import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { cx } from '@/theme/tokens';
import { showSuccess } from '@/lib/toast';
import { OVERRIDE_OPTIONS } from '../../constants/detailed.constants';
import { useOverride } from '../../hooks/useOverride';
import { longDayText } from '../../utils/format';
import { ImpactPanel } from './ImpactPanel';

interface Props {
  employeeId: number;
  employeeName: string;
  date: string;
  currentStatus: string | null;
  hasOverride: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function Form({ employeeId, employeeName, date, currentStatus, hasOverride, onClose, onSaved }: Props) {
  const f = useOverride(employeeId, date, hasOverride);
  const submit = async () => {
    if (await f.save()) {
      showSuccess(f.mode === 'clear' ? 'Override removed' : 'Attendance updated');
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
      title={<div className="min-w-0"><h2 className="truncate text-base font-bold text-fg">Override attendance</h2><p className="text-xs text-fg-muted">{employeeName} · {longDayText(date)}</p></div>}
      footer={
        <>
          <button type="button" onClick={onClose} className={cx(button, 'border border-line bg-surface text-fg hover:bg-bg-subtle')}>Cancel</button>
          <button type="button" disabled={!f.canSave} onClick={submit} className={cx(button, 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40')}>
            {f.saving ? 'Saving…' : f.mode === 'clear' ? 'Remove override' : 'Apply override'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {hasOverride && (
          <div role="tablist" aria-label="What to do" className="grid grid-cols-2 gap-1 rounded-lg border border-line/60 bg-bg-subtle p-0.5">
            {([['set', 'Change the status'], ['clear', 'Remove the override']] as const).map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={f.mode === value} onClick={() => f.setMode(value)}
                className={cx('h-8 rounded-md text-xs font-semibold transition-colors', f.mode === value ? 'border border-line/70 bg-surface font-bold text-fg shadow-xs' : 'text-fg-muted hover:text-fg')}>
                {label}
              </button>
            ))}
          </div>
        )}

        {f.mode === 'set' ? (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-fg-muted">The day counts as{currentStatus ? ` (now ${currentStatus})` : ''}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup">
              {OVERRIDE_OPTIONS.map((o) => (
                <button key={o.value} type="button" role="radio" aria-checked={f.status === o.value} onClick={() => f.setStatus(o.value)}
                  className={cx('rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[var(--tt-primary)]', f.status === o.value ? 'border-fg bg-bg-subtle ring-1 ring-fg' : 'border-line bg-surface hover:bg-bg-subtle')}>
                  <span className="block text-sm font-bold text-fg">{o.label}</span>
                  <span className="block text-[11px] text-fg-muted">{o.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="rounded-xl border border-line bg-bg-subtle/50 p-3 text-sm text-fg-muted">The day goes back to what the punches and the employee&apos;s policy say.</p>
        )}

        <ImpactPanel impact={f.impact} loading={f.previewing} />
        {f.error && <Alert message={f.error} />}

        <Textarea label="Reason" required rows={2} value={f.reason} maxLength={255} onChange={(e) => f.setReason(e.target.value)} hint="Saved on the day's history so anyone can see why." />
      </div>
    </Dialog>
  );
}

export function OverrideDialog(props: Props & { open: boolean }) {
  if (!props.open) return null;
  return <Form {...props} />;
}
