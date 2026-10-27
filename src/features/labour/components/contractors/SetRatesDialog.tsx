'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, SelectField, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { PAY_BASES } from '../../constants/labour.constants';
import type { Opt } from '../../hooks/useLabourLists';
import type { Category, ContractorRate, PayBasis } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { today } from '../../utils/format';
import { FormError, primaryBtn, secondaryBtn } from '../shared/Primitives';

interface Row { key: number; siteId: number | null; categoryId: number | null; subcategoryId: number | null; payBasis: PayBasis; dayRate: string; nightRate: string; overtimeRate: string; hajriRate: string; note: string }

const str = (v: number | undefined) => (v !== undefined && v !== null ? String(v) : '');
const toRow = (r: Partial<ContractorRate>, key: number): Row => {
  const basis = r.payBasis || 'hourly';
  return {
    key, siteId: r.siteId ?? null, categoryId: r.categoryId ?? null, subcategoryId: r.subcategoryId ?? null, payBasis: basis,
    // A hajri / measurement row stores its time rates as 0; show them empty so switching to hourly asks for real numbers.
    dayRate: basis === 'hourly' ? str(r.dayRate) : '', nightRate: basis === 'hourly' ? str(r.nightRate) : '', overtimeRate: basis === 'hourly' ? str(r.overtimeRate) : '',
    hajriRate: basis === 'hajri' ? str(r.hajriRate) : '', note: r.note || '',
  };
};

/** `rates[2].dayRate`, `rates.2.dayRate` -> [2, 'dayRate'] */
function rowField(field: string): [number, string] | null {
  const m = field.match(/^rates(?:\[(\d+)\]|\.(\d+))\.(\w+)$/);
  return m ? [Number(m[1] ?? m[2]), m[3]] : null;
}

const amountOk = (v: string, positive: boolean) => {
  if (v.trim() === '') return !positive;
  const n = Number(v);
  return Number.isFinite(n) && (positive ? n > 0 : n >= 0);
};

/** Builds the API row for the chosen pay basis (only the money that basis uses is sent). */
function apiRow(r: Row) {
  const base = { siteId: r.siteId, categoryId: r.categoryId, subcategoryId: r.subcategoryId, payBasis: r.payBasis, note: r.note.trim() || undefined };
  if (r.payBasis === 'hajri') return { ...base, hajriRate: Number(r.hajriRate) };
  if (r.payBasis === 'measurement') return base;
  return { ...base, dayRate: Number(r.dayRate), nightRate: Number(r.nightRate || 0), overtimeRate: Number(r.overtimeRate || 0) };
}

export function SetRatesDialog({ contractorId, current, sites, categories, onClose, onSaved }: { contractorId: number; current: ContractorRate[]; sites: Opt[]; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [rows, setRows] = useState<Row[]>(() => (current.length ? current.map(toRow) : [toRow({}, 0)]).map((r, i) => ({ ...r, key: i })));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const patch = (key: number, p: Partial<Row>) => { setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r))); setErrors({}); };

  const save = async () => {
    const errs: Record<string, string> = {};
    if (!effectiveFrom) errs.effectiveFrom = 'Choose when the new rates start';
    rows.forEach((r, i) => {
      if (r.payBasis === 'hourly') {
        if (!amountOk(r.dayRate, true)) errs[`${i}.dayRate`] = 'Enter the day rate per hour (above 0)';
        if (!amountOk(r.nightRate, false)) errs[`${i}.nightRate`] = 'Enter an amount, or leave it empty';
        if (!amountOk(r.overtimeRate, false)) errs[`${i}.overtimeRate`] = 'Enter an amount, or leave it empty';
      } else if (r.payBasis === 'hajri' && !amountOk(r.hajriRate, true)) {
        errs[`${i}.hajriRate`] = 'Enter the money for one hajri (above 0)';
      }
    });
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await api.setRates(contractorId, { effectiveFrom, rates: rows.map(apiRow) });
      showSuccess(res.changed ? `${res.changed} rate${res.changed === 1 ? '' : 's'} updated` : 'No rate changed');
      onSaved();
    } catch (err) {
      const p = placeError(err, (f) => f === 'effectiveFrom' || rowField(f) !== null);
      const f = Object.keys(p.fields)[0];
      const rf = f ? rowField(f) : null;
      setErrors(f === 'effectiveFrom' ? p.fields : rf ? { [`${rf[0]}.${rf[1]}`]: p.fields[f] } : {});
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Set rates" maxWidthClassName="max-w-3xl"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Save rates'}</button></>}>
      <div className="space-y-4">
        <div className="max-w-xs"><TextField label="Effective from" type="date" required value={effectiveFrom} error={errors.effectiveFrom} onChange={setEffectiveFrom} hint="Current rates close the day before. Unchanged rows are left alone." /></div>
        {rows.map((r, i) => {
          const subs = (categories.find((c) => c.id === r.categoryId)?.subcategories || []).map((s) => ({ value: s.id, label: s.name }));
          return (
            <div key={r.key} className="space-y-3 rounded-xl border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField label="Site" numeric value={r.siteId} options={sites} placeholder="All sites" onChange={(v) => patch(r.key, { siteId: v })} />
                <SelectField label="Category" numeric value={r.categoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="All categories" onChange={(v) => patch(r.key, { categoryId: v, subcategoryId: null })} />
                <SelectField label="Subcategory" numeric value={r.subcategoryId} disabled={!r.categoryId} options={subs} placeholder="All subcategories" onChange={(v) => patch(r.key, { subcategoryId: v })} />
              </div>
              <div>
                <FieldLabel label="Pay basis" />
                <SegmentedControl options={PAY_BASES} value={r.payBasis} onChange={(payBasis) => patch(r.key, { payBasis })} fitText />
                <p className="mt-1 text-[11px] text-fg-muted">{PAY_BASES.find((b) => b.value === r.payBasis)?.description}</p>
              </div>
              {r.payBasis === 'hourly' && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField label="Day rate (per hour)" required prefix="₹" inputMode="decimal" value={r.dayRate} error={errors[`${i}.dayRate`]} onChange={(v) => patch(r.key, { dayRate: v })} />
                  <TextField label="Night rate (per hour)" prefix="₹" inputMode="decimal" value={r.nightRate} error={errors[`${i}.nightRate`]} onChange={(v) => patch(r.key, { nightRate: v })} />
                  <TextField label="Overtime rate (per hour)" prefix="₹" inputMode="decimal" value={r.overtimeRate} error={errors[`${i}.overtimeRate`]} onChange={(v) => patch(r.key, { overtimeRate: v })} />
                </div>
              )}
              {r.payBasis === 'hajri' && (
                <div className="max-w-xs">
                  <TextField label="Hajri rate (per hajri)" required prefix="₹" inputMode="decimal" value={r.hajriRate} error={errors[`${i}.hajriRate`]} onChange={(v) => patch(r.key, { hajriRate: v })}
                    hint="Money for one full day unit. ½ hajri pays half, 1½ pays one and a half; units come from the hajri slabs in labour settings." />
                </div>
              )}
              {r.payBasis === 'measurement' && <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg-muted sm:text-sm">Paid from the measurement book. Attendance is still recorded but earns nothing by itself; approved measurement entries are paid.</p>}
              <TextField label="Note" value={r.note} maxLength={255} onChange={(v) => patch(r.key, { note: v })} />
              {rows.length > 1 && <button type="button" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg"><Trash2 className="h-3.5 w-3.5" aria-hidden />Remove row</button>}
            </div>
          );
        })}
        <button type="button" className={secondaryBtn} onClick={() => setRows([...rows, toRow({}, Math.max(...rows.map((r) => r.key)) + 1)])}><Plus className="h-3.5 w-3.5" aria-hidden />Add row</button>
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}
