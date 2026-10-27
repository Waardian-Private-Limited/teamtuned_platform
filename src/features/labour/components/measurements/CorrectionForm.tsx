'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { FieldLabel, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Textarea } from '@/components/ui/Textarea';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import type { Measurement, MeasurementBody, MeasurementDetail } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { fmtDate, money, today } from '../../utils/format';
import { qty } from '../../utils/pay';
import { FormError, primaryBtn, secondaryBtn } from '../shared/Primitives';
import { whoLabel } from './MeasBits';

const KNOWN = ['quantity', 'amount', 'rate', 'rateReason', 'adjustReason', 'workDate', 'description'];
type Dir = 'less' | 'more';

/**
 * A correction of an approved entry: an adjustment entry (less or more quantity, or money for a lump sum) with a reason,
 * dated today by default so a period already paid is not rewritten. It keeps the original's site, contractor, labourer,
 * item and frozen rate, and goes through draft -> submitted -> approved like any entry. `current` edits an open correction.
 */
export function CorrectionForm({ original, current, onSaved, onCancel, onDeleted }: {
  original: MeasurementDetail; current: Measurement | null; onSaved: (m: Measurement) => void; onCancel: () => void; onDeleted?: () => void;
}) {
  const lump = original.isLumpSum;
  const startValue = current ? Math.abs(lump ? current.amount : current.quantity) : NaN;
  const [dir, setDir] = useState<Dir>(current && (lump ? current.amount : current.quantity) > 0 ? 'more' : 'less');
  const [value, setValue] = useState(Number.isFinite(startValue) ? String(startValue) : '');
  const [changeRate, setChangeRate] = useState(!!current && !lump && Math.abs(current.rate - original.rate) > 0.004);
  const [rate, setRate] = useState(String(current && !lump ? current.rate : original.rate));
  const [adjustReason, setAdjustReason] = useState(current?.adjustReason || '');
  const [workDate, setWorkDate] = useState(current?.workDate || today());
  const [description, setDescription] = useState(current?.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const clear = (k: string) => setErrors((e) => (e[k] ? { ...e, [k]: '' } : e));

  const sign = dir === 'less' ? -1 : 1;
  const v = value.trim() === '' ? NaN : Number(value);
  const rateNum = changeRate ? Number(rate) : original.rate;
  const delta = lump ? sign * v : Math.round(sign * v * rateNum * 100) / 100;
  // Net without this correction (an edit takes its own stored amount back out).
  const netBase = original.net || { quantity: original.quantity, amount: original.amount };
  const ownQ = current && current.status !== 'rejected' ? current.quantity : 0;
  const ownA = current && current.status !== 'rejected' ? current.amount : 0;
  const newNetQ = netBase.quantity - ownQ + (lump ? (sign < 0 ? -1 : 1) : sign * v);
  const newNetA = netBase.amount - ownA + delta;

  const save = async (submit: boolean) => {
    const e: Record<string, string> = {};
    const field = lump ? 'amount' : 'quantity';
    if (!(v > 0)) e[field] = lump ? 'Enter the money to take back or add' : 'Enter the quantity to take off or add';
    else if (!lump && Math.round(v * 1000) !== v * 1000) e.quantity = 'Up to 3 decimals';
    if (!lump && changeRate && !(rateNum > 0)) e.rate = 'Enter a rate above 0';
    if (adjustReason.trim().length < 3 || adjustReason.trim().length > 255) e.adjustReason = 'Say why (3 to 255 characters)';
    if (!workDate) e.workDate = 'Pick the date';
    else if (workDate > today()) e.workDate = 'Not after today';
    else if (workDate < original.workDate) e.workDate = `Not before the entry’s date (${fmtDate(original.workDate)})`;
    if (!e[field] && (newNetQ < -0.0005 || newNetA < -0.005)) e[field] = 'This would take the entry below zero';
    setErrors(e);
    setFormError('');
    if (Object.values(e).some(Boolean)) return;
    const body: MeasurementBody = {
      ...(lump ? { amount: sign * v } : { quantity: sign * v }),
      ...(!lump && changeRate ? { rate: rateNum } : {}),
      adjustReason: adjustReason.trim(), workDate, description: description.trim() || null,
    };
    setBusy(true);
    try {
      let saved: Measurement;
      if (current) {
        saved = await api.updateMeasurement(current.id, body);
        if (submit && saved.status === 'draft') saved = await api.submitMeasurement(current.id);
      } else {
        saved = await api.createMeasurement({ ...body, adjustsId: original.id, submit });
      }
      showSuccess(submit ? 'Correction submitted for approval' : 'Correction saved');
      onSaved(saved);
    } catch (err) {
      const p = placeError(err, (f) => KNOWN.includes(f));
      // A changed rate is explained by the correction's own reason.
      setErrors(p.fields.rateReason ? { adjustReason: p.fields.rateReason } : p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => current && setConfirm({
    title: 'Delete this draft correction?', body: 'The correction is deleted; the original entry is unchanged.', cta: 'Delete', danger: true,
    run: async () => { try { await api.deleteMeasurement(current.id); showSuccess('Draft deleted'); onDeleted?.(); } catch (er) { showError(messageOf(er)); } },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line p-3 text-sm">
        <p className="font-semibold text-fg">Correcting entry #{original.id}: {original.workItemName}</p>
        <p className="text-xs text-fg-muted">{fmtDate(original.workDate)} · {whoLabel(original)} · {original.contractorName} · {original.siteName}</p>
        <p className="mt-1 text-xs text-fg-muted">
          Approved {lump ? money(original.amount) : `${qty(original.quantity)} ${original.unit} × ${money(original.rate)} = ${money(original.amount)}`}
          {original.net ? ` · net now ${lump ? '' : `${qty(original.net.quantity)} ${original.unit} · `}${money(original.net.amount)}` : ''}
        </p>
      </div>
      <div>
        <FieldLabel label="Correction" />
        <SegmentedControl options={[{ value: 'less' as const, label: lump ? 'Take money back' : 'Less (measured too much)' }, { value: 'more' as const, label: lump ? 'Add money' : 'More (measured too little)' }]} value={dir} onChange={(d) => { setDir(d); setErrors({}); }} fitText />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {lump ? (
          <TextField label={dir === 'less' ? 'Amount to take back' : 'Amount to add'} required prefix="₹" inputMode="decimal" value={value} error={errors.amount} onChange={(x) => { setValue(x); clear('amount'); }} />
        ) : (
          <TextField label={dir === 'less' ? 'Quantity to take off' : 'Quantity to add'} required inputMode="decimal" value={value} error={errors.quantity} suffix={<span className="shrink-0 text-xs font-semibold text-fg-muted">{original.unit}</span>} onChange={(x) => { setValue(x); clear('quantity'); }} />
        )}
        <TextField label="Date of the correction" type="date" required min={original.workDate} max={today()} value={workDate} error={errors.workDate} onChange={(x) => { setWorkDate(x); clear('workDate'); }}
          hint="Counts in the payable of this date, so a period already paid is not rewritten." />
      </div>
      {!lump && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-fg-muted">
            <input type="checkbox" checked={changeRate} onChange={(e) => { setChangeRate(e.target.checked); setRate(String(original.rate)); clear('rate'); }} className="h-4 w-4 accent-[var(--tt-primary)]" />
            Use a different rate (the entry’s rate is {money(original.rate)} per {original.unit})
          </label>
          {changeRate && <div className="max-w-xs"><TextField label={`Rate per ${original.unit}`} required prefix="₹" inputMode="decimal" value={rate} error={errors.rate} onChange={(x) => { setRate(x); clear('rate'); }} hint="The correction reason explains the changed rate." /></div>}
        </div>
      )}
      <TextField label="Reason" required maxLength={255} value={adjustReason} error={errors.adjustReason} onChange={(x) => { setAdjustReason(x); clear('adjustReason'); }} placeholder="e.g. Re-measured with the client: 20 sq m less" />
      <div className="grid gap-2 rounded-xl bg-bg-subtle px-3 py-2.5 text-sm sm:grid-cols-2">
        <div className="flex items-center justify-between gap-2"><span className="text-fg-muted">This correction</span><span className={`font-bold tabular-nums ${delta < 0 ? 'text-[var(--tt-danger)]' : 'text-fg'}`}>{Number.isFinite(delta) ? money(delta) : '—'}</span></div>
        <div className="flex items-center justify-between gap-2"><span className="text-fg-muted">Net after it</span><span className="font-bold tabular-nums text-fg">{Number.isFinite(newNetA) ? money(newNetA) : '—'}</span></div>
      </div>
      <Textarea label="Description" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
      <FormError message={formError} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <div>{current?.status === 'draft' && <button type="button" className={secondaryBtn} onClick={remove}><Trash2 className="h-3.5 w-3.5" aria-hidden />Delete draft</button>}</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryBtn} onClick={onCancel}>Cancel</button>
          {(!current || current.status === 'draft') && <button type="button" className={secondaryBtn} disabled={busy} onClick={() => save(false)}>Save draft</button>}
          {current?.status === 'submitted'
            ? <button type="button" className={primaryBtn} disabled={busy} onClick={() => save(false)}>{busy ? 'Saving…' : 'Save changes'}</button>
            : <button type="button" className={primaryBtn} disabled={busy} onClick={() => save(true)}>{busy ? 'Saving…' : 'Submit for approval'}</button>}
        </div>
      </div>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
