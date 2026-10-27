'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, FilePlus2, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { Textarea } from '@/components/ui/Textarea';
import { Fact } from '@/features/expense-bills/components/Primitives';
import type { FilterOption } from '@/components/ui/SearchableFilterDropdown';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../api/labour.api';
import { LP } from '../../constants/labour.constants';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import type { Opt } from '../../hooks/useLabourLists';
import type { MeasurementDetail, WorkItem } from '../../types/labour.types';
import { placeError } from '../../utils/errors';
import { fmtDate, fmtDateTime, money } from '../../utils/format';
import { qty } from '../../utils/pay';
import { FormError, Pill, primaryBtn, secondaryBtn } from '../shared/Primitives';
import { CorrectionForm } from './CorrectionForm';
import { EntryForm } from './EntryForm';
import { MeasStatusPill, QtyRate, whoLabel } from './MeasBits';

export type EntryDrawerTarget = { mode: 'new' } | { mode: 'view'; id: number } | { mode: 'correct'; original: MeasurementDetail };

interface Props {
  target: EntryDrawerTarget | null;
  onClose: () => void;
  onTarget: (t: EntryDrawerTarget) => void;
  onChanged: () => void;
  sites: FilterOption[];
  contractors: Opt[];
  workItems: WorkItem[];
}

export function EntryDrawer({ target, onClose, onTarget, onChanged, sites, contractors, workItems }: Props) {
  const title = !target ? '' : target.mode === 'new' ? 'Add measurement' : target.mode === 'correct' ? 'Add correction' : 'Measurement';
  const key = !target ? 'none' : target.mode === 'view' ? `v${target.id}` : target.mode === 'correct' ? `c${target.original.id}` : 'new';
  return (
    <Drawer open={target !== null} onClose={onClose} title={title} maxWidthClassName="sm:max-w-2xl">
      {target?.mode === 'new' && (
        <EntryForm key={key} entry={null} sites={sites} contractors={contractors} workItems={workItems}
          onSaved={(m) => { onChanged(); onTarget({ mode: 'view', id: m.id }); }} onCancel={onClose} />
      )}
      {target?.mode === 'correct' && (
        <CorrectionForm key={key} original={target.original} current={null} onSaved={(m) => { onChanged(); onTarget({ mode: 'view', id: m.id }); }} onCancel={() => onTarget({ mode: 'view', id: target.original.id })} />
      )}
      {target?.mode === 'view' && <View key={key} id={target.id} onTarget={onTarget} onChanged={onChanged} onClose={onClose} sites={sites} contractors={contractors} workItems={workItems} />}
    </Drawer>
  );
}

function View({ id, onTarget, onChanged, onClose, sites, contractors, workItems }: { id: number } & Omit<Props, 'target'>) {
  const { can } = useLabourAccess();
  const canManage = can(LP.MEAS_MANAGE);
  const canApprove = can(LP.MEAS_APPROVE);
  const [m, setM] = useState<MeasurementDetail | null>(null);
  const [original, setOriginal] = useState<MeasurementDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(() => {
    setError('');
    api.getMeasurement(id).then((r) => {
      setM(r);
      // A correction is edited against its original (its net and frozen rate).
      if (r.adjustsId) api.getMeasurement(r.adjustsId).then(setOriginal).catch(() => setOriginal(null));
    }).catch((e) => setError(messageOf(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return <FormError message={error} />;
  if (!m) return <div className="h-48 animate-pulse rounded-xl bg-bg-subtle" />;

  const open = m.status === 'draft' || m.status === 'submitted';
  const refresh = () => { load(); onChanged(); };
  const approve = async () => {
    setBusy(true);
    try { await api.approveMeasurement(m.id); showSuccess('Entry approved'); refresh(); } catch (e) { showError(messageOf(e)); } finally { setBusy(false); }
  };
  const approverBar = canApprove && open ? (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-bg-subtle/60 p-3">
      <p className="text-xs text-fg-muted sm:text-sm">{m.status === 'submitted' ? 'Waiting for approval.' : 'Still a draft; you can approve it directly.'} Approved entries are frozen and paid.</p>
      <div className="flex gap-1.5">
        <button type="button" className={secondaryBtn} onClick={() => setRejecting(true)}><X className="h-3.5 w-3.5" aria-hidden />Reject</button>
        <button type="button" className={primaryBtn} disabled={busy} onClick={approve}><Check className="h-3.5 w-3.5" aria-hidden />Approve</button>
      </div>
    </div>
  ) : null;

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="truncate text-base font-bold text-fg">{m.workItemName || `Item #${m.workItemId}`}</h3>
        <p className="text-xs text-fg-muted">Entry #{m.id} · {fmtDate(m.workDate)} · {whoLabel(m)}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">{m.adjustsId && <Pill>Correction of #{m.adjustsId}</Pill>}<MeasStatusPill s={m.status} /></div>
    </div>
  );

  // Draft / submitted: editable for whoever manages measurements.
  if (open && canManage) {
    return (
      <div className="space-y-4">
        {header}
        {approverBar}
        {m.adjustsId ? (
          original ? <CorrectionForm original={original} current={m} onSaved={refresh} onCancel={onClose} onDeleted={() => { onChanged(); onClose(); }} />
            : <div className="h-32 animate-pulse rounded-xl bg-bg-subtle" />
        ) : (
          <EntryForm entry={m} sites={sites} contractors={contractors} workItems={workItems} onSaved={refresh} onCancel={onClose} onDeleted={() => { onChanged(); onClose(); }} />
        )}
        {rejecting && <RejectDialog id={m.id} onClose={() => setRejecting(false)} onDone={() => { setRejecting(false); refresh(); }} />}
      </div>
    );
  }

  const openSheet = async () => { try { window.open((await api.measurementSheetLink(m.id)).url, '_blank', 'noopener'); } catch (e) { showError(messageOf(e)); } };
  return (
    <div className="space-y-4">
      {header}
      {approverBar}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Fact label="Site" value={m.siteName || '—'} />
        <Fact label="Contractor" value={m.contractorName || '—'} />
        <Fact label="Labourer" value={whoLabel(m)} />
        <Fact label="Quantity × rate" value={<QtyRate m={m} />} />
        <Fact label="Amount" value={<span className={m.amount < 0 ? 'text-[var(--tt-danger)]' : ''}>{money(m.amount)}</span>} />
        <Fact label="Entered" value={<>{m.enteredByName || '—'}<span className="block text-[11px] font-normal text-fg-muted">{fmtDateTime(m.createdAt)}</span></>} />
        {m.rateOverridden && <Fact wide label="Why the rate was changed" value={m.rateReason || '—'} />}
        {m.adjustReason && <Fact wide label="Correction reason" value={m.adjustReason} />}
        {m.description && <Fact wide label="Description" value={m.description} />}
        {m.submittedAt && <Fact label="Submitted" value={fmtDateTime(m.submittedAt)} />}
        {m.approvedAt && <Fact label={m.status === 'rejected' ? 'Rejected' : 'Approved'} value={<>{m.approvedByName || '—'}<span className="block text-[11px] font-normal text-fg-muted">{fmtDateTime(m.approvedAt)}</span></>} />}
        {m.rejectReason && <Fact wide label="Reject reason" value={m.rejectReason} />}
      </dl>
      {m.hasAttachment && <button type="button" className={secondaryBtn} onClick={openSheet}><ExternalLink className="h-3.5 w-3.5" aria-hidden />Measurement sheet{m.attachment?.name ? ` · ${m.attachment.name}` : ''}</button>}
      {m.status === 'rejected' && <p className="rounded-xl bg-bg-subtle p-3 text-xs text-fg-muted sm:text-sm">Rejected entries are final. Enter the work again if it should be paid.</p>}

      {m.status === 'approved' && !m.adjustsId && (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-fg">Corrections</h4>
            {canManage && <button type="button" className={secondaryBtn} onClick={() => onTarget({ mode: 'correct', original: m })}><FilePlus2 className="h-3.5 w-3.5" aria-hidden />Add correction</button>}
          </div>
          {m.adjustments.length === 0 ? (
            <p className="text-xs text-fg-muted sm:text-sm">None. Approved entries never change; a mistake is fixed with a correction (more or less quantity or money), dated when it is made and approved like any entry.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {m.adjustments.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => onTarget({ mode: 'view', id: a.id })} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-bg-subtle">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-fg">#{a.id} · {fmtDate(a.workDate)} · {a.isLumpSum ? 'Lump sum' : `${a.quantity > 0 ? '+' : ''}${qty(a.quantity)} ${a.unit}`}</span>
                      <span className="block truncate text-[11px] text-fg-muted">{a.adjustReason || '—'}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2"><span className={`text-sm font-bold tabular-nums ${a.amount < 0 ? 'text-[var(--tt-danger)]' : ''}`}>{money(a.amount)}</span><MeasStatusPill s={a.status} /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {m.net && (
            <div className="flex items-center justify-between rounded-xl bg-bg-subtle px-3 py-2.5 text-sm">
              <span className="font-semibold text-fg-muted">Net (entry + corrections not rejected)</span>
              <span className="font-bold tabular-nums text-fg">{m.isLumpSum ? '' : `${qty(m.net.quantity)} ${m.unit} · `}{money(m.net.amount)}</span>
            </div>
          )}
        </section>
      )}
      {rejecting && <RejectDialog id={m.id} onClose={() => setRejecting(false)} onDone={() => { setRejecting(false); refresh(); }} />}
    </div>
  );
}

function RejectDialog({ id, onClose, onDone }: { id: number; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (reason.trim().length < 3) { setError('Write why (at least 3 characters)'); return; }
    setBusy(true);
    setFormError('');
    try { await api.rejectMeasurement(id, reason.trim()); showSuccess('Entry rejected'); onDone(); } catch (err) {
      const p = placeError(err, (f) => f === 'reason');
      setError(p.fields.reason || '');
      setFormError(p.form);
    } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title="Reject this entry?" maxWidthClassName="max-w-md"
      footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={run}>{busy ? 'Rejecting…' : 'Reject'}</button></>}>
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">Rejected is final: the entry is not paid and cannot be edited. It can be entered again.</p>
        <Textarea label="Reason" required value={reason} error={error} maxLength={255} onChange={(e) => { setReason(e.target.value); setError(''); }} />
        <FormError message={formError} />
      </div>
    </Dialog>
  );
}
