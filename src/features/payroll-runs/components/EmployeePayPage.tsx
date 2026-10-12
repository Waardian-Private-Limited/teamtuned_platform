'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Lock, LockOpen, RefreshCw, Send } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { cx } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { PAYROLL_PERMISSIONS } from '../constants/payrollRuns.constants';
import { useEmployeePay } from '../hooks/useEmployeePay';
import { recallOrder } from '../utils/format';
import { actionBtn, Avatar, IconButton, PayslipStatePill, Skeleton, Spinner, StagePill } from './components/controls';
import { AttendanceCalendar } from './components/AttendanceCalendar';
import { LinesTable } from './components/LinesTable';
import { OtherCompanies, SalaryUsed } from './components/PayContext';
import { PaySummaryTiles } from './components/PaySummaryTiles';
import { HoldDialog } from './components/RunDialogs';
import { WarningsList } from './components/WarningsList';
import { PayrollEmptyState } from './components/PayrollEmptyState';

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Skeleton className="col-span-2 h-28 rounded-xl" />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export function EmployeePayPage({ basePath }: { basePath: string }) {
  const params = useParams<{ runId: string; employeeId: string }>();
  const router = useRouter();
  const { canAny } = usePermission();
  const canEdit = canAny([PAYROLL_PERMISSIONS.EDIT, PAYROLL_PERMISSIONS.ADD]);
  const runId = Number(params.runId);
  const employeeId = Number(params.employeeId);
  const valid = Number.isFinite(runId) && runId > 0 && Number.isFinite(employeeId) && employeeId > 0;

  const pay = useEmployeePay(valid ? runId : null, valid ? employeeId : null);
  const data = pay.data;
  const [holdOpen, setHoldOpen] = React.useState(false);
  const [order, setOrder] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (valid) setOrder(recallOrder(runId));
  }, [valid, runId]);

  const index = order.indexOf(employeeId);
  const prevId = index > 0 ? order[index - 1] : null;
  const nextId = index >= 0 && index < order.length - 1 ? order[index + 1] : null;
  const go = (id: number | null) => id && router.push(`${basePath}/payroll/${runId}/${id}`);

  const backHref = data ? `${basePath}/payroll?month=${data.run.month}&run=${runId}` : `${basePath}/payroll`;
  const run = data?.run;
  const item = data?.item;
  const isDraft = run?.status === 'draft';
  const pending = Boolean(run?.pendingAction);
  const canChange = canEdit && isDraft && !pending && !pay.calculating;
  const canHold = canEdit && Boolean(run) && run?.status !== 'paid' && !pending && !pay.calculating;
  const canGenerate = canEdit && item?.payslipState === 'not_generated';
  const held = item?.status === 'held';

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 pb-8">
      <Link href={backHref} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-fg-muted transition-colors hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Payroll
      </Link>

      <header className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={item?.employee.name || ' '} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-extrabold text-fg sm:text-xl">{item ? item.employee.name : 'Employee payroll'}</h1>
              {run && <StagePill stage={run.stage} pending={pending} />}
              {item && <PayslipStatePill state={item.payslipState} />}
            </div>
            <p className="truncate text-xs text-fg-muted sm:text-sm">
              {item && run ? [item.employee.code, item.department, run.companyName, run.periodLabel].filter(Boolean).join(' · ') : ' '}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order.length > 1 && index >= 0 && (
            <div className="mr-1 flex items-center gap-1">
              <IconButton label="Previous employee" onClick={() => go(prevId)} disabled={!prevId}>
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <span className="min-w-[3.5rem] text-center text-xs font-semibold tabular-nums text-fg-muted">
                {index + 1} / {order.length}
              </span>
              <IconButton label="Next employee" onClick={() => go(nextId)} disabled={!nextId}>
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
          )}
          {canGenerate && (
            <Tooltip content={pending ? 'This payroll is waiting for approval' : null} side="bottom" align="end">
              <button type="button" className={actionBtn.secondary} onClick={pay.generatePayslip} disabled={pay.busy !== null || pending}>
                {pay.busy === 'generate' ? <Spinner /> : <Send className="h-3.5 w-3.5" />} Generate payslip
              </button>
            </Tooltip>
          )}
          {canHold && item && (
            <button type="button" className={actionBtn.secondary} onClick={() => setHoldOpen(true)} disabled={pay.busy !== null}>
              {held ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {held ? 'Release hold' : 'Hold salary'}
            </button>
          )}
          {canChange && (
            <button type="button" className={actionBtn.secondary} onClick={pay.recompute} disabled={pay.busy !== null}>
              {pay.busy === 'recompute' ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />} Recalculate run
            </button>
          )}
          {item && (
            <button type="button" className={actionBtn.primary} onClick={pay.downloadPayslip} disabled={pay.busy !== null || pay.calculating}>
              {pay.busy === 'payslip' ? <Spinner /> : <Download className="h-3.5 w-3.5" />} Download payslip
            </button>
          )}
        </div>
      </header>

      {pay.actionError && <p className="-mt-2 px-1 text-xs font-medium text-[var(--tt-danger)]">{pay.actionError}</p>}

      {run && pay.calculating && (
        <div className="flex items-center gap-2 rounded-lg border border-line-strong bg-bg-subtle px-3.5 py-2.5 text-xs font-medium text-fg">
          <Spinner />
          Recalculating this payroll ({run.compute.done}/{run.compute.total || '—'}). The figures below refresh when it finishes.
        </div>
      )}
      {run && pending && (
        <p className="rounded-lg border border-line-strong bg-bg-subtle px-3.5 py-2.5 text-xs font-medium text-fg">
          Waiting for approval to {run.pendingAction === 'reopen' ? 'reopen' : 'finalize'} this payroll. Changes are locked until it is decided.
        </p>
      )}

      {pay.error && !data ? (
        <div className="flex rounded-xl border border-line bg-surface">
          <PayrollEmptyState image="/vectors/review.svg" title="Payroll entry not found" description={pay.error} action={{ label: 'Back to payroll', onClick: () => router.push(backHref) }} />
        </div>
      ) : pay.loading || !data || !item ? (
        <PageSkeleton />
      ) : (
        <div className={cx('space-y-4 transition-opacity duration-200', pay.refreshing && 'opacity-60')}>
          <PaySummaryTiles item={item} />
          <WarningsList warnings={item.warnings} />

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <LinesTable title="Earnings" lines={item.earningLines} total={item.earnings} empty="No earnings in this period." />
            <LinesTable title="Deductions" lines={item.deductionLines} total={item.deductions} empty="No deductions in this period." />
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <AttendanceCalendar cells={item.attendance?.cells || []} />
            <div className="space-y-4">
              <LinesTable title="Employer contributions" lines={item.employerLines} total={item.employer} empty="No employer contributions." />
              <SalaryUsed segments={item.segments} revisionsHref={`${basePath}/salary-revisions`} />
              <OtherCompanies companies={data.otherCompanies} />
            </div>
          </div>

          {item.payslipNumber && <p className="text-xs text-fg-muted">Payslip number {item.payslipNumber}</p>}
        </div>
      )}

      <HoldDialog
        open={holdOpen}
        holding={!held}
        name={item?.employee.name || ''}
        busy={pay.busy === 'hold'}
        onClose={() => setHoldOpen(false)}
        onSubmit={async (reason) => {
          const err = await pay.setHold(!held, reason);
          if (!err) setHoldOpen(false);
          return err;
        }}
      />
    </div>
  );
}
