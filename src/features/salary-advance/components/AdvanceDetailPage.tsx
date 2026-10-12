'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { RequestDrawer } from '@/features/approvals/components/RequestDrawer';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePermission } from '@/lib/hooks/usePermission';
import { ADVANCES_ACCESS, ILLUSTRATIONS } from '../constants/salaryAdvance.constants';
import { useAdvanceDetail } from '../hooks/useAdvanceDetail';
import { useAdvanceActions, type AdvanceAction } from '../hooks/useAdvanceActions';
import { useSalaryAdvanceBasePath } from '../hooks/useSalaryAdvanceBasePath';
import type { AdvanceDetail } from '../types/salaryAdvance.model';
import { AmountCards } from './components/AmountCards';
import { AdvanceStatusPill } from './components/StatusBadges';
import { AdvanceTimeline } from './components/AdvanceTimeline';
import { AttachmentsList } from './components/AttachmentsList';
import { DetailActions } from './components/DetailActions';
import { DetailFacts, DetailSkeleton, Panel } from './components/DetailSections';
import { DisburseDialog } from './components/DisburseDialog';
import { PauseDialog, ReshapeDialog, SkipMonthDialog } from './components/ScheduleDialogs';
import { ScheduleTable } from './components/ScheduleTable';
import { CancelAdvanceDialog, RepaymentDialog, WaiveDialog } from './components/SettlementDialogs';
import { NoAccess } from './components/NoAccess';
import { PlanDialog } from './components/PlanDialog';
import { PlanPanel } from './components/PlanPanel';

export function AdvanceDetailPage({ advanceId }: { advanceId: number }) {
  const { canAny } = usePermission();
  if (!canAny(ADVANCES_ACCESS)) return <NoAccess what="salary advances" />;
  return <Detail advanceId={advanceId} />;
}

function Detail({ advanceId }: { advanceId: number }) {
  const base = useSalaryAdvanceBasePath();
  const area = base.startsWith('/employee') ? '/employee' : '/org-admin';
  const { detail, isLoading, error, notFound, refetch } = useAdvanceDetail(advanceId, 'hr');
  const [action, setAction] = React.useState<AdvanceAction | null>(null);
  const [planOpen, setPlanOpen] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const close = React.useCallback(() => setAction(null), []);
  const done = React.useCallback(() => {
    setAction(null);
    setPlanOpen(false);
    refetch();
  }, [refetch]);
  const actions = useAdvanceActions(advanceId, done);
  const { clearError } = actions;

  const open = (a: AdvanceAction) => {
    clearError();
    setAction(a);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 pb-8">
      <Link href={`${base}/advances`} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-fg-muted transition-colors hover:text-fg sm:text-sm">
        <ArrowLeft className="h-3.5 w-3.5" />
        All advances
      </Link>

      {isLoading ? (
        <DetailSkeleton />
      ) : !detail ? (
        <div className="rounded-xl border border-line bg-surface p-6">
          <EmptyState
            illustration={ILLUSTRATIONS.review}
            title={notFound ? 'Advance not found' : 'Could not load this advance'}
            description={notFound ? 'It may have been removed, or it belongs to a company you cannot see.' : error}
            action={notFound ? undefined : { label: 'Try again', onClick: refetch, variant: 'link' }}
          />
        </div>
      ) : (
        <DetailBody
          detail={detail}
          payrollHref={(runId) => `${area}/payroll/${runId}/${detail.employeeId}`}
          base={base}
          onAction={open}
          onEditPlan={() => setPlanOpen(true)}
          onReview={() => setReviewOpen(true)}
        />
      )}

      {detail && (
        <>
          <DisburseDialog advance={detail} open={action === 'disburse'} busy={actions.busy} error={actions.error} onClose={close} onSubmit={actions.disburse} />
          <SkipMonthDialog advance={detail} open={action === 'skip'} busy={actions.busy} error={actions.error} onClose={close} onSubmit={actions.skip} />
          <PauseDialog advance={detail} open={action === 'pause'} busy={actions.busy} error={actions.error} onClose={close} onSubmit={actions.pause} />
          <ReshapeDialog advance={detail} open={action === 'reshape'} busy={actions.busy} error={actions.error} onClose={close} onSubmit={actions.reshape} />
          <RepaymentDialog advance={detail} open={action === 'repay'} busy={actions.busy} error={actions.error} onClose={close} onSubmit={actions.repay} />
          <WaiveDialog advance={detail} open={action === 'waive'} busy={actions.busy} error={actions.error} onClose={close} onSubmit={actions.waive} />
          <CancelAdvanceDialog advance={detail} open={action === 'cancel'} busy={actions.busy} error={actions.error} onClose={close} onSubmit={actions.cancel} />
          <PlanDialog advance={detail} open={planOpen} onClose={() => setPlanOpen(false)} onSaved={done} />
          <RequestDrawer id={reviewOpen && detail.approval ? detail.approval.requestId : null} onClose={() => setReviewOpen(false)} onChanged={refetch} />
        </>
      )}
    </div>
  );
}

function DetailBody({ detail, payrollHref, base, onAction, onEditPlan, onReview }: { detail: AdvanceDetail; payrollHref: (runId: number) => string; base: string; onAction: (a: AdvanceAction) => void; onEditPlan: () => void; onReview: () => void }) {
  const d = detail;
  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fg text-sm font-bold text-[var(--tt-on-primary)]">
            {d.employeeName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-bold text-fg sm:text-lg">{d.employeeName}</h1>
              <AdvanceStatusPill status={d.status} />
            </div>
            <p className="truncate text-xs text-fg-muted sm:text-sm">
              {[d.employeeCode, d.typeName, `#${d.id}`].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {d.status === 'pending' && d.approval?.status === 'pending' && (
            <Btn variant="primary" icon={<ClipboardCheck className="h-3.5 w-3.5" />} onClick={onReview}>Review &amp; approve</Btn>
          )}
          <DetailActions detail={d} onAction={onAction} />
        </div>
      </div>

      {d.status === 'approved' && d.disbursementMode === 'payroll' && (
        <p className="px-1 text-xs text-fg-muted sm:text-sm">
          This advance is paid as an earning in the next draft payroll of the employee’s company. Recovery follows the plan, from the month after that payroll at the earliest.
        </p>
      )}

      <AmountCards detail={d} />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <Panel title="Repayment schedule" flush aside={<span className="text-xs text-fg-muted">{d.schedule.length} instalments</span>}>
            {d.schedule.length ? (
              <ScheduleTable rows={d.schedule} payrollHref={payrollHref} />
            ) : (
              <p className="p-4 text-sm text-fg-muted sm:p-5">The schedule is created when the advance is paid out.</p>
            )}
          </Panel>
          <Panel title="Timeline">
            <AdvanceTimeline detail={d} />
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <PlanPanel detail={d} base={base} onEdit={onEditPlan} />
          <Panel title="Details">
            <DetailFacts detail={d} />
          </Panel>
          <Panel title="Documents">
            <AttachmentsList advanceId={d.id} attachments={d.attachments} hasProof={d.hasProof} disbursementReference={d.disbursementReference} />
          </Panel>
        </div>
      </div>
    </>
  );
}
