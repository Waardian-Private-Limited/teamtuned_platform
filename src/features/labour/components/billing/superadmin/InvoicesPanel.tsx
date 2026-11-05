'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { TextField } from '@/components/ui/FormControls';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../../api/labour.api';
import type { Invoice } from '../../../types/labour.types';
import { parseLabourError } from '../../../utils/errors';
import { Block, DateFilter, FilterSelect, FormError, primaryBtn, secondaryBtn } from '../../shared/Primitives';
import { PeriodPicker, monthPeriod, periodParams, periodProblem, type Period } from '../PeriodPicker';
import { InvoiceDrawer, InvoiceTable, invoiceNo, invoiceRows } from '../InvoiceViews';

export function InvoicesPanel({ orgId }: { orgId: string }) {
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<Invoice[] | null>(null);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>(() => monthPeriod(-1));
  const [periodError, setPeriodError] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [pay, setPay] = useState<Invoice | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const load = useCallback(() => { api.saInvoices(orgId, status || undefined, { from: range.from || undefined, to: range.to || undefined }).then((r) => { setRows(invoiceRows(r)); setError(''); }).catch((e) => setError(parseLabourError(e).message)); }, [orgId, status, range]);
  useEffect(() => { load(); }, [load]);

  const draft = async () => {
    const problem = periodProblem(period);
    if (problem) { setPeriodError(problem); return; }
    setBusy(true); setPeriodError('');
    try { await api.saDraftInvoice(orgId, periodParams(period)); showSuccess('Draft created'); load(); } catch (e) { setPeriodError(parseLabourError(e).message); } finally { setBusy(false); }
  };
  const act = (i: Invoice, action: 'issue' | 'void') => setConfirm({
    title: `${action === 'issue' ? 'Issue' : 'Void'} ${invoiceNo(i)}?`,
    body: action === 'issue' ? 'The organization will see this invoice and it counts as outstanding.' : 'The invoice is cancelled and no longer counts as outstanding.',
    cta: action === 'issue' ? 'Issue invoice' : 'Void invoice', danger: action === 'void',
    run: async () => { try { await api.saInvoiceAction(orgId, i.id, action); showSuccess(action === 'issue' ? 'Invoice issued' : 'Invoice voided'); load(); } catch (e) { showError(parseLabourError(e).message); throw e; } },
  });

  const actions = (i: Invoice) => (
    <div className="flex flex-wrap justify-end gap-1.5">
      {(i.status === 'draft' || !i.status) && <button type="button" className={secondaryBtn} onClick={() => act(i, 'issue')}>Issue</button>}
      {i.status === 'issued' && <button type="button" className={secondaryBtn} onClick={() => setPay(i)}>Mark paid</button>}
      {i.status !== 'void' && <button type="button" className={secondaryBtn} onClick={() => act(i, 'void')}>Void</button>}
    </div>
  );

  return (
    <div className="space-y-3">
      <section className="space-y-2 rounded-xl border border-line bg-surface p-3">
        <h2 className="text-sm font-bold text-fg">Raise an invoice</h2>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <PeriodPicker value={period} onChange={(p) => { setPeriod(p); setPeriodError(''); }} />
          <button type="button" disabled={busy} className={primaryBtn} onClick={draft}>{busy ? 'Creating…' : 'Create draft'}</button>
        </div>
        <FormError message={periodError} />
        <p className="text-[11px] text-fg-muted">A whole month or any dates that have ended. Drafts that overlap it are replaced; days already on an issued invoice cannot be billed again. Monthly charges are pro-rated for part of a month.</p>
      </section>
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 md:flex-row md:flex-wrap md:items-center">
        <FilterSelect label="Status" value={status} onChange={setStatus} anyLabel="Any status" options={['draft', 'issued', 'paid', 'void'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
        <DateFilter label="Covering from" value={range.from} onChange={(from) => setRange((r) => ({ ...r, from }))} />
        <DateFilter label="To" value={range.to} onChange={(to) => setRange((r) => ({ ...r, to }))} />
      </div>
      <FormError message={error} />
      {!rows && !error ? <Block className="h-32 rounded-xl" /> : rows && <InvoiceTable rows={rows} onOpen={(i) => setOpenId(i.id)} actions={actions} />}
      <InvoiceDrawer id={openId} load={(id) => api.saInvoice(orgId, id)} onClose={() => setOpenId(null)} />
      {pay && <PayDialog orgId={orgId} invoice={pay} onClose={() => setPay(null)} onDone={() => { setPay(null); load(); }} />}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function PayDialog({ orgId, invoice, onClose, onDone }: { orgId: string; invoice: Invoice; onClose: () => void; onDone: () => void }) {
  const [ref, setRef] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!ref.trim()) { setError('Enter the payment reference'); return; }
    setBusy(true);
    try { await api.saInvoiceAction(orgId, invoice.id, 'pay', { paymentRef: ref.trim() }); showSuccess('Marked as paid'); onDone(); } catch (e) { setError(parseLabourError(e).message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={`Mark ${invoiceNo(invoice)} paid`} footer={<><button type="button" className={secondaryBtn} onClick={onClose}>Cancel</button><button type="button" disabled={busy} className={primaryBtn} onClick={save}>{busy ? 'Saving…' : 'Mark paid'}</button></>}>
      <TextField label="Payment reference" required value={ref} error={error} onChange={(v) => { setRef(v); setError(''); }} hint="Bank transaction or cheque number." />
    </Dialog>
  );
}
