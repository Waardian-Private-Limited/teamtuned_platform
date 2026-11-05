'use client';

import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { PAY_BASES } from '../../constants/labour.constants';
import type { Opt } from '../../hooks/useLabourLists';
import type { Category, ContractorRate, ContractorTrade, PayBasis } from '../../types/labour.types';
import { supplies } from '../../utils/trades';
import { placeError } from '../../utils/errors';
import { today } from '../../utils/format';
import { FormError, primaryBtn, secondaryBtn } from '../shared/Primitives';

/** One rate line of the grid: a site (null = all sites) × trade (null category = every trade; null subcategory = the whole category). */
interface Line {
  key: string;
  siteId: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  label: string;
  payBasis: PayBasis;
  dayRate: string;
  nightRate: string;
  overtimeRate: string;
  hajriRate: string;
  note: string | null;
  /** The open rate this line was filled from (it can be changed, not emptied). */
  current: ContractorRate | null;
}

const keyOf = (siteId: number | null, categoryId: number | null, subcategoryId: number | null) => `${siteId ?? 0}:${categoryId ?? 0}:${subcategoryId ?? 0}`;
const str = (v: number | undefined) => (v !== undefined && v !== null ? String(v) : '');

function blank(siteId: number | null, categoryId: number | null, subcategoryId: number | null, label: string): Line {
  return { key: keyOf(siteId, categoryId, subcategoryId), siteId, categoryId, subcategoryId, label, payBasis: 'hourly', dayRate: '', nightRate: '', overtimeRate: '', hajriRate: '', note: null, current: null };
}

function fromRate(line: Line, r: ContractorRate): Line {
  const basis = r.payBasis || 'hourly';
  // A hajri / measurement rate stores its time rates as 0; show them empty so switching to hourly asks for real numbers.
  return {
    ...line, payBasis: basis, current: r, note: r.note || null,
    dayRate: basis === 'hourly' ? str(r.dayRate) : '', nightRate: basis === 'hourly' ? str(r.nightRate) : '', overtimeRate: basis === 'hourly' ? str(r.overtimeRate) : '',
    hajriRate: basis === 'hajri' ? str(r.hajriRate) : '',
  };
}

/** The line has a rate: measurement is picked, or an amount is typed. */
const isSet = (l: Line) => l.payBasis === 'measurement' || (l.payBasis === 'hajri' ? l.hajriRate.trim() !== '' : [l.dayRate, l.nightRate, l.overtimeRate].some((v) => v.trim() !== ''));

const num = (v: string) => Number(v.trim() || 0);
function differs(l: Line) {
  const c = l.current;
  if (!c) return true;
  if ((c.payBasis || 'hourly') !== l.payBasis) return true;
  if (l.payBasis === 'hajri') return num(l.hajriRate) !== Number(c.hajriRate || 0);
  if (l.payBasis === 'hourly') return num(l.dayRate) !== c.dayRate || num(l.nightRate) !== c.nightRate || num(l.overtimeRate) !== c.overtimeRate;
  return false;
}

const amountOk = (v: string, positive: boolean) => {
  if (v.trim() === '') return !positive;
  const n = Number(v);
  return Number.isFinite(n) && (positive ? n > 0 : n >= 0);
};

/** Builds the API row for the chosen pay basis (only the money that basis uses is sent). */
function apiRow(l: Line) {
  const base = { siteId: l.siteId, categoryId: l.categoryId, subcategoryId: l.subcategoryId, payBasis: l.payBasis, note: l.note || undefined };
  if (l.payBasis === 'hajri') return { ...base, hajriRate: num(l.hajriRate) };
  if (l.payBasis === 'measurement') return base;
  return { ...base, dayRate: num(l.dayRate), nightRate: num(l.nightRate), overtimeRate: num(l.overtimeRate) };
}

/** `rates[2].dayRate`, `rates.2.dayRate` -> [2, 'dayRate'] */
function rowField(field: string): [number, string] | null {
  const m = field.match(/^rates(?:\[(\d+)\]|\.(\d+))\.(\w+)$/);
  return m ? [Number(m[1] ?? m[2]), m[3]] : null;
}

/**
 * The grid of one site: a standard line for every trade, then one line per subcategory (or per category that has none),
 * then any other open rate of that site (e.g. a whole-category rate). Switched-off trades show only when they have a rate.
 */
function linesOf(siteId: number | null, categories: Category[], trades: ContractorTrade[], current: ContractorRate[]): Line[] {
  const mine = current.filter((r) => (r.siteId ?? null) === siteId);
  const out: Line[] = [blank(siteId, null, null, 'Standard rate (every trade)')];
  // Trades the contractor supplies (switched-on ones), plus any trade that already has a rate here.
  for (const c of categories) {
    const subs = c.subcategories.filter((s) => (s.isActive && c.isActive && supplies(trades, c.id, s.id)) || mine.some((r) => r.subcategoryId === s.id));
    const listed = c.isActive && trades.length ? trades.some((t) => t.categoryId === c.id) : c.isActive;
    if (!listed && !subs.length && !mine.some((r) => r.categoryId === c.id)) continue;
    if (subs.length) {
      if (mine.some((r) => r.categoryId === c.id && !r.subcategoryId)) out.push(blank(siteId, c.id, null, `${c.name} · all subcategories`));
      for (const s of subs) out.push(blank(siteId, c.id, s.id, `${c.name} · ${s.name}`));
    } else out.push(blank(siteId, c.id, null, c.name));
  }
  return out.map((l) => {
    const r = mine.find((x) => keyOf(x.siteId ?? null, x.categoryId ?? null, x.subcategoryId ?? null) === l.key);
    return r ? fromRate(l, r) : l;
  });
}

export function SetRatesDialog({ contractorId, contractorSiteIds, current, sites, categories, trades, onClose, onSaved }: { contractorId: number; contractorSiteIds: number[]; current: ContractorRate[]; sites: Opt[]; categories: Category[]; trades: ContractorTrade[]; onClose: () => void; onSaved: () => void }) {
  // The sites the contractor is registered at (every site when none is linked), plus any site that already has a rate.
  const siteOptions = useMemo(() => {
    const wanted = new Set([...(contractorSiteIds.length ? contractorSiteIds : sites.map((s) => s.value)), ...current.map((r) => r.siteId).filter((v): v is number => v !== null)]);
    return sites.filter((s) => wanted.has(s.value));
  }, [contractorSiteIds, sites, current]);
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [siteId, setSiteId] = useState<number | null>(null);
  // Every line touched on any site is kept, so switching site and coming back loses nothing.
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => linesOf(siteId, categories, trades, current).map((l) => lines[l.key] || l), [siteId, categories, trades, current, lines]);
  const edited = (l: Line) => lines[l.key] || l;
  const patch = (l: Line, p: Partial<Line>) => { setLines((ls) => ({ ...ls, [l.key]: { ...edited(l), ...p } })); setErrors({}); setFormError(''); };
  const siteName = (id: number | null) => (id === null ? 'All sites' : sites.find((s) => s.value === id)?.label || `Site ${id}`);

  const save = async () => {
    const errs: Record<string, string> = {};
    if (!effectiveFrom) errs.effectiveFrom = 'Choose when the new rates start';
    const touched = Object.values(lines);
    for (const l of touched) {
      if (!isSet(l)) {
        if (l.current) errs[`${l.key}.${l.payBasis === 'hajri' ? 'hajriRate' : 'dayRate'}`] = 'This rate is in use. Enter the new amount; it cannot be left empty';
        continue;
      }
      if (l.payBasis === 'hourly') {
        if (!amountOk(l.dayRate, true)) errs[`${l.key}.dayRate`] = 'Enter the day rate per hour (above 0)';
        if (!amountOk(l.nightRate, false)) errs[`${l.key}.nightRate`] = 'Enter an amount, or leave it empty';
        if (!amountOk(l.overtimeRate, false)) errs[`${l.key}.overtimeRate`] = 'Enter an amount, or leave it empty';
      } else if (l.payBasis === 'hajri' && !amountOk(l.hajriRate, true)) errs[`${l.key}.hajriRate`] = 'Enter the money for one hajri (above 0)';
    }
    const send = touched.filter((l) => isSet(l) && differs(l));
    setErrors(errs);
    setFormError('');
    const bad = Object.keys(errs).find((k) => k !== 'effectiveFrom');
    if (bad) {
      const l = lines[bad.slice(0, bad.lastIndexOf('.'))];
      if (l && l.siteId !== siteId) { setSiteId(l.siteId); setFormError(`Check the rates marked in red for ${siteName(l.siteId)}.`); }
    }
    if (Object.keys(errs).length) return;
    if (!send.length) { setFormError('No rate changed. Type an amount, or pick measurement, for a trade first.'); return; }
    if (send.length > 200) { setFormError('Save at most 200 rates at a time.'); return; }
    setBusy(true);
    try {
      const res = await api.setRates(contractorId, { effectiveFrom, rates: send.map(apiRow) });
      showSuccess(res.changed ? `${res.changed} rate${res.changed === 1 ? '' : 's'} updated` : 'No rate changed');
      onSaved();
    } catch (err) {
      const p = placeError(err, (f) => f === 'effectiveFrom' || rowField(f) !== null);
      const f = Object.keys(p.fields)[0];
      const rf = f ? rowField(f) : null;
      const l = rf ? send[rf[0]] : null;
      if (l && rf) { setSiteId(l.siteId); setErrors({ [`${l.key}.${rf[1]}`]: p.fields[f] }); } else setErrors(f === 'effectiveFrom' ? p.fields : {});
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Set rates" maxWidthClassName="max-w-3xl"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Save rates'}</button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Effective from" type="date" required value={effectiveFrom} error={errors.effectiveFrom} onChange={setEffectiveFrom} hint="Current rates close the day before. Unchanged rates are left alone." />
          <SelectField label="Rates for" numeric value={siteId} options={siteOptions} placeholder="All sites" onChange={(v) => setSiteId(v)}
            hint={siteId === null ? 'Used at every site that has no rate of its own.' : 'Used at this site before the all-sites rates.'} />
        </div>
        <p className="text-xs text-fg-muted">Leave a trade empty to use the standard rate. A subcategory rate comes before its category and the standard rate.</p>
        {shown.map((l) => {
          const err = (f: string) => errors[`${l.key}.${f}`];
          return (
            <div key={l.key} className="space-y-3 rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-fg">{l.label}</div>
                  <div className="text-[11px] text-fg-muted">{l.current ? 'Current rate' : isSet(l) ? 'New rate' : l.categoryId === null ? 'Not set' : 'Not set · uses the standard rate'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <SegmentedControl options={PAY_BASES} value={l.payBasis} onChange={(payBasis) => patch(l, { payBasis })} fitText />
                  {!l.current && isSet(l) && (
                    <button type="button" title="Clear this rate" aria-label={`Clear the rate for ${l.label}`} className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"
                      onClick={() => patch(l, { payBasis: 'hourly', dayRate: '', nightRate: '', overtimeRate: '', hajriRate: '' })}><RotateCcw className="h-3.5 w-3.5" aria-hidden /></button>
                  )}
                </div>
              </div>
              {l.payBasis === 'hourly' && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField label="Day rate (per hour)" required={isSet(l) || !!l.current} prefix="₹" inputMode="decimal" value={l.dayRate} error={err('dayRate')} onChange={(v) => patch(l, { dayRate: v })} />
                  <TextField label="Night rate (per hour)" prefix="₹" inputMode="decimal" value={l.nightRate} error={err('nightRate')} onChange={(v) => patch(l, { nightRate: v })} />
                  <TextField label="Overtime rate (per hour)" prefix="₹" inputMode="decimal" value={l.overtimeRate} error={err('overtimeRate')} onChange={(v) => patch(l, { overtimeRate: v })} />
                </div>
              )}
              {l.payBasis === 'hajri' && (
                <div className="max-w-xs">
                  <TextField label="Hajri rate (per hajri)" required prefix="₹" inputMode="decimal" value={l.hajriRate} error={err('hajriRate')} onChange={(v) => patch(l, { hajriRate: v })}
                    hint="Money for one full day unit. ½ hajri pays half; units come from the hajri slabs in labour settings." />
                </div>
              )}
              {l.payBasis === 'measurement' && <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg-muted">Paid from the measurement book. Attendance is still recorded but earns nothing by itself.</p>}
            </div>
          );
        })}
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}
