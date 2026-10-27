'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { TextField } from '@/components/ui/FormControls';
import { showError, showSuccess } from '@/lib/toast';
import * as api from '../../../api/labour.api';
import type { Invoice } from '../../../types/labour.types';
import { parseLabourError } from '../../../utils/errors';
import { thisMonth } from '../../../utils/format';
import { Block, FilterSelect, FormError, primaryBtn, secondaryBtn } from '../../shared/Primitives';
import { InvoiceDrawer, InvoiceTable, invoiceNo, invoiceRows } from '../InvoiceViews';

export function InvoicesPanel({ orgId }: { orgId: string }) {
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<Invoice[] | null>(null);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(thisMonth());
  const [monthError, setMonthError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [pay, setPay] = useState<Invoice | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const load = useCallback(() => { api.saInvoices(orgId, status || undefined).then((r) => { setRows(invoiceRows(r)); setError(''); }).catch((e) => setError(parseLabourError(e).message)); }, [orgId, status]);
  useEffect(() => { load(); }, [load]);

  const draft = async () => {
    setBusy(true); setMonthError('');
    try { await api.saDraftInvoice(orgId, month); showSuccess('Draft created'); load(); } catch (e) { setMonthError(parseLabourError(e).message); } finally { setBusy(false); }
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
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-2"><div className="w-44"><TextField label="Month" type="month" value={month} error={monthError} onChange={(v) => { setMonth(v); setMonthError(''); }} /></div><button type="button" disabled={busy} className={`${primaryBtn} mb-0 self-start sm:mt-[1.65rem]`} onClick={draft}>{busy ? 'Creating…' : 'Create draft'}</button></div>
        <FilterSelect label="Status" value={status} onChange={setStatus} anyLabel="Any status" options={['draft', 'issued', 'paid', 'void'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
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
