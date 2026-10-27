'use client';

import { LABOUR_ILLUSTRATIONS as ILL } from '../../constants/labour.constants';
import React, { useEffect, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Fact } from '@/features/expense-bills/components/Primitives';
import { messageOf } from '@/lib/api/errors';
import { asList } from '../../api/labour.api';
import type { Invoice } from '../../types/labour.types';
import { fmtDate, fmtDateTime, money, titleCase } from '../../utils/format';
import { EmptyPanel, Block, FormError, Pill, td, th, trCls, trClickCls } from '../shared/Primitives';

export const invoiceNo = (i: Invoice) => i.number || i.invoiceNo || `#${i.id}`;
export const invoicePeriod = (i: Invoice) => i.month || (i.periodStart ? `${fmtDate(i.periodStart)}${i.periodEnd ? ` – ${fmtDate(i.periodEnd)}` : ''}` : '—');
export const statusTone = (s?: string) => (s === 'paid' ? 'good' : s === 'void' ? 'bad' : s === 'issued' ? 'dark' : 'neutral') as 'good' | 'bad' | 'dark' | 'neutral';
export const unwrapInvoice = (raw: Invoice | { invoice: Invoice }): Invoice => ('invoice' in raw && raw.invoice ? raw.invoice : (raw as Invoice));
export const invoiceRows = (raw: unknown) => asList<Invoice>(raw, 'invoices');

export function InvoiceTable({ rows, onOpen, actions }: { rows: Invoice[]; onOpen: (i: Invoice) => void; actions?: (i: Invoice) => React.ReactNode }) {
  if (!rows.length) return <EmptyPanel illustration={ILL.invoices} title="No invoices yet" text="Invoices appear here once a month is billed." />;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[34rem] border-separate border-spacing-0">
        <thead><tr><th className={th}>Invoice</th><th className={th}>Period</th><th className={th}>Status</th><th className={`${th} text-right`}>Total</th>{actions && <th className={th}><span className="sr-only">Actions</span></th>}</tr></thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id} tabIndex={0} onClick={() => onOpen(i)} onKeyDown={(e) => e.key === 'Enter' && onOpen(i)} className={trClickCls}>
              <td className={`${td} font-semibold`}>{invoiceNo(i)}</td>
              <td className={td}>{invoicePeriod(i)}</td>
              <td className={td}><Pill tone={statusTone(i.status)}>{titleCase(i.status || 'draft')}</Pill></td>
              <td className={`${td} text-right tabular-nums`}>{money(i.total)}</td>
              {actions && <td className={td} onClick={(e) => e.stopPropagation()}>{actions(i)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InvoiceDrawer({ id, load, onClose }: { id: number | null; load: (id: number) => Promise<Invoice | { invoice: Invoice }>; onClose: () => void }) {
  const [inv, setInv] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setInv(null); setError('');
    if (id === null) return;
    load(id).then((r) => setInv(unwrapInvoice(r))).catch((e) => setError(messageOf(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const lines = inv?.lines?.length ? inv.lines : inv?.windows?.flatMap((w) => w.lines) || [];
  return (
    <Drawer open={id !== null} onClose={onClose} title="Invoice" maxWidthClassName="sm:max-w-xl">
      <FormError message={error} />
      {!inv && !error && <Block className="h-40 rounded-xl" />}
      {inv && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2"><h3 className="text-base font-bold text-fg">{invoiceNo(inv)}</h3><Pill tone={statusTone(inv.status)}>{titleCase(inv.status || 'draft')}</Pill></div>
          <dl className="grid grid-cols-2 gap-3">
            <Fact label="Period" value={invoicePeriod(inv)} />
            <Fact label="Issued" value={fmtDateTime(inv.issuedAt)} />
            <Fact label="Paid" value={inv.paidAt ? fmtDateTime(inv.paidAt) : '—'} />
            <Fact label="Payment reference" value={inv.paymentRef || '—'} />
          </dl>
          {lines.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[26rem] border-separate border-spacing-0">
                <thead><tr><th className={th}>Item</th><th className={`${th} text-right`}>Qty</th><th className={`${th} text-right`}>Rate</th><th className={`${th} text-right`}>Amount</th></tr></thead>
                <tbody>{lines.map((l, i) => <tr key={i} className={trCls}><td className={td}>{l.label || l.meter}</td><td className={`${td} text-right tabular-nums`}>{l.quantity}</td><td className={`${td} text-right tabular-nums`}>{money(l.rate)}</td><td className={`${td} text-right tabular-nums`}>{money(l.amount)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          <dl className="ml-auto grid max-w-xs grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-fg-muted">Subtotal</dt><dd className="text-right tabular-nums">{money(inv.subtotal)}</dd>
            <dt className="text-fg-muted">GST</dt><dd className="text-right tabular-nums">{money(inv.gst)}</dd>
            <dt className="font-bold">Total</dt><dd className="text-right font-extrabold tabular-nums">{money(inv.total)}</dd>
          </dl>
        </div>
      )}
    </Drawer>
  );
}
