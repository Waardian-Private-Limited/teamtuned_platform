'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Section, SelectField, TextField } from '@/components/ui/FormControls';
import { showSuccess } from '@/lib/toast';
import * as api from '../../../api/labour.api';
import type { Adjustment } from '../../../types/labour.types';
import { parseLabourError } from '../../../utils/errors';
import { fmtDateTime, money, titleCase } from '../../../utils/format';
import { Block, FormError, Pill, primaryBtn, td, th, trCls } from '../../shared/Primitives';

const KINDS = [{ value: 'opening', label: 'Opening balance' }, { value: 'credit', label: 'Credit (reduces what they owe)' }, { value: 'debit', label: 'Debit (adds to what they owe)' }];

export function AdjustmentsPanel({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<Adjustment[] | null>(null);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<string | null>('opening');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { api.saAdjustments(orgId).then((r) => { setRows(api.asList<Adjustment>(r, 'adjustments')); setError(''); }).catch((e) => setError(parseLabourError(e).message)); }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const errs: Record<string, string> = {};
    const n = Number(amount);
    if (!kind) errs.kind = 'Choose the type';
    if (amount.trim() === '' || !Number.isFinite(n) || n <= 0) errs.amount = 'Enter an amount above zero';
    if (!reason.trim()) errs.reason = 'Write the reason';
    setErrors(errs);
    if (Object.keys(errs).length || !kind) return;
    setBusy(true);
    try { await api.saAddAdjustment(orgId, { kind: kind as Adjustment['kind'], amount: n, reason: reason.trim() }); showSuccess('Adjustment added'); setAmount(''); setReason(''); load(); }
    catch (err) { const e = parseLabourError(err); setErrors({ [e.field && ['kind', 'amount', 'reason'].includes(e.field) ? e.field : 'reason']: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <Section title="Add adjustment" description="Opening balances, credits and debits outside the monthly charges.">
        <div className="space-y-4">
          <SelectField label="Type" value={kind} options={KINDS} error={errors.kind} onChange={(v) => { setKind(v); setErrors({}); }} />
          <TextField label="Amount" prefix="₹" inputMode="decimal" value={amount} error={errors.amount} onChange={(v) => { setAmount(v); setErrors({}); }} />
          <TextField label="Reason" value={reason} error={errors.reason} onChange={(v) => { setReason(v); setErrors({}); }} />
          <button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Add adjustment'}</button>
        </div>
      </Section>
      <Section title="History">
        <FormError message={error} />
        {!rows && !error ? <Block className="h-24" /> : rows && rows.length === 0 ? <p className="text-sm text-fg-muted">No adjustments yet.</p> : rows && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[22rem] border-separate border-spacing-0">
              <thead><tr><th className={th}>When</th><th className={th}>Type</th><th className={`${th} text-right`}>Amount</th></tr></thead>
              <tbody>{rows.map((a, i) => <tr key={a.id ?? i} className={trCls}><td className={td}>{fmtDateTime(a.createdAt)}<div className="text-[11px] text-fg-muted">{a.reason}</div></td><td className={td}><Pill>{titleCase(a.kind)}</Pill></td><td className={`${td} text-right tabular-nums`}>{money(a.amount)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
