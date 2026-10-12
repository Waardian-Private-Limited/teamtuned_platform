'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/features/detailed-attendance/components/components/controls';
import { useLeaveOverview } from '../hooks/useLeaveOverview';
import { useLeaveRequests } from '../hooks/useLeaveRequests';
import { ApplyLeaveDialog } from './ApplyLeaveDialog';
import { BalanceCards } from './BalanceCards';
import { EarnedCard } from './EarnedCard';
import { BalanceSkeleton, SectionCard } from './LeaveParts';
import { LeaveRequestDrawer } from './LeaveRequestDrawer';
import { PolicyPanel } from './PolicyPanel';
import { RequestsPanel } from './RequestsPanel';

/**
 * The signed-in employee's own leave: what is left of each type (and what expires when), comp-off and
 * overtime earned, the rules of their policy, and their requests with where each stands. Applying is
 * checked live against the policy by the server. The page only ever asks the "me" endpoints.
 */
export function MyLeavePage() {
  const [version, setVersion] = React.useState(0);
  const [applyFor, setApplyFor] = React.useState<number | null | undefined>(undefined);
  const [openId, setOpenId] = React.useState<number | null>(null);
  const overview = useLeaveOverview(version);
  const list = useLeaveRequests(version);
  const o = overview.data;
  const refresh = () => setVersion((v) => v + 1);
  const canApply = !!o && o.types.some((t) => !t.locked);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-fg sm:text-2xl">My leave</h1>
          <p className="text-sm text-fg-muted">{o ? (o.pending ? `${o.pending} ${o.pending === 1 ? 'request is' : 'requests are'} waiting for approval` : 'Your balances, policy and requests') : ' '}</p>
        </div>
        <Button onClick={() => setApplyFor(null)} disabled={!canApply} className="w-full sm:w-auto">
          <span className="inline-flex items-center gap-1.5"><Plus className="h-4 w-4" />Apply for leave</span>
        </Button>
      </header>

      {overview.error && <Alert message={overview.error} />}
      {overview.loading ? <BalanceSkeleton /> : o && (o.types.length ? (
        <BalanceCards types={o.types} today={o.today} onApply={(id) => setApplyFor(id)} />
      ) : (
        <div className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-fg-muted">No leave is set up in your policy yet.</div>
      ))}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {overview.loading ? (
          <>
            <SectionCard title="Comp-off & overtime"><div className="space-y-3 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div></SectionCard>
            <SectionCard title="Leave policy"><div className="space-y-3 p-4"><Skeleton className="h-7 w-2/3" />{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4" />)}</div></SectionCard>
          </>
        ) : o && (
          <>
            <EarnedCard earned={o.earned} today={o.today} onChanged={refresh} />
            {o.types.length > 0 && <PolicyPanel types={o.types} />}
          </>
        )}
      </div>

      <RequestsPanel list={list} types={o?.types ?? []} onOpen={(r) => setOpenId(r.id)} />

      {o && applyFor !== undefined && (
        <ApplyLeaveDialog types={o.types} today={o.today} initialTypeId={applyFor} onClose={() => setApplyFor(undefined)} onApplied={() => { setApplyFor(undefined); refresh(); }} />
      )}
      <LeaveRequestDrawer id={openId} today={o?.today ?? ''} onClose={() => setOpenId(null)} onChanged={refresh} />
    </div>
  );
}
