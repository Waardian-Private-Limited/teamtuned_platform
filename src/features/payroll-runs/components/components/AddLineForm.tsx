'use client';

import React from 'react';
import { messageOf, statusOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/payrollRuns.api';
import { actionBtn, Spinner } from './controls';

type Kind = 'earning' | 'deduction';
const NEW = 'new';
const field = 'h-9 w-full min-w-0 rounded-md border border-line bg-surface px-2.5 text-sm text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] disabled:opacity-50';

/**
 * Adds an earning or deduction line to one employee's entry for this pay period: a type from payroll settings, or a new
 * type made here (saved in payroll settings for later use). Types already on the payslip are left out: edit those.
 */
export function AddLineForm({ kind, runId, employeeId, subOrganizationId, stage, present, onDone }: {
  kind: Kind;
  runId: number;
  employeeId: number;
  subOrganizationId: number | null;
  stage: string;
  /** Keys of the lines on the payslip now. */
  present: Set<string>;
  onDone: (changed: boolean) => void;
}) {
  const [types, setTypes] = React.useState<api.LineTypeDto[] | null>(null);
  const [typeId, setTypeId] = React.useState('');
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const noun = kind === 'earning' ? 'earning' : 'deduction';

  React.useEffect(() => {
    let live = true;
    api.lineTypes(runId)
      .then((r) => { if (live) setTypes(kind === 'earning' ? r.earnings : r.deductions); })
      .catch((e) => { if (live) { setTypes([]); setError(messageOf(e)); } });
    return () => { live = false; };
  }, [runId, kind]);

  const prefix = kind === 'earning' ? 'component' : 'rule';
  const free = (types ?? []).filter((t) => !present.has(`${prefix}:${t.id}`) && !present.has(`manual:${prefix}:${t.id}`));
  const isNew = typeId === NEW;

  async function submit() {
    const value = amount.trim();
    if (!typeId) return setError(`Pick the ${noun} type`);
    if (isNew && !name.trim()) return setError(`Name the new ${noun} type`);
    if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0) return setError('Enter an amount more than zero, at most two decimals');
    setBusy(true);
    setError(null);
    try {
      let id = Number(typeId);
      if (isNew) {
        try {
          id = await api.createLineType(kind, name.trim().slice(0, 100), subOrganizationId);
        } catch (e) {
          setError(statusOf(e) === 403 ? `You cannot add ${noun} types to payroll settings. Pick an existing type, or ask an admin.` : messageOf(e));
          return;
        }
      }
      const r = await api.addLine({ run_id: runId, employee_id: employeeId, kind, type_id: id, amount: Number(value) });
      showSuccess(r.message);
      onDone(true);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2.5 border-b border-line px-4 py-3">
      <p className="text-xs font-semibold text-fg">Add {noun}</p>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <select aria-label={`${noun} type`} value={typeId} disabled={busy || types === null} onChange={(e) => { setTypeId(e.target.value); setError(null); }} className={field}>
          <option value="">{types === null ? 'Loading types…' : `Pick ${noun} type`}</option>
          {free.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
          <option value={NEW}>+ New {noun} type…</option>
        </select>
        <div className="flex h-9 items-center rounded-md border border-line bg-surface focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
          <span className="pl-2.5 text-xs font-semibold text-fg-muted">₹</span>
          <input inputMode="decimal" aria-label="Amount" value={amount} disabled={busy} placeholder="0"
            onChange={(e) => { setAmount(e.target.value.replace(/[^\d.]/g, '')); setError(null); }}
            className="h-full w-full min-w-0 bg-transparent px-1.5 text-right text-sm font-semibold tabular-nums text-fg outline-none" />
        </div>
      </div>
      {isNew && (
        <div>
          <input aria-label={`New ${noun} type name`} value={name} maxLength={100} disabled={busy} placeholder={kind === 'earning' ? 'e.g. Night allowance' : 'e.g. Uniform recovery'}
            onChange={(e) => { setName(e.target.value); setError(null); }} className={field} />
          <p className="mt-1 text-[11px] text-fg-muted">
            Saved in payroll settings as a new {kind === 'earning' ? 'salary component' : 'deduction rule (not assigned to anyone)'}, so it can be picked again. Only this payslip gets the amount.
          </p>
        </div>
      )}
      <p className="text-[11px] text-fg-muted">
        Only this employee&apos;s payslip for this period. Nothing else (PF, ESI, TDS) is recalculated from it.
        {stage !== 'draft' ? ` This payroll is ${stage}: the payslip shows it the next time it is opened.` : ''}
        {stage === 'paid' ? ' The salary was already paid: the difference is flagged on the entry.' : ''}
      </p>
      {error && <p className="text-xs font-medium text-[var(--tt-danger,#b42318)]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={actionBtn.secondary} disabled={busy} onClick={() => onDone(false)}>Cancel</button>
        <button type="button" className={actionBtn.primary} disabled={busy || types === null} onClick={submit}>
          {busy && <Spinner />} Add {noun}
        </button>
      </div>
    </div>
  );
}
