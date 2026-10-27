'use client';

import { cx } from '@/theme/tokens';
import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { LABOUR_PAY_LOOKUP_PERMS, LP, PAY_BASES } from '../../constants/labour.constants';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import type { LabourerDetail, PayBasis, PaySuggestion, PersonalRate } from '../../types/labour.types';
import { parseLabourError, placeError } from '../../utils/errors';
import { fmtDate, fmtDateTime, fullName, today } from '../../utils/format';
import { basisLabel, slabSummary } from '../../utils/pay';
import { RateCell } from '../contractors/ContractorRates';
import { FormError, Pill, primaryBtn, secondaryBtn, td, th, trCls } from '../shared/Primitives';

/**
 * The labourer's pay: the rate in effect today (personal, else the contractor's), the personal rate history and,
 * for LABOUR_CONTRACTORS_MANAGE, "Set personal rate" and "Use contractor rate".
 */
export function PayPanel({ labourer, onChanged }: { labourer: LabourerDetail; onChanged?: () => void }) {
  const { can, canAny } = useLabourAccess();
  const canSet = can(LP.CONTRACTORS);
  const canLookup = canAny(LABOUR_PAY_LOOKUP_PERMS);
  const [rates, setRates] = useState<PersonalRate[] | null>(null);
  const [current, setCurrent] = useState<PersonalRate | null>(null);
  const [suggest, setSuggest] = useState<PaySuggestion | null>(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<'set' | 'end' | null>(null);

  const load = useCallback(() => {
    setError('');
    api.listPersonalRates(labourer.id).then((r) => { setRates(r.rates || []); setCurrent(r.current); }).catch((e) => setError(messageOf(e)));
    if (canLookup) api.paySuggest({ labourerId: labourer.id }).then(setSuggest).catch(() => setSuggest(null));
  }, [labourer.id, canLookup]);
  useEffect(() => { load(); }, [load]);

  const changed = () => { setDialog(null); load(); onChanged?.(); };
  const eff = suggest?.effective || null;
  const contractorRate = suggest?.contractorRate || null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Paid today</p>
            {canLookup ? (
              eff ? (
                <div className="mt-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5"><Pill tone="dark">{basisLabel(eff.payBasis)}</Pill><Pill>{eff.source === 'personal' ? 'Personal rate' : 'Contractor rate'}</Pill></div>
                  <div className="text-sm"><RateCell r={eff} /></div>
                  {eff.payBasis === 'hajri' && suggest?.hajriSlabs?.length ? <p className="text-[11px] text-fg-muted">{slabSummary(suggest.hajriSlabs)}</p> : null}
                  <p className="text-[11px] text-fg-muted">Since {fmtDate(eff.effectiveFrom)}{eff.source === 'personal' && contractorRate ? ` · contractor rate would be ${basisLabel(contractorRate.payBasis).toLowerCase()}` : ''}</p>
                </div>
              ) : suggest ? (
                <p className="mt-1 text-sm text-fg">No rate: {labourer.contractorName || 'the contractor'} has no rate for this site and trade, so attendance earns nothing.</p>
              ) : <div className="mt-1 h-10 animate-pulse rounded-lg bg-bg-subtle" />
            ) : (
              <p className="mt-1 text-sm text-fg">{current ? 'Personal rate (below).' : 'The contractor’s rate applies.'}</p>
            )}
          </div>
          {canSet && (
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={primaryBtn} onClick={() => setDialog('set')}><SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />Set personal rate</button>
              {current && <button type="button" className={secondaryBtn} onClick={() => setDialog('end')}><RotateCcw className="h-3.5 w-3.5" aria-hidden />Use contractor rate</button>}
            </div>
          )}
        </div>
      </section>

      <FormError message={error} />
      <div>
        <h4 className="mb-2 text-sm font-bold text-fg">Personal rate history</h4>
        {!rates ? <div className="h-16 animate-pulse rounded-xl bg-bg-subtle" /> : rates.length === 0 ? (
          <p className="rounded-xl bg-bg-subtle p-3 text-xs text-fg-muted sm:text-sm">No personal rate. A skilled worker paid more than the contractor rate gets one here; nothing is overwritten, each change starts a new row.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[30rem] border-separate border-spacing-0">
              <thead><tr><th className={th}>Basis</th><th className={th}>Rates</th><th className={th}>From</th><th className={th}>To</th></tr></thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id} className={cx(trCls, r.effectiveTo ? 'text-fg-muted' : '')}>
                    <td className={td}><Pill tone={r.effectiveTo ? 'neutral' : 'dark'}>{basisLabel(r.payBasis)}</Pill>{r.note && <div className="mt-1 text-[11px] text-fg-muted">{r.note}</div>}</td>
                    <td className={`${td} tabular-nums`}><RateCell r={r} /></td>
                    <td className={td}>{fmtDate(r.effectiveFrom)}{r.createdAt && <div className="text-[11px] text-fg-muted">set {fmtDateTime(r.createdAt)}</div>}</td>
                    <td className={td}>{r.effectiveTo ? fmtDate(r.effectiveTo) : <Pill tone="good">Open</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {dialog === 'set' && <PersonalRateDialog labourer={labourer} current={current} onClose={() => setDialog(null)} onSaved={changed} />}
      {dialog === 'end' && current && <EndPersonalRateDialog labourer={labourer} current={current} onClose={() => setDialog(null)} onDone={changed} />}
    </div>
  );
}

const KNOWN = ['effectiveFrom', 'payBasis', 'dayRate', 'nightRate', 'overtimeRate', 'hajriRate', 'note'];
const s = (v: number | undefined | null) => (v ? String(v) : '');

function PersonalRateDialog({ labourer, current, onClose, onSaved }: { labourer: LabourerDetail; current: PersonalRate | null; onClose: () => void; onSaved: () => void }) {
  const [basis, setBasis] = useState<PayBasis>(current?.payBasis || 'hajri');
  const [dayRate, setDayRate] = useState(s(current?.dayRate));
  const [nightRate, setNightRate] = useState(s(current?.nightRate));
  const [overtimeRate, setOvertimeRate] = useState(s(current?.overtimeRate));
  const [hajriRate, setHajriRate] = useState(s(current?.hajriRate));
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const money = (v: string, positive: boolean) => (v.trim() === '' ? !positive : Number.isFinite(Number(v)) && (positive ? Number(v) > 0 : Number(v) >= 0));

  const save = async () => {
    const e: Record<string, string> = {};
    if (!effectiveFrom) e.effectiveFrom = 'Choose when this rate starts';
    if (basis === 'hourly') {
      if (!money(dayRate, true)) e.dayRate = 'Enter the day rate per hour (above 0)';
      if (!money(nightRate, false)) e.nightRate = 'Enter an amount, or leave it empty';
      if (!money(overtimeRate, false)) e.overtimeRate = 'Enter an amount, or leave it empty';
    }
    if (basis === 'hajri' && !money(hajriRate, true)) e.hajriRate = 'Enter the money for one hajri (above 0)';
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body = basis === 'hourly'
        ? { payBasis: basis, dayRate: Number(dayRate), nightRate: Number(nightRate || 0), overtimeRate: Number(overtimeRate || 0) }
        : basis === 'hajri' ? { payBasis: basis, hajriRate: Number(hajriRate) } : { payBasis: basis };
      const r = await api.setPersonalRate(labourer.id, { ...body, effectiveFrom, note: note.trim() || undefined });
      showSuccess(r.changed ? 'Personal rate saved' : 'Same as the current rate: nothing changed');
      onSaved();
    } catch (err) {
      const p = placeError(err, (f) => KNOWN.includes(f));
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Personal rate · ${fullName(labourer)}`} maxWidthClassName="max-w-lg"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Save rate'}</button></>}>
      <div className="space-y-4">
        <p className="text-xs text-fg-muted sm:text-sm">Pays this labourer differently from {labourer.contractorName || 'the contractor'}’s rate, wherever they work. {current ? 'The current personal rate closes the day before.' : ''}</p>
        <div>
          <FieldLabel label="Pay basis" />
          <SegmentedControl options={PAY_BASES} value={basis} onChange={(v) => { setBasis(v); setErrors({}); }} fitText />
          <p className="mt-1 text-[11px] text-fg-muted">{PAY_BASES.find((b) => b.value === basis)?.description}</p>
        </div>
        {basis === 'hourly' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Day / hour" required prefix="₹" inputMode="decimal" value={dayRate} error={errors.dayRate} onChange={(v) => { setDayRate(v); setErrors({}); }} />
            <TextField label="Night / hour" prefix="₹" inputMode="decimal" value={nightRate} error={errors.nightRate} onChange={(v) => { setNightRate(v); setErrors({}); }} />
            <TextField label="Overtime / hour" prefix="₹" inputMode="decimal" value={overtimeRate} error={errors.overtimeRate} onChange={(v) => { setOvertimeRate(v); setErrors({}); }} />
          </div>
        )}
        {basis === 'hajri' && <TextField label="Hajri rate (per hajri)" required prefix="₹" inputMode="decimal" value={hajriRate} error={errors.hajriRate} onChange={(v) => { setHajriRate(v); setErrors({}); }} />}
        {basis === 'measurement' && <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg-muted sm:text-sm">Paid from the measurement book: attendance earns nothing by itself.</p>}
        <TextField label="Effective from" type="date" required value={effectiveFrom} error={errors.effectiveFrom} onChange={(v) => { setEffectiveFrom(v); setErrors({}); }} hint="Any date, also in the past. Days from this date are paid at this rate." />
        <TextField label="Note" value={note} maxLength={255} error={errors.note} onChange={setNote} placeholder="e.g. Senior mason, agreed with the site engineer" />
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}

function EndPersonalRateDialog({ labourer, current, onClose, onDone }: { labourer: LabourerDetail; current: PersonalRate; onClose: () => void; onDone: () => void }) {
  const [from, setFrom] = useState(today());
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!from) { setError('Choose the date'); return; }
    setBusy(true);
    setFormError('');
    try {
      const r = await api.endPersonalRate(labourer.id, from);
      showSuccess(r.removed ? 'Personal rate removed' : `Contractor rate applies from ${fmtDate(from)}`);
      onDone();
    } catch (err) {
      const e = parseLabourError(err);
      if (e.field === 'effectiveFrom') setError(e.message); else setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title="Use the contractor rate?" maxWidthClassName="max-w-md"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={run}>{busy ? 'Saving…' : 'Use contractor rate'}</button></>}>
      <div className="space-y-4">
        <p className="text-xs text-fg-muted sm:text-sm">{fullName(labourer)}’s personal rate ({basisLabel(current.payBasis).toLowerCase()}, from {fmtDate(current.effectiveFrom)}) ends the day before this date. If it has not started by then it is removed.</p>
        <TextField label="Contractor rate from" type="date" required value={from} error={error} onChange={(v) => { setFrom(v); setError(''); }} />
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}
