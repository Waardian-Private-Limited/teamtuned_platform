'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Paperclip, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { controlClass, Skeleton } from '@/features/detailed-attendance/components/components/controls';
import { showSuccess } from '@/lib/toast';
import { DAY_KIND, MAX_ATTACHMENT_BYTES, SESSION_TEXT } from '../constants/leave.constants';
import { useApplyLeave } from '../hooks/useApplyLeave';
import type { LeaveType, Session } from '../types/leave.model';
import { daysText, num, shortDate } from '../utils/format';
import { TypeDot } from './LeaveParts';
import { addDays } from '@/lib/datetime';


/** What is left of a leave type, as the picker shows it under its name. */
function typeNote(t: LeaveType) {
  const left = t.locked ? 'Locked until confirmed'
    : t.balance ? `${num(t.balance.available)} ${Math.abs(t.balance.available) === 1 ? 'day' : 'days'} left`
      : t.mode === 'unlimited' ? 'No limit' : t.mode === 'per_event' ? `${daysText(t.policy.credit.days_per_event)} each time` : 'Granted when approved';
  return t.isPaid ? left : `${left} · Unpaid`;
}

interface Props {
  types: LeaveType[];
  today: string;
  initialTypeId: number | null;
  onClose: () => void;
  onApplied: () => void;
}

const SESSIONS: Session[] = ['full', 'first_half', 'second_half'];

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{children}{required && <span className="ml-0.5 text-[var(--tt-danger)]">*</span>}</span>;
}

function SessionPicker({ value, onChange, label }: { value: Session; onChange: (s: Session) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1 rounded-lg border border-line p-1">
      {SESSIONS.map((s) => (
        <button key={s} type="button" role="radio" aria-checked={value === s} onClick={() => onChange(s)}
          className={cx('rounded-md px-2 py-1.5 text-xs font-semibold transition-colors', value === s ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'text-fg-muted hover:bg-bg-subtle')}>
          {SESSION_TEXT[s]}
        </button>
      ))}
    </div>
  );
}

/**
 * Applying for leave: pick a type (with what is left of it), the dates and the part of the day the
 * type allows, then a reason and a document when the policy wants one. Every change is checked by the
 * server, which shows the days it will take, any unpaid part, the balance after and anything to fix.
 */
export function ApplyLeaveDialog({ types, today, initialTypeId, onClose, onApplied }: Props) {
  const a = useApplyLeave(types);
  // The dates the policy lets this type be applied for; the server still has the last word.
  const r = a.type?.policy.request;
  const minDate = r && r.past_days !== null ? addDays(today, -r.past_days) : undefined;
  const maxDate = r && r.future_days !== null ? addDays(today, r.future_days) : undefined;
  const [fileError, setFileError] = React.useState<string | null>(null);
  React.useEffect(() => { if (initialTypeId) a.setTypeId(initialTypeId); }, [initialTypeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (file: File | null) => {
    if (file && file.size > MAX_ATTACHMENT_BYTES) { setFileError('The file is larger than 6 MB.'); return; }
    setFileError(null);
    a.setFile(file);
  };
  const send = async () => {
    if (await a.submit()) {
      showSuccess(a.type?.policy.request.needs_approval ? 'Leave request sent' : 'Leave applied');
      onApplied();
    }
  };
  const q = a.quote;
  const fieldIssue = (f: string) => q?.violations.filter((v) => v.field === f).map((v) => v.message)[0];

  return (
    <Dialog
      open
      onClose={onClose}
      title="Apply for leave"
      maxWidthClassName="max-w-2xl"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={!a.canSubmit} loading={a.busy} loadingLabel="Sending…">{a.type && !a.type.policy.request.needs_approval ? 'Apply' : 'Send request'}</Button>
        </>
      )}
    >
      <div className="space-y-5">
        <section>
          <Label required>Leave type</Label>
          <div className="mt-1.5 flex items-center gap-2">
            {a.type && <TypeDot color={a.type.color} className="h-3 w-3 shrink-0" />}
            <div className="min-w-0 flex-1">
              <Combobox
                options={a.offered.map((t) => ({ value: t.id, label: t.name, description: typeNote(t) }))}
                value={a.typeId}
                onChange={(v) => a.setTypeId(v === null ? null : Number(v))}
                placeholder="Select leave type"
                searchPlaceholder="Search leave type"
                emptyLabel="No leave type matches"
                clearable={false}
              />
            </div>
          </div>
          {a.type && <p className="mt-1 text-xs text-fg-muted">{typeNote(a.type)}</p>}
          {fieldIssue('leaveTypeId') && <p className="mt-1 text-xs font-medium text-[var(--tt-danger)]">{fieldIssue('leaveTypeId')}</p>}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <label className="flex min-w-0 flex-col gap-1">
            <Label required>From</Label>
            <input type="date" className={controlClass} value={a.start} min={minDate} max={maxDate} onChange={(e) => a.setStart(e.target.value)} />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <Label required>To</Label>
            <input type="date" className={controlClass} value={a.end} min={a.start || minDate} max={maxDate} onChange={(e) => a.setEnd(e.target.value)} />
          </label>
        </section>

        {(a.halfDays || a.hourly) && (
          <section className="space-y-2.5">
            {a.hourly && a.sameDay && (
              <label className="flex items-center gap-2 text-sm text-fg">
                <input type="checkbox" checked={a.byHour} onChange={(e) => a.setByHour(e.target.checked)} className="h-4 w-4 accent-[var(--tt-primary)]" /> Only a few hours
              </label>
            )}
            {a.byHour ? (
              <label className="flex max-w-[12rem] flex-col gap-1">
                <Label required>Hours</Label>
                <input type="number" min={0.5} step={0.5} inputMode="decimal" className={controlClass} value={a.hours} onChange={(e) => a.setHours(e.target.value)} />
              </label>
            ) : a.halfDays && (
              <div className={cx('grid gap-3', !a.sameDay && 'sm:grid-cols-2')}>
                <div className="space-y-1"><Label>{a.sameDay ? 'Part of the day' : 'First day'}</Label><SessionPicker label="First day" value={a.startSession} onChange={a.setStartSession} /></div>
                {!a.sameDay && <div className="space-y-1"><Label>Last day</Label><SessionPicker label="Last day" value={a.endSession} onChange={a.setEndSession} /></div>}
              </div>
            )}
          </section>
        )}

        <div aria-live="polite">
          {a.checking && !q ? <Skeleton className="h-20 rounded-xl" /> : q && (
            <section className={cx('rounded-xl border p-3.5 transition-opacity', q.ok ? 'border-line bg-bg-subtle/60' : 'border-[var(--tt-danger)]/30 bg-[var(--tt-danger-soft)]', a.checking && 'opacity-60')}>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <p className="text-2xl font-extrabold tabular-nums tracking-tight text-fg">{daysText(q.days)}</p>
                {q.lopDays > 0 && <p className="text-xs font-semibold text-[var(--tt-danger)]">{daysText(q.lopDays)} unpaid</p>}
                {q.hasBalance && q.balance && <p className="text-xs text-fg-muted">Balance {num(q.balance.before)} → <b className="text-fg">{num(q.balance.after)}</b></p>}
              </div>
              {q.allocations.length > 1 && (
                <p className="mt-1.5 text-xs text-fg-muted">
                  {q.allocations.map((x) => `${x.isLop ? 'Unpaid' : types.find((t) => t.id === x.typeId)?.name ?? 'Leave'} ${daysText(x.quantity)}`).join(' · ')}
                </p>
              )}
              {q.skipped.length > 0 && (
                <p className="mt-1.5 text-xs text-fg-muted">Not counted: {q.skipped.slice(0, 6).map((s) => `${shortDate(s.date)} (${(DAY_KIND[s.kind] ?? s.kind).toLowerCase()})`).join(', ')}{q.skipped.length > 6 ? '…' : ''}</p>
              )}
              {q.ok ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--tt-success)]"><CheckCircle2 className="h-3.5 w-3.5" />Meets your leave policy</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {q.violations.map((v, i) => <li key={`${v.key}-${i}`} className="flex gap-1.5 text-xs font-medium text-[var(--tt-danger)]"><AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />{v.message}</li>)}
                </ul>
              )}
            </section>
          )}
        </div>

        <Textarea label="Reason" maxLength={1000} value={a.reason} onChange={(e) => a.setReason(e.target.value)} />

        <section>
          {a.file ? (
            <p className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-fg"><Paperclip aria-hidden className="h-4 w-4 text-fg-muted" /><span className="min-w-0 flex-1 truncate">{a.file.name}</span>
              <button type="button" aria-label="Remove file" onClick={() => pick(null)} className="rounded p-1 text-fg-muted hover:bg-bg-subtle"><X className="h-4 w-4" /></button></p>
          ) : (
            <label className={cx('flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm font-semibold hover:bg-bg-subtle', a.documentNeeded ? 'border-[var(--tt-primary)] text-fg' : 'border-line text-fg-muted')}>
              <Paperclip aria-hidden className="h-4 w-4" /> {a.documentNeeded ? 'Attach a supporting document (required)' : 'Attach a document (optional)'}
              <input type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = ''; }} />
            </label>
          )}
          <p className="mt-1 text-[11px] text-fg-subtle">JPEG, PNG or PDF, up to 6 MB</p>
          {fileError && <p className="mt-1 text-xs text-[var(--tt-danger)]">{fileError}</p>}
        </section>

        <Alert message={a.error ?? undefined} />
      </div>
    </Dialog>
  );
}
