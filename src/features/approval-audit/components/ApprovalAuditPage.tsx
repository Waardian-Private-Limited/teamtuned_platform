'use client';

import React from 'react';
import { RequestDrawer } from '@/features/approvals/components/RequestDrawer';
import { useApprovalAudit } from '../hooks/useApprovalAudit';
import { AuditFilterBar } from './AuditFilterBar';
import { AuditKpis } from './AuditKpis';
import { AuditTrend } from './AuditTrend';
import { ApproverTable } from './ApproverTable';
import { BacklogPanel } from './BacklogPanel';
import { GroupTable } from './GroupTable';
import type { GroupDim } from './GroupTable';
import { PendingList } from './PendingList';
import { rangeText } from '../utils/format';

/**
 * Approval audit: how many requests were raised and how they ended, how long decisions take,
 * and what is still waiting, for every request type, by site, department and approver. Site
 * in-charges see the workforce requests of their own sites; org admins and HR mode see all.
 */
export function ApprovalAuditPage() {
  const a = useApprovalAudit();
  const [openId, setOpenId] = React.useState<number | null>(null);
  const pendingRef = React.useRef<HTMLDivElement>(null);
  const d = a.audit;
  const loading = a.loading && !d;

  const showPending = (narrow: Parameters<typeof a.narrowTo>[0]) => {
    a.narrowTo(narrow);
    pendingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pick = (dim: GroupDim, id: string | number) => {
    if (dim === 'type') a.update({ requestType: String(id) });
    else if (dim === 'site') a.update({ siteId: Number(id) });
    else a.update({ departmentId: Number(id) });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-fg sm:text-2xl">Approval audit</h1>
          <p className="text-sm text-fg-muted">{d ? `${rangeText(d.from, d.to)} · turnaround, outcomes and backlog` : 'Turnaround, outcomes and backlog'}</p>
        </div>
      </header>

      <AuditFilterBar filters={a.filters} options={a.options} types={d?.types ?? []} onChange={a.update} onPreset={a.setPreset} onReset={a.reset} narrowed={a.narrowed} />
      {a.error && <p className="text-sm text-[var(--tt-danger)]">{a.error}</p>}

      <div className={a.loading && d ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
        <div className="flex flex-col gap-4">
          <AuditKpis totals={d?.totals ?? null} backlog={d?.backlog ?? null} loading={loading}
            onPending={() => showPending(null)} onOverdue={() => showPending({ overdue: true, label: 'Past due' })} />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <AuditTrend trend={d?.trend ?? null} loading={loading} />
            <BacklogPanel backlog={d?.backlog ?? null} loading={loading} active={a.narrow?.aging ?? null} onAging={(k, label) => showPending({ aging: k, label })} />
          </div>

          <GroupTable groups={d ? { type: d.by_type, site: d.by_site, department: d.by_department } : null} overall={d?.totals.turnaround ?? null} loading={loading} onPick={pick} />

          <ApproverTable approvers={d?.by_approver ?? null} overall={d?.totals.turnaround ?? null} loading={loading} active={a.narrow?.approver ?? null}
            onPick={(r) => showPending({ approver: r.key, label: `Waiting on ${r.name}` })} />
        </div>
      </div>

      <div ref={pendingRef} className="scroll-mt-4">
        <PendingList data={a.pending} loading={a.loadingPending} error={a.pendingError} narrow={a.narrow} onClearNarrow={() => a.narrowTo(null)}
          page={a.page} pageSize={a.pageSize} onPage={a.setPage} onPageSize={a.setPageSize} onOpen={setOpenId} />
      </div>

      <RequestDrawer id={openId} onClose={() => setOpenId(null)} onChanged={a.reload} />
    </div>
  );
}
