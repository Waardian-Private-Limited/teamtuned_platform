'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { FieldLabel, SelectField, TextField } from '@/components/ui/FormControls';
import type { FilterOption } from '@/components/ui/SearchableFilterDropdown';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Textarea } from '@/components/ui/Textarea';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { RATE_SOURCE_LABEL } from '../../constants/labour.constants';
import type { Opt } from '../../hooks/useLabourLists';
import type { Labourer, Measurement, MeasurementBody, WorkItem, WorkItemRate } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { fmtDate, money, today } from '../../utils/format';
import { LabourerPicker } from '../shared/FormBits';
import { FormError, primaryBtn, secondaryBtn } from '../shared/Primitives';
import { sheetProblem } from './MeasBits';

const KNOWN = ['workItemId', 'workDate', 'siteId', 'contractorId', 'labourerId', 'quantity', 'rate', 'rateReason', 'amount', 'description'];
const close = (a: number, b: number) => Math.abs(a - b) < 0.005;
const n = (v: string) => (v.trim() === '' ? NaN : Number(v));

/** Enough of a labourer for the picker to show the one already on an entry. */
const pickedOf = (m: Measurement): Labourer | null => (m.labourerId ? ({ id: m.labourerId, code: m.labourerCode || '', firstName: m.labourerName || `#${m.labourerId}`, lastName: null, siteId: m.siteId, contractorId: m.contractorId } as unknown as Labourer) : null);

/**
 * Add or edit (draft / submitted) a measurement entry. Site, contractor, then a labourer or the gang; the work item's rate
 * is looked up (default or a dated override) and shown with where it came from. Changing it needs a reason. A lump-sum
 * item takes the agreed amount instead of quantity x rate.
 */
export function EntryForm({ entry, sites, contractors, workItems, onSaved, onCancel, onDeleted }: {
  entry: Measurement | null; sites: FilterOption[]; contractors: Opt[]; workItems: WorkItem[];
  onSaved: (m: Measurement) => void; onCancel: () => void; onDeleted?: () => void;
}) {
  const editing = Boolean(entry);
  const [siteId, setSiteId] = useState<number | null>(entry?.siteId ?? null);
  const [contractorId, setContractorId] = useState<number | null>(entry?.contractorId ?? null);
  const [who, setWho] = useState<'gang' | 'labourer'>(entry && !entry.labourerId ? 'gang' : 'labourer');
  const [labourer, setLabourer] = useState<Labourer | null>(entry ? pickedOf(entry) : null);
  const [workItemId, setWorkItemId] = useState<number | null>(entry?.workItemId ?? null);
  const [workDate, setWorkDate] = useState(entry?.workDate || today());
  const [quantity, setQuantity] = useState(entry && !entry.isLumpSum ? String(entry.quantity) : '');
  const [rateInput, setRateInput] = useState('');
  const [dirtyRate, setDirtyRate] = useState(false);
  const [rateReason, setRateReason] = useState(entry?.rateReason || '');
  const [description, setDescription] = useState(entry?.description || '');
  const [file, setFile] = useState<File | null>(null);
  const [resolved, setResolved] = useState<WorkItemRate | null>(null);
  const [resolving, setResolving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const item = workItems.find((w) => w.id === workItemId) || null;
  const lumpSum = item ? item.isLumpSum : !!entry?.isLumpSum;
  const labourerId = who === 'labourer' ? labourer?.id ?? null : null;
  const scopeChanged = !!entry && (workItemId !== entry.workItemId || workDate !== entry.workDate || siteId !== entry.siteId || contractorId !== entry.contractorId || labourerId !== (entry.labourerId ?? null));
  const clear = (k: string) => setErrors((e) => (e[k] ? { ...e, [k]: '' } : e));

  // The rate this entry would get: looked up whenever the item, date or who changes.
  useEffect(() => {
    if (!workItemId || !siteId || !contractorId) { setResolved(null); return; }
    let off = false;
    setResolving(true);
    const t = setTimeout(() => {
      api.workItemRate(workItemId, { date: workDate || undefined, siteId, contractorId, labourerId })
        .then((r) => { if (!off) setResolved(r); })
        .catch(() => { if (!off) setResolved(null); })
        .finally(() => { if (!off) setResolving(false); });
    }, 200);
    return () => { off = true; clearTimeout(t); };
  }, [workItemId, workDate, siteId, contractorId, labourerId]);

  const resolvedRate = resolved && resolved.rate > 0 ? resolved.rate : 0;
  const entryQty = entry && entry.isLumpSum ? Math.abs(entry.quantity) || 1 : 1;
  // Not typed by the user: an edit keeps its frozen rate (and an override always), otherwise the looked-up one.
  const frozen = !!entry && (!scopeChanged || entry.rateOverridden);
  const derived = frozen && entry ? (lumpSum ? entry.amount : entry.rate) : resolvedRate || NaN;
  const shown = dirtyRate ? rateInput : Number.isFinite(derived) ? String(derived) : '';
  const rateNum = n(shown);
  const perUnit = lumpSum ? rateNum / (entry && !scopeChanged ? entryQty : 1) : rateNum;
  const sending = dirtyRate || (!editing && !resolvedRate) || (editing && scopeChanged && !resolvedRate && !entry?.rateOverridden);
  const overriding = resolvedRate > 0 && Number.isFinite(perUnit) && !close(perUnit, resolvedRate) && (sending || (frozen && !!entry?.rateOverridden));
  const qtyNum = lumpSum ? (entry && !scopeChanged ? entryQty : 1) : n(quantity);
  const amount = lumpSum ? rateNum : Number.isFinite(qtyNum) && Number.isFinite(rateNum) ? Math.round(qtyNum * rateNum * 100) / 100 : NaN;

  const workItemOptions = useMemo(() => workItems.filter((w) => w.isActive || w.id === entry?.workItemId).map((w) => ({ value: w.id, label: `${w.name} (${w.isLumpSum ? 'lump sum' : w.unit})` })), [workItems, entry?.workItemId]);

  const pickLabourer = (l: Labourer | null) => {
    setLabourer(l);
    clear('labourerId');
    // A labourer brings their own site and contractor when those are still empty.
    if (l) { if (!siteId && l.siteId) setSiteId(l.siteId); if (!contractorId && l.contractorId) setContractorId(l.contractorId); }
  };

  const check = () => {
    const e: Record<string, string> = {};
    if (!siteId) e.siteId = 'Choose the site';
    if (!contractorId) e.contractorId = 'Choose the contractor';
    if (who === 'labourer' && !labourer) e.labourerId = 'Choose the labourer, or switch to the gang';
    if (!workItemId) e.workItemId = 'Choose the work item';
    if (!workDate) e.workDate = 'Pick the work date'; else if (workDate > today()) e.workDate = 'Work cannot be measured before it is done';
    if (!lumpSum && !(qtyNum > 0)) e.quantity = 'Enter a quantity above 0';
    else if (!lumpSum && Math.round(qtyNum * 1000) !== qtyNum * 1000) e.quantity = 'Up to 3 decimals';
    if (!(rateNum > 0)) e[lumpSum ? 'amount' : 'rate'] = lumpSum ? 'Enter the agreed amount' : 'There is no rate for this work: enter the rate';
    if (overriding && (rateReason.trim().length < 3 || rateReason.trim().length > 255)) e.rateReason = 'Say why the rate is different (3 to 255 characters)';
    const fp = sheetProblem(file);
    if (fp) e.file = fp;
    return e;
  };

  const body = (): MeasurementBody => {
    const b: MeasurementBody = {};
    const put = <K extends keyof MeasurementBody>(k: K, v: MeasurementBody[K], was?: unknown) => { if (!editing || v !== was) b[k] = v; };
    put('workItemId', workItemId as number, entry?.workItemId);
    put('workDate', workDate, entry?.workDate);
    put('siteId', siteId, entry?.siteId);
    put('contractorId', contractorId, entry?.contractorId);
    put('labourerId', labourerId, entry?.labourerId ?? null);
    if (!lumpSum) put('quantity', qtyNum, entry?.quantity);
    if (sending) { if (lumpSum) b.amount = rateNum; else b.rate = rateNum; }
    if (overriding && rateReason.trim() !== (entry?.rateReason || '')) b.rateReason = rateReason.trim();
    else if (overriding && sending) b.rateReason = rateReason.trim();
    put('description', description.trim() || null, entry?.description ?? null);
    return b;
  };

  const save = async (submit: boolean) => {
    const e = check();
    setErrors(e);
    setFormError('');
    if (Object.values(e).some(Boolean)) return;
    setBusy(true);
    try {
      let saved: Measurement;
      if (entry) {
        const b = body();
        saved = Object.keys(b).length ? await api.updateMeasurement(entry.id, b) : entry;
        if (submit && saved.status === 'draft') saved = await api.submitMeasurement(entry.id);
      } else {
        saved = await api.createMeasurement({ ...body(), submit });
      }
      if (file) {
        try { await api.uploadMeasurementSheet(saved.id, file); } catch (err) { showError(`Saved, but the sheet was not uploaded: ${messageOf(err)}`); }
      }
      showSuccess(entry ? (submit ? 'Saved and submitted' : 'Entry saved') : submit ? 'Entry submitted for approval' : 'Draft saved');
      onSaved(saved);
    } catch (err) {
      const p = placeError(err, (f) => KNOWN.includes(f));
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => entry && setConfirm({
    title: 'Delete this draft?', body: 'The entry and its sheet are deleted.', cta: 'Delete', danger: true,
    run: async () => { try { await api.deleteMeasurement(entry.id); showSuccess('Draft deleted'); onDeleted?.(); } catch (e) { showError(messageOf(e)); } },
  });
  const removeSheet = () => entry && setConfirm({
    title: 'Remove the measurement sheet?', body: 'The attached file is deleted.', cta: 'Remove', danger: true,
    run: async () => { try { await api.deleteMeasurementSheet(entry.id); showSuccess('Sheet removed'); onSaved({ ...entry, hasAttachment: false, attachment: null }); } catch (e) { showError(messageOf(e)); } },
  });
  const openSheet = async () => { if (entry) { try { window.open((await api.measurementSheetLink(entry.id)).url, '_blank', 'noopener'); } catch (e) { showError(messageOf(e)); } } };

  const source = resolved ? `${RATE_SOURCE_LABEL[resolved.source] || resolved.source}${resolved.effectiveFrom ? ` (from ${fmtDate(resolved.effectiveFrom)})` : ''}` : '';
  const rateHint = (
    <span>
      {resolving ? 'Looking up the rate…' : resolved ? (resolvedRate ? `${money(resolvedRate)}${lumpSum ? ' agreed' : ` per ${resolved.unit}`} · ${source}` : 'No rate set for this item: enter it.') : 'Choose the site, contractor and work item to see the rate.'}
      {frozen && entry && !dirtyRate && <> · frozen on this entry at {money(lumpSum ? entry.amount : entry.rate)}</>}
      {resolvedRate > 0 && (dirtyRate || frozen) && !close(perUnit, resolvedRate) && (
        <button type="button" className="ml-1 font-semibold text-fg underline underline-offset-2" onClick={() => { setDirtyRate(true); setRateInput(String(resolvedRate)); clear('rate'); clear('amount'); }}>Use {money(resolvedRate)}</button>
      )}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Site" required numeric value={siteId} options={sites} error={errors.siteId} onChange={(v) => { setSiteId(v); clear('siteId'); }} />
        <SelectField label="Contractor" required numeric value={contractorId} options={contractors} error={errors.contractorId} onChange={(v) => { setContractorId(v); clear('contractorId'); }}
          hint={contractors.length === 0 ? 'No active contractors at this site yet.' : undefined} />
      </div>
      <div className="space-y-2">
        <FieldLabel label="Done by" />
        <SegmentedControl options={[{ value: 'labourer' as const, label: 'A labourer' }, { value: 'gang' as const, label: 'The gang (whole team)' }]} value={who} onChange={(v) => { setWho(v); clear('labourerId'); }} fitText />
        {who === 'labourer'
          ? <LabourerPicker value={labourer} onChange={pickLabourer} error={errors.labourerId} params={{ contractorId: contractorId ?? undefined, siteId: siteId ?? undefined, status: 'active' }} hint="Only labour of the chosen contractor and site is listed." />
          : <p className="text-[11px] text-fg-muted">The entry is paid to the contractor’s team as a whole (shown as “Gang” in the payable report).</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Work item" required numeric value={workItemId} options={workItemOptions} error={errors.workItemId} onChange={(v) => { setWorkItemId(v); clear('workItemId'); }}
          hint={workItemOptions.length === 0 ? 'No work items yet. Add them in the Work items tab.' : item?.categoryName ? `Category: ${item.categoryName}` : undefined} />
        <TextField label="Work date" type="date" required max={today()} value={workDate} error={errors.workDate} onChange={(v) => { setWorkDate(v); clear('workDate'); }} />
      </div>
      {lumpSum ? (
        <TextField label="Agreed amount" required prefix="₹" inputMode="decimal" value={shown} error={errors.amount} hint={rateHint}
          onChange={(v) => { setDirtyRate(true); setRateInput(v); clear('amount'); clear('rateReason'); }} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Quantity" required inputMode="decimal" value={quantity} error={errors.quantity} suffix={<span className="shrink-0 text-xs font-semibold text-fg-muted">{item?.unit || entry?.unit || ''}</span>}
            onChange={(v) => { setQuantity(v); clear('quantity'); }} />
          <TextField label={`Rate${item ? ` per ${item.unit}` : ''}`} required prefix="₹" inputMode="decimal" value={shown} error={errors.rate} hint={rateHint}
            onChange={(v) => { setDirtyRate(true); setRateInput(v); clear('rate'); clear('rateReason'); }} />
        </div>
      )}
      {overriding && (
        <TextField label="Why is the rate different?" required maxLength={255} value={rateReason} error={errors.rateReason} onChange={(v) => { setRateReason(v); clear('rateReason'); }}
          hint={`The usual rate is ${money(resolvedRate)}. The changed rate is kept on this entry with your reason.`} />
      )}
      <div className="flex items-center justify-between rounded-xl bg-bg-subtle px-3 py-2.5 text-sm">
        <span className="text-fg-muted">{lumpSum ? 'Lump sum (1 job)' : Number.isFinite(qtyNum) && Number.isFinite(rateNum) ? `${qtyNum} ${item?.unit || ''} × ${money(rateNum)}` : 'Amount'}</span>
        <span className="font-bold tabular-nums text-fg">{Number.isFinite(amount) ? money(amount) : '—'}</span>
      </div>
      <Textarea label="Description" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Slab shuttering, 3rd floor, grid A–C" />
      <div>
        <FieldLabel label="Measurement sheet (photo or scan)" />
        {entry?.hasAttachment && !file && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <button type="button" className={secondaryBtn} onClick={openSheet}><ExternalLink className="h-3.5 w-3.5" aria-hidden />{entry.attachment?.name || 'View sheet'}</button>
            <button type="button" className={secondaryBtn} aria-label="Remove the sheet" onClick={removeSheet}><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
          </div>
        )}
        <input type="file" accept="application/pdf,image/jpeg,image/png" capture="environment" onChange={(e) => { setFile(e.target.files?.[0] || null); clear('file'); }}
          aria-invalid={Boolean(errors.file) || undefined}
          className={`block w-full rounded-lg border bg-surface p-1.5 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-bg-subtle file:px-3 file:py-1.5 file:text-xs file:font-semibold ${errors.file ? 'border-[var(--tt-danger)]' : 'border-line'}`} />
        {errors.file ? <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{errors.file}</p> : <p className="mt-1 text-[11px] text-fg-muted">Optional. PDF, JPG or PNG up to 5 MB{entry?.hasAttachment ? '; replaces the current one' : ''}.</p>}
      </div>
      <FormError message={formError} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <div>{entry?.status === 'draft' && <button type="button" className={secondaryBtn} onClick={remove}><Trash2 className="h-3.5 w-3.5" aria-hidden />Delete draft</button>}</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryBtn} onClick={onCancel}>Cancel</button>
          {(!entry || entry.status === 'draft') && <button type="button" className={secondaryBtn} disabled={busy} onClick={() => save(false)}>{entry ? 'Save' : 'Save draft'}</button>}
          {entry?.status === 'submitted' && <button type="button" className={primaryBtn} disabled={busy} onClick={() => save(false)}>{busy ? 'Saving…' : 'Save changes'}</button>}
          {(!entry || entry.status === 'draft') && <button type="button" className={primaryBtn} disabled={busy} onClick={() => save(true)}>{busy ? 'Saving…' : entry ? 'Save & submit' : 'Submit for approval'}</button>}
        </div>
      </div>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
