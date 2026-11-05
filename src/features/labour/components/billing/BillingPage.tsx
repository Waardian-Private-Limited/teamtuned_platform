'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/labour.api';
import { LP } from '../../constants/labour.constants';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import type { Invoice } from '../../types/labour.types';
import { Block, DateFilter, FormError, Gate, PageHeader, Tabs } from '../shared/Primitives';
import { InvoiceDrawer, InvoiceTable, invoiceRows } from './InvoiceViews';
import { UsagePanel } from './UsagePanel';

export function BillingPage() {
  const { enabled, can } = useLabourAccess();
  return <Gate enabled={enabled} allowed={can(LP.BILLING)} what="labour billing"><Billing /></Gate>;
}

function Billing() {
  const [tab, setTab] = useState<'usage' | 'invoices'>('usage');
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [range, setRange] = useState({ from: '', to: '' });
  const load = useCallback(() => { api.listInvoices({ pageSize: 100, from: range.from || undefined, to: range.to || undefined }).then((r) => { setInvoices(invoiceRows(r)); setError(''); }).catch((e) => setError(messageOf(e))); }, [range]);
  useEffect(() => { if (tab === 'invoices') load(); }, [tab, load]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Labour billing" description="What labour attendance costs for any month or dates, and your invoices." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'usage', label: 'Usage' }, { value: 'invoices', label: 'Invoices' }]} />
      {tab === 'usage' ? <UsagePanel load={api.getUsage} outstandingNote /> : (
        <>
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
            <DateFilter label="Covering from" value={range.from} onChange={(from) => setRange((r) => ({ ...r, from }))} />
            <DateFilter label="To" value={range.to} onChange={(to) => setRange((r) => ({ ...r, to }))} />
          </div>
          <FormError message={error} />
          {!invoices && !error ? <Block className="h-40 rounded-xl" /> : invoices && <InvoiceTable rows={invoices} onOpen={(i) => setOpenId(i.id)} />}
          <InvoiceDrawer id={openId} load={api.getInvoice} onClose={() => setOpenId(null)} />
        </>
      )}
    </div>
  );
}
