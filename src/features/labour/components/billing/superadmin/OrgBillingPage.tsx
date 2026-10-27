'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../../api/labour.api';
import { Block, FormError, PageHeader, SearchBox, Tabs } from '../../shared/Primitives';
import { AdjustmentsPanel } from './AdjustmentsPanel';
import { InvoicesPanel } from './InvoicesPanel';
import { PlanPanel } from './PlanPanel';
import { UsagePanel } from '../UsagePanel';

interface OrgRow { id: number; organization_name: string; email?: string; status?: string }

/** Superadmin entry: choose an organization to manage its labour billing. */
export function LabourBillingOrgList() {
  const [orgs, setOrgs] = useState<OrgRow[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { apiClient<OrgRow[]>('/superadmin/organizations', { withAuth: true }).then(setOrgs).catch((e) => setError(messageOf(e))); }, []);
  const shown = useMemo(() => (orgs || []).filter((o) => `${o.organization_name} ${o.email || ''}`.toLowerCase().includes(q.trim().toLowerCase())), [orgs, q]);
  return (
    <div className="space-y-3 p-4 sm:p-6">
      <PageHeader title="Labour billing" description="Pick an organization to manage its plan, invoices and adjustments." />
      <SearchBox value={q} onChange={setQ} placeholder="Search organizations…" />
      <FormError message={error} />
      {!orgs && !error ? <Block className="h-40 rounded-xl" /> : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {shown.length === 0 && <li className="p-6 text-center text-sm text-fg-muted">No organizations found.</li>}
          {shown.map((o) => (
            <li key={o.id}><Link href={`/superadmin/labour-billing/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-subtle"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-fg">{o.organization_name}</span><span className="block truncate text-xs text-fg-muted">{o.email}{o.status ? ` · ${o.status}` : ''}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden /></Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Tab = 'usage' | 'plan' | 'invoices' | 'adjustments';

export function LabourBillingOrgPage({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<Tab>('usage');
  const [name, setName] = useState('');
  useEffect(() => { apiClient<{ organization_name?: string }>(`/superadmin/organizations/${orgId}`, { withAuth: true }).then((o) => setName(o.organization_name || '')).catch(() => {}); }, [orgId]);
  return (
    <div className="space-y-3 p-4 sm:p-6">
      <Link href="/superadmin/labour-billing" className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" aria-hidden />All organizations</Link>
      <PageHeader title={name || `Organization ${orgId}`} description="Labour billing" />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'usage', label: 'Usage' }, { value: 'plan', label: 'Plan' }, { value: 'invoices', label: 'Invoices' }, { value: 'adjustments', label: 'Adjustments' }]} />
      {tab === 'usage' && <UsagePanel load={(m) => api.saUsage(orgId, m)} />}
      {tab === 'plan' && <PlanPanel orgId={orgId} />}
      {tab === 'invoices' && <InvoicesPanel orgId={orgId} />}
      {tab === 'adjustments' && <AdjustmentsPanel orgId={orgId} />}
    </div>
  );
}
