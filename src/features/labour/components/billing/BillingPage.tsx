'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/labour.api';
import { LP } from '../../constants/labour.constants';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import type { Invoice } from '../../types/labour.types';
import { Block, FormError, Gate, PageHeader, Tabs } from '../shared/Primitives';
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
  const load = useCallback(() => { api.listInvoices({ pageSize: 100 }).then((r) => { setInvoices(invoiceRows(r)); setError(''); }).catch((e) => setError(messageOf(e))); }, []);
  useEffect(() => { if (tab === 'invoices' && !invoices) load(); }, [tab, invoices, load]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Labour billing" description="What this month’s labour attendance costs, and your invoices." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'usage', label: 'This month' }, { value: 'invoices', label: 'Invoices' }]} />
      {tab === 'usage' ? <UsagePanel load={api.getUsage} outstandingNote /> : (
        <>
          <FormError message={error} />
          {!invoices && !error ? <Block className="h-40 rounded-xl" /> : invoices && <InvoiceTable rows={invoices} onOpen={(i) => setOpenId(i.id)} />}
          <InvoiceDrawer id={openId} load={api.getInvoice} onClose={() => setOpenId(null)} />
        </>
      )}
    </div>
  );
}
