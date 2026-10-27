'use client';

import { cx } from '@/theme/tokens';
import React, { useCallback, useEffect, useState } from 'react';
import { History, Plus, Search, X } from 'lucide-react';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { LABOUR_ILLUSTRATIONS as ILL, RATE_SOURCE_LABEL } from '../../constants/labour.constants';
import { useContractorOptions, useLabourSites } from '../../hooks/useLabourLists';
import type { Labourer, WorkItem, WorkItemOverride, WorkItemRate } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { fmtDate, fullName, money, today } from '../../utils/format';
import { LabourerPicker } from '../shared/FormBits';
import { EmptyPanel, FormError, Pill, primaryBtn, secondaryBtn, td, th, trCls } from '../shared/Primitives';

type Scope = 'any' | 'site' | 'contractor' | 'contractor_site' | 'labourer';
const SCOPES: Array<{ value: Scope; label: string }> = [
  { value: 'any', label: 'Everyone (any site, contractor)' },
  { value: 'site', label: 'A site' },
  { value: 'contractor', label: 'A contractor (all sites)' },
  { value: 'contractor_site', label: 'A contractor at a site' },
  { value: 'labourer', label: 'One labourer' },
];

/** Dated rate overrides of one work item, by scope, with history; add / end one, and look up which rate applies. */
export function RateOverridesDrawer({ item, canEdit, onClose }: { item: WorkItem | null; canEdit: boolean; onClose: () => void }) {
  return (
    <Drawer open={item !== null} onClose={onClose} title="Rate overrides" maxWidthClassName="sm:max-w-2xl">
      {item && <Body key={item.id} item={item} canEdit={canEdit} />}
    </Drawer>
  );
}

function Body({ item, canEdit }: { item: WorkItem; canEdit: boolean }) {
  const { sites } = useLabourSites();
  const contractors = useContractorOptions();
  const [history, setHistory] = useState(false);
  const [rates, setRates] = useState<WorkItemOverride[] | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [labourerNames, setLabourerNames] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    setError('');
    api.listWorkItemRates(item.id, history).then((r) => setRates(r.rates || [])).catch((e) => setError(messageOf(e)));
  }, [item.id, history]);
  useEffect(() => { load(); }, [load]);

  // Overrides carry only the labourer id: fetch the names once.
  useEffect(() => {
    const missing = [...new Set((rates || []).map((r) => r.labourerId).filter((x): x is number => !!x && !(x in labourerNames)))];
    if (!missing.length) return;
    Promise.all(missing.map((id) => api.getLabourer(id).then((l) => [id, `${fullName(l)} · ${l.code}`] as const).catch(() => [id, `Labourer #${id}`] as const)))
      .then((pairs) => setLabourerNames((n) => ({ ...n, ...Object.fromEntries(pairs) })));
  }, [rates, labourerNames]);

  const siteName = (id: number | null) => (id ? sites.find((s) => s.value === id)?.label || `Site #${id}` : '');
  const contractorName = (id: number | null) => (id ? contractors.find((c) => c.value === id)?.label || `Contractor #${id}` : '');
  const scopeOf = (r: WorkItemOverride) => {
    if (r.labourerId) return { kind: 'Labourer', text: labourerNames[r.labourerId] || `Labourer #${r.labourerId}` };
    if (r.contractorId && r.siteId) return { kind: 'Contractor at site', text: `${contractorName(r.contractorId)} @ ${siteName(r.siteId)}` };
    if (r.contractorId) return { kind: 'Contractor', text: contractorName(r.contractorId) };
    if (r.siteId) return { kind: 'Site', text: siteName(r.siteId) };
    return { kind: 'Everyone', text: 'Any site and contractor' };
  };
  const end = (r: WorkItemOverride) => setConfirm({
    title: 'End this override?',
    body: `${scopeOf(r).text}: ${money(r.rate)}. It closes yesterday, or is removed if it starts today or later. The next rule (or the default ${money(item.defaultRate)}) applies after.`,
    cta: 'End override', danger: true,
    run: async () => {
      try { const res = await api.endWorkItemRate(item.id, r.id); showSuccess(res.removed ? 'Override removed' : `Override ended on ${fmtDate(res.effectiveTo)}`); load(); } catch (e) { showError(messageOf(e)); }
    },
  });
  const unit = item.isLumpSum ? 'job' : item.unit;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-fg">{item.name}</h3>
        <p className="text-xs text-fg-muted">Default {item.defaultRate > 0 ? `${money(item.defaultRate)} per ${unit}` : 'not set'} · most specific override wins: labourer › contractor at site › contractor › site › everyone › default.</p>
      </div>

      <RateLookup item={item} sites={sites} contractors={contractors} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-fg-muted"><History className="h-3.5 w-3.5" aria-hidden />Show history<Switch label="Show override history" checked={history} onChange={setHistory} /></label>
        {canEdit && <button type="button" className={primaryBtn} onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" aria-hidden />Add override</button>}
      </div>
      <FormError message={error} />
      {!rates ? <div className="h-24 animate-pulse rounded-xl bg-bg-subtle" /> : rates.length === 0 ? (
        <EmptyPanel illustration={ILL.rates} title="No overrides" text={`Every entry gets the default rate${item.defaultRate > 0 ? ` of ${money(item.defaultRate)}` : ''}. Add an override when a site, contractor or labourer is paid differently, from a date.`} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[36rem] border-separate border-spacing-0">
            <thead><tr><th className={th}>Applies to</th><th className={`${th} text-right`}>Rate</th><th className={th}>From</th><th className={th}>To</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rates.map((r) => {
                const s = scopeOf(r);
                return (
                  <tr key={r.id} className={cx(trCls, r.effectiveTo ? 'text-fg-muted' : '')}>
                    <td className={td}><div className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{s.kind}</div><div className="font-semibold">{s.text}</div>{r.note && <div className="text-[11px] text-fg-muted">{r.note}</div>}</td>
                    <td className={`${td} text-right font-semibold tabular-nums`}>{money(r.rate)}<span className="text-[11px] font-normal text-fg-muted"> / {unit}</span></td>
                    <td className={td}>{fmtDate(r.effectiveFrom)}</td>
                    <td className={td}>{r.effectiveTo ? fmtDate(r.effectiveTo) : <Pill tone="good">Open</Pill>}</td>
                    <td className={`${td} text-right`}>{canEdit && !r.effectiveTo && <button type="button" className={secondaryBtn} aria-label="End this override" onClick={() => end(r)}><X className="h-3.5 w-3.5" aria-hidden />End</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {adding && <AddOverrideDialog item={item} sites={sites} contractors={contractors} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

type Opts = Array<{ value: number; label: string }>;

function AddOverrideDialog({ item, sites, contractors, onClose, onSaved }: { item: WorkItem; sites: Opts; contractors: Opts; onClose: () => void; onSaved: () => void }) {
  const [scope, setScope] = useState<Scope>('site');
  const [siteId, setSiteId] = useState<number | null>(null);
  const [contractorId, setContractorId] = useState<number | null>(null);
  const [labourer, setLabourer] = useState<Labourer | null>(null);
  const [rate, setRate] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const needSite = scope === 'site' || scope === 'contractor_site';
  const needContractor = scope === 'contractor' || scope === 'contractor_site';
  const clear = (k: string) => setErrors((e) => (e[k] ? { ...e, [k]: '' } : e));

  const save = async () => {
    const e: Record<string, string> = {};
    if (needSite && !siteId) e.siteId = 'Choose the site';
    if (needContractor && !contractorId) e.contractorId = 'Choose the contractor';
    if (scope === 'labourer' && !labourer) e.labourerId = 'Choose the labourer';
    const n = Number(rate);
    if (rate.trim() === '' || !Number.isFinite(n) || n <= 0) e.rate = 'Enter a rate above 0';
    if (!effectiveFrom) e.effectiveFrom = 'Choose when it starts';
    setErrors(e);
    setFormError('');
    if (Object.values(e).some(Boolean)) return;
    setBusy(true);
    try {
      const r = await api.setWorkItemRates(item.id, {
        effectiveFrom,
        rates: [{ siteId: needSite ? siteId : null, contractorId: needContractor ? contractorId : null, labourerId: scope === 'labourer' ? labourer?.id ?? null : null, rate: n, note: note.trim() || undefined }],
      });
      showSuccess(r.changed ? 'Override saved' : 'Same as the current override: nothing changed');
      onSaved();
    } catch (err) {
      const p = placeError(err, (f) => ['siteId', 'contractorId', 'labourerId', 'rate', 'effectiveFrom', 'note'].includes(f));
      setErrors(p.fields);
      setFormError(p.form);
    } finally {
      setBusy(false);
    }
  };

  const unit = item.isLumpSum ? 'job' : item.unit;
  return (
    <Dialog open onClose={onClose} title={`Override · ${item.name}`} maxWidthClassName="max-w-lg"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Save override'}</button></>}>
      <div className="space-y-4">
        <SelectField<Scope> label="Applies to" required value={scope} options={SCOPES} onChange={(v) => { setScope(v || 'any'); setErrors({}); }} />
        {needContractor && <SelectField label="Contractor" required numeric value={contractorId} options={contractors} error={errors.contractorId} onChange={(v) => { setContractorId(v); clear('contractorId'); }} />}
        {needSite && <SelectField label="Site" required numeric value={siteId} options={sites} error={errors.siteId} onChange={(v) => { setSiteId(v); clear('siteId'); }} />}
        {scope === 'labourer' && <LabourerPicker value={labourer} onChange={(l) => { setLabourer(l); clear('labourerId'); }} error={errors.labourerId} hint="Applies wherever this labourer works." />}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={`Rate per ${unit}`} required prefix="₹" inputMode="decimal" value={rate} error={errors.rate} onChange={(v) => { setRate(v); clear('rate'); }} />
          <TextField label="Effective from" type="date" required value={effectiveFrom} error={errors.effectiveFrom} onChange={(v) => { setEffectiveFrom(v); clear('effectiveFrom'); }} hint="An open override of the same scope closes the day before." />
        </div>
        <TextField label="Note" maxLength={255} value={note} error={errors.note} onChange={setNote} placeholder="e.g. Rate agreed for the tower B pour" />
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}

/** "What rate applies": the rate an entry would get for a date, site, contractor and labourer. */
function RateLookup({ item, sites, contractors }: { item: WorkItem; sites: Opts; contractors: Opts }) {
  const [date, setDate] = useState(today());
  const [siteId, setSiteId] = useState<number | null>(null);
  const [contractorId, setContractorId] = useState<number | null>(null);
  const [labourer, setLabourer] = useState<Labourer | null>(null);
  const [result, setResult] = useState<WorkItemRate | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setError('');
    try { setResult(await api.workItemRate(item.id, { date, siteId, contractorId, labourerId: labourer?.id ?? null })); } catch (e) { setResult(null); setError(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <details className="rounded-xl border border-line p-3">
      <summary className="cursor-pointer text-sm font-bold text-fg">What rate applies?</summary>
      <div className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Date" type="date" value={date} onChange={setDate} />
          <SelectField label="Site" numeric value={siteId} options={sites} placeholder="Any site" onChange={setSiteId} />
          <SelectField label="Contractor" numeric value={contractorId} options={contractors} placeholder="Any contractor" onChange={setContractorId} />
          <LabourerPicker value={labourer} onChange={setLabourer} required={false} label="Labourer (optional)" />
        </div>
        <button type="button" className={secondaryBtn} disabled={busy} onClick={run}><Search className="h-3.5 w-3.5" aria-hidden />{busy ? 'Looking up…' : 'Look up'}</button>
        <FormError message={error} />
        {result && (
          <p className="rounded-lg bg-bg-subtle px-3 py-2 text-sm">
            <span className="font-bold text-fg">{result.rate > 0 ? `${money(result.rate)} per ${result.unit}` : 'No rate (enter it on the entry)'}</span>
            <span className="text-fg-muted"> · {RATE_SOURCE_LABEL[result.source] || result.source}{result.effectiveFrom ? `, from ${fmtDate(result.effectiveFrom)}` : ''}{result.effectiveTo ? ` to ${fmtDate(result.effectiveTo)}` : ''}</span>
          </p>
        )}
      </div>
    </details>
  );
}
