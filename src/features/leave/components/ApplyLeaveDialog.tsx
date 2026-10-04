'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, FieldMessage, SelectField, TextField, shellClass } from '@/components/ui/FormControls';
import { cx } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../api/leave.api';
import type { ApplyInput, Balance, Quote, Session } from '../types/leave';
import { SESSION_LABEL, days, fmtDate, todayIso } from '../utils/format';

interface Props {
  open: boolean;
  onClose: () => void;
  onApplied: () => void;
  /** Admin applying for an employee; omit for "my leave". */
  employee?: { id: number; name: string };
}

const SESSIONS: Session[] = ['full', 'first_half', 'second_half'];
const KIND_LABEL: Record<string, string> = { working: 'Working day', week_off: 'Week off', holiday: 'Holiday', half_holiday: 'Half holiday' };

export function ApplyLeaveDialog({ open, onClose, onApplied, employee }: Props) {
  const [types, setTypes] = React.useState<Balance[]>([]);
  const [typeId, setTypeId] = React.useState<number | null>(null);
  const [start, setStart] = React.useState(todayIso());
  const [end, setEnd] = React.useState(todayIso());
  const [startSession, setStartSession] = React.useState<Session>('full');
  const [endSession, setEndSession] = React.useState<Session>('full');
  const [byHour, setByHour] = React.useState(false);
  const [hours, setHours] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    const t = todayIso();
    setStart(t); setEnd(t); setStartSession('full'); setEndSession('full'); setByHour(false); setHours(''); setReason(''); setQuote(null); setError('');
    (employee ? api.employeeBalances(employee.id) : api.myBalances())
      .then((c) => { setTypes(c.balances); setTypeId(c.balances[0]?.leave_type_id ?? null); })
      .catch((e) => setError(messageOf(e)));
  }, [open, employee]);

  const input = React.useMemo<ApplyInput | null>(() => {
    if (!typeId || !start || !end) return null;
    return {
      leave_type_id: typeId, start_date: start, end_date: end < start ? start : end, unit: byHour ? 'hour' : 'day',
      start_session: startSession, end_session: start === end ? startSession : endSession, hours: byHour ? Number(hours) || null : null,
      ...(employee ? { employee_id: employee.id } : {}),
    };
  }, [typeId, start, end, startSession, endSession, byHour, hours, employee]);

  // Live check: every rule is evaluated by the server, so the answer here is the answer Apply will give.
  React.useEffect(() => {
    if (!open || !input) { setQuote(null); return; }
    setChecking(true);
    const t = setTimeout(() => {
      (employee ? api.previewFor(input) : api.myPreview(input))
        .then(setQuote).catch((e) => setError(messageOf(e))).finally(() => setChecking(false));
    }, 350);
    return () => clearTimeout(t);
  }, [open, input, employee]);

  const fieldError = (f: string) => quote?.violations.find((v) => v.field === f)?.message;
  const typeName = (id: number | null) => types.find((t) => t.leave_type_id === id)?.name ?? 'Leave';

  async function submit() {
    if (!input) return;
    setSaving(true);
    try {
      await (employee ? api.applyFor({ ...input, reason }) : api.myApply({ ...input, reason }));
      showSuccess(employee ? 'Leave added' : 'Leave request sent');
      onApplied();
      onClose();
    } catch (e) { showError(messageOf(e)); } finally { setSaving(false); }
  }

  const sessionSelect = (value: Session, set: (s: Session) => void, label: string) => (
    <div>
      <FieldLabel label={label} />
      <div className={shellClass(false)}>
        <select value={value} onChange={(e) => set(e.target.value as Session)} className="w-full bg-transparent text-sm text-fg outline-none">
          {SESSIONS.map((s) => <option key={s} value={s}>{SESSION_LABEL[s]}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      title={employee ? `Add leave for ${employee.name}` : 'Apply for leave'}
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-fg-muted">{checking ? 'Checking rules…' : quote ? (quote.ok ? 'All rules are met' : `${quote.violations.length} thing${quote.violations.length === 1 ? '' : 's'} to fix`) : ''}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-lg border border-line px-4 text-sm font-semibold text-fg hover:bg-bg-subtle">Cancel</button>
            <button type="button" disabled={saving || checking || !quote?.ok} onClick={submit} className="h-9 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:opacity-50">
              {saving ? 'Sending…' : employee ? 'Add leave' : 'Send request'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <p role="alert" className="text-sm font-medium text-[var(--tt-danger)]">{error}</p>}
        <SelectField
          label="Leave type" required numeric value={typeId} onChange={setTypeId} error={fieldError('leaveTypeId')}
          options={types.map((t) => ({ value: t.leave_type_id, label: t.available == null ? t.name : `${t.name} · ${days(t.available)} left` }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="From" required type="date" value={start} onChange={(v) => { setStart(v); if (end < v) setEnd(v); }} error={fieldError('startDate')} />
          <TextField label="To" required type="date" value={end} min={start} onChange={setEnd} error={fieldError('endDate')} />
        </div>

        <label className="flex items-center gap-2 text-sm text-fg">
          <input type="checkbox" checked={byHour} onChange={(e) => setByHour(e.target.checked)} className="h-4 w-4 accent-[var(--tt-primary)]" /> Leave for a few hours
        </label>
        {byHour ? (
          <TextField label="Hours" required type="number" min={0.5} step={0.5} value={hours} onChange={setHours} error={fieldError('hours')} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sessionSelect(startSession, setStartSession, start === end ? 'Which part of the day' : 'First day')}
            {start !== end && sessionSelect(endSession, setEndSession, 'Last day')}
          </div>
        )}
        <FieldMessage error={fieldError('startSession')} />

        <TextField label="Reason" value={reason} onChange={setReason} maxLength={1000} placeholder="Optional" />

        {quote && (
          <div className="rounded-lg border border-line bg-bg-subtle/50 p-3.5">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <p className="text-2xl font-bold tracking-tight text-fg">{days(quote.charged_days)}</p>
              <p className="text-xs text-fg-muted">will be taken from {typeName(typeId)}</p>
              {quote.balance && quote.has_balance && (
                <p className="text-xs text-fg-muted">Balance {days(quote.balance.before)} → <b className="text-fg">{days(quote.balance.after)}</b></p>
              )}
            </div>
            {quote.allocations.length > 0 && (quote.allocations.length > 1 || quote.allocations[0].is_lop) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quote.allocations.map((a, i) => (
                  <span key={i} className={cx('rounded-full border px-2.5 py-0.5 text-xs font-medium', a.is_lop ? 'border-[var(--tt-danger)] text-[var(--tt-danger)]' : 'border-line text-fg')}>
                    {a.is_lop ? 'Loss of pay' : typeName(a.leave_type_id)} · {days(a.quantity)}
                  </span>
                ))}
              </div>
            )}
            {quote.slots.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {Array.from(new Set(quote.slots.map((s) => s.date))).slice(0, 31).map((d) => {
                  const rows = quote.slots.filter((s) => s.date === d);
                  const off = rows.every((r) => r.kind !== 'working');
                  return (
                    <li key={d} title={rows.map((r) => `${KIND_LABEL[r.kind]} (${r.charged} d)`).join(', ')} className={cx('rounded-md border px-2 py-1 text-[11px]', off ? 'border-dashed border-line text-fg-muted' : 'border-line text-fg')}>
                      {fmtDate(d).replace(/ \d{4}$/, '')}{rows.length === 1 && rows[0].slot !== 0 ? ` · ${rows[0].slot === 1 ? 'AM' : 'PM'}` : ''}{off ? ` · ${KIND_LABEL[rows[0].kind].toLowerCase()}` : ''}
                    </li>
                  );
                })}
              </ul>
            )}
            {quote.violations.length > 0 && (
              <ul className="mt-3 space-y-1">
                {quote.violations.map((v, i) => <li key={i} className="text-xs font-medium text-[var(--tt-danger)]">{v.message}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
