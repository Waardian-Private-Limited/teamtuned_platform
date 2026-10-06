'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';
import type { ShiftTemplate, ShiftTemplateFormInput, ShiftTemplateStatus } from '../../types/shiftTemplates.model';
import { MAX_SHIFT_MINUTES, type ShiftFieldName } from '../../constants/shiftTemplates.constants';
import type { FieldError } from '../../hooks/useShiftTemplateMutations';
import { formatClock, formatHours, spanMinutes } from '../../utils/shiftTime';

interface ShiftTemplateFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: ShiftTemplate;
  isSaving: boolean;
  fieldError: FieldError | null;
  onClose: () => void;
  onSubmit: (input: ShiftTemplateFormInput) => void;
}

const inputShellClass =
  'relative flex h-10 w-full items-center rounded-lg border bg-surface px-3 transition-colors focus-within:ring-1';

function shellClass(hasError: boolean) {
  return cx(
    inputShellClass,
    hasError
      ? 'border-[var(--tt-danger)] focus-within:border-[var(--tt-danger)] focus-within:ring-[var(--tt-danger)]'
      : 'border-line focus-within:border-[var(--tt-primary)] focus-within:ring-[var(--tt-primary)]'
  );
}

const inputClass = 'w-full min-w-0 border-none bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-0';
const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';

function FieldMessage({ error, field, hint }: { error: FieldError | null; field: ShiftFieldName; hint?: string }) {
  if (error?.field === field) return <p className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{error.message}</p>;
  return hint ? <p className="mt-1 text-[11px] text-fg-muted">{hint}</p> : null;
}

export function ShiftTemplateFormDialog({ open, mode, initial, isSaving, fieldError, onClose, onSubmit }: ShiftTemplateFormDialogProps) {
  const { isOrgAdmin } = usePermission();
  const [name, setName] = React.useState('');
  const [shortCode, setShortCode] = React.useState('');
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('18:00');
  const [breakMinutes, setBreakMinutes] = React.useState('60');
  // Shifts longer than a day (24 h / 36 h duties) are set by length; the end is derived.
  const [longShift, setLongShift] = React.useState(false);
  const [lengthHours, setLengthHours] = React.useState('24');
  const [status, setStatus] = React.useState<ShiftTemplateStatus>('active');
  const [subOrganizationId, setSubOrganizationId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setShortCode(initial?.shortCode ?? '');
    setStartTime(initial?.startTime.slice(0, 5) ?? '09:00');
    setEndTime(initial?.endTime.slice(0, 5) ?? '18:00');
    setBreakMinutes(String(initial?.breakMinutes ?? 60));
    setLongShift(Boolean(initial && initial.durationMinutes >= 1440));
    setLengthHours(String(initial && initial.durationMinutes >= 1440 ? initial.durationMinutes / 60 : 24));
    setStatus(initial?.status ?? 'active');
    setSubOrganizationId(initial?.subOrganizationId ?? null);
  }, [open, initial]);

  const breakValue = breakMinutes.trim() === '' ? 0 : Number(breakMinutes);
  const durationValue = longShift ? Math.round(Number(lengthHours) * 60) : null;
  const hasTimes = longShift ? Boolean(startTime) && Number.isFinite(durationValue) && (durationValue as number) > 0 : Boolean(startTime && endTime) && startTime !== endTime;
  const span = !hasTimes ? 0 : longShift ? (durationValue as number) : spanMinutes(startTime, endTime);
  const startMin = startTime ? Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5)) : 0;
  const daysLater = hasTimes ? Math.floor((startMin + span - 1) / 1440) : 0;
  const shownEnd = hasTimes ? `${String(Math.floor(((startMin + span) % 1440) / 60)).padStart(2, '0')}:${String((startMin + span) % 60).padStart(2, '0')}` : endTime;

  const submit = () => {
    onSubmit({ name, shortCode, startTime, endTime: shownEnd, durationMinutes: durationValue, breakMinutes: breakValue, status, subOrganizationId });
  };

  const titleNode = (
    <div>
      <h2 className="text-sm font-bold text-fg sm:text-base">{mode === 'create' ? 'Create Shift' : 'Edit Shift'}</h2>
      <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
        A named timing employees are assigned to, or rostered on per date
      </p>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titleNode}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || !name.trim()}
            onClick={submit}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>{mode === 'create' ? 'Create Shift' : 'Save changes'}</span>
          </button>
        </>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <label className={labelClass}>
            Shift Name <span className="text-[var(--tt-danger)]">*</span>
          </label>
          <div className={shellClass(fieldError?.field === 'name')}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., General, Morning, Night"
              className={inputClass}
              autoFocus
            />
          </div>
          <FieldMessage error={fieldError} field="name" hint="Must be unique within your organization." />
        </div>

        <div>
          <label className={labelClass}>Short code</label>
          <div className={shellClass(fieldError?.field === 'short_code')}>
            <input
              type="text"
              value={shortCode}
              maxLength={6}
              onChange={(e) => setShortCode(e.target.value.toUpperCase())}
              placeholder="e.g., M, E, N"
              className={inputClass}
            />
          </div>
          <FieldMessage error={fieldError} field="short_code" hint="Shown on roster cells. Leave empty to use the first letter of the name." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              Starts <span className="text-[var(--tt-danger)]">*</span>
            </label>
            <div className={shellClass(fieldError?.field === 'start_time')}>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
            </div>
            <FieldMessage error={fieldError} field="start_time" />
          </div>
          {longShift ? (
            <div>
              <label className={labelClass}>
                Length (hours) <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <div className={shellClass(fieldError?.field === 'duration_minutes')}>
                <input type="number" min={1} max={MAX_SHIFT_MINUTES / 60} step={0.5} value={lengthHours} onChange={(e) => setLengthHours(e.target.value)} className={inputClass} />
              </div>
              <FieldMessage error={fieldError} field="duration_minutes" />
            </div>
          ) : (
            <div>
              <label className={labelClass}>
                Ends <span className="text-[var(--tt-danger)]">*</span>
              </label>
              <div className={shellClass(fieldError?.field === 'end_time')}>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
              </div>
              <FieldMessage error={fieldError} field="end_time" />
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs text-fg">
          <input type="checkbox" checked={longShift} onChange={(e) => setLongShift(e.target.checked)} />
          Runs 24 hours or longer (e.g. a 24 h or 36 h duty)
        </label>

        <div>
          <label className={labelClass}>Break (minutes)</label>
          <div className={shellClass(fieldError?.field === 'break_minutes')}>
            <input
              type="number"
              min={0}
              step={5}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              className={inputClass}
            />
          </div>
          <FieldMessage
            error={fieldError}
            field="break_minutes"
            hint={
              hasTimes && Number.isFinite(breakValue) && breakValue >= 0 && breakValue < span
                ? `${formatClock(startTime)} – ${formatClock(shownEnd)}${daysLater === 1 ? ' (ends next day)' : daysLater > 1 ? ` (ends ${daysLater} days later)` : ''} · ${formatHours(span - breakValue)} working`
                : undefined
            }
          />
        </div>

        {/* Ownership is fixed once created (the backend does not move a shift between sub-orgs). */}
        <SubOrgPicker value={subOrganizationId} onChange={setSubOrganizationId} allowShared={isOrgAdmin} disabled={mode === 'edit'} />

        <div>
          <label className={labelClass}>Status</label>
          <div className="grid grid-cols-2 gap-2.5">
            {(['active', 'inactive'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={cx(
                  'flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
                  status === option
                    ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                    : 'border-line bg-surface hover:bg-bg-subtle'
                )}
              >
                <span
                  className={cx(
                    'flex h-2 w-2 shrink-0 rounded-full',
                    option === 'active' ? 'bg-[var(--tt-success)]' : 'bg-slate-400'
                  )}
                />
                <div>
                  <div className="text-xs font-semibold text-fg">{option === 'active' ? 'Active' : 'Inactive'}</div>
                  <div className="text-[11px] text-fg-muted">
                    {option === 'active' ? 'Available to assign' : 'Hidden from assignments'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
