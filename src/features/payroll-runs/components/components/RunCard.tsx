'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Hourglass, Lock, Play, RefreshCw, RotateCcw, Send, Wallet } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { RunExportKind } from '../../hooks/useRunActions';
import type { Run } from '../../types/payrollRuns.model';
import { dateText, money } from '../../utils/format';
import { actionBtn, Spinner, StagePill } from './controls';
import { ExportsMenu } from './ExportsMenu';
import { RunStepper } from './RunStepper';

export interface RunCardProps {
  run: Run;
  selected: boolean;
  canEdit: boolean;
  busy: string | null;
  error?: string;
  onSelect: (run: Run) => void;
  onStart: (run: Run) => void;
  onRecompute: (run: Run) => void;
  onFinalize: (run: Run) => void;
  onRelease: (run: Run) => void;
  onMarkPaid: (run: Run) => void;
  onReopen: (run: Run) => void;
  onExport: (run: Run, kind: RunExportKind) => void;
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-fg-muted sm:text-[11px]">{label}</p>
      <p className={cx('mt-0.5 truncate tabular-nums text-fg', strong ? 'text-lg font-extrabold sm:text-xl' : 'text-sm font-bold')}>{value}</p>
    </div>
  );
}

export function Counter({ icon, value, label, danger }: { icon: React.ReactNode; value: number; label: string; danger?: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        value === 0 ? 'border-line text-fg-subtle' : danger ? 'border-[var(--tt-danger)]/30 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]' : 'border-line-strong bg-bg-subtle text-fg'
      )}
    >
      {icon}
      {value} {label}
    </span>
  );
}

export function runActions(props: RunCardProps) {
  const { run, canEdit, busy } = props;
  const planned = run.id === null;
  const calculating = run.compute.state === 'queued' || run.compute.state === 'running';
  const pct = run.compute.total > 0 ? Math.min(100, Math.round((run.compute.done / run.compute.total) * 100)) : 0;
  const isBusy = (action: string) => busy === `${run.key}:${action}`;
  const anyBusy = Boolean(busy && busy.startsWith(`${run.key}:`));
  const waiting = Boolean(run.pendingAction);
  const hasNumbers = !planned && Boolean(run.computedAt);

  const primary = (() => {
    if (!canEdit || calculating || waiting) return null;
    if (planned) {
      return (
        <button type="button" className={actionBtn.primary} disabled={anyBusy} onClick={() => props.onStart(run)}>
          {isBusy('start') ? <Spinner /> : <Play className="h-3.5 w-3.5" />} Start payroll
        </button>
      );
    }
    if (run.stage === 'not_calculated' || run.stage === 'failed') {
      return (
        <button type="button" className={actionBtn.primary} disabled={anyBusy} onClick={() => props.onRecompute(run)}>
          {isBusy('recompute') ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />} {run.stage === 'failed' ? 'Retry calculation' : 'Calculate'}
        </button>
      );
    }
    if (run.stage === 'review') {
      const blocked = run.totals.errors > 0;
      const button = (
        <button type="button" className={actionBtn.primary} disabled={anyBusy || blocked} onClick={() => props.onFinalize(run)}>
          {isBusy('finalize') ? <Spinner /> : <Lock className="h-3.5 w-3.5" />} {run.finalizeNeedsApproval ? 'Send to finalize' : 'Finalize'}
        </button>
      );
      return blocked ? (
        <Tooltip content={`Fix ${run.totals.errors} employee error${run.totals.errors === 1 ? '' : 's'} first`} align="start">
          {button}
        </Tooltip>
      ) : (
        button
      );
    }
    if (run.stage === 'finalized') {
      return (
        <button type="button" className={actionBtn.primary} disabled={anyBusy} onClick={() => props.onRelease(run)}>
          {isBusy('release') ? <Spinner /> : <Send className="h-3.5 w-3.5" />} Generate all payslips
        </button>
      );
    }
    if (run.stage === 'released') {
      return (
        <button type="button" className={actionBtn.primary} disabled={anyBusy} onClick={() => props.onMarkPaid(run)}>
          <Wallet className="h-3.5 w-3.5" /> Mark paid
        </button>
      );
    }
    return null;
  })();

  const secondary: React.ReactNode[] = [];
  if (canEdit && !planned && !calculating && !waiting) {
    if (run.stage === 'review') {
      secondary.push(
        <button key="re" type="button" className={actionBtn.secondary} disabled={anyBusy} onClick={() => props.onRecompute(run)}>
          {isBusy('recompute') ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />} Recalculate
        </button>
      );
    }
    if (run.stage === 'finalized') {
      secondary.push(
        <button key="paid" type="button" className={actionBtn.secondary} disabled={anyBusy} onClick={() => props.onMarkPaid(run)}>
          <Wallet className="h-3.5 w-3.5" /> Mark paid
        </button>
      );
    }
    if (run.stage === 'finalized' || run.stage === 'released') {
      secondary.push(
        <button key="reopen" type="button" className={actionBtn.secondary} disabled={anyBusy} onClick={() => props.onReopen(run)}>
          <RotateCcw className="h-3.5 w-3.5" /> Reopen
        </button>
      );
    }
  }

  return { planned, calculating, pct, isBusy, anyBusy, waiting, hasNumbers, primary, secondary };
}

export function RunCard(props: RunCardProps) {
  const { run, selected, error, onSelect } = props;
  const { planned, calculating, pct, isBusy, waiting, hasNumbers, primary, secondary } = runActions(props);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <article
      onClick={() => !planned && onSelect(run)}
      onKeyDown={(e) => {
        if (!planned && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect(run);
        }
      }}
      tabIndex={planned ? undefined : 0}
      aria-current={selected || undefined}
      className={cx(
        'flex min-w-0 flex-col gap-3.5 rounded-xl border bg-surface p-4 sm:p-4.5',
        planned ? 'border-dashed border-line-strong' : 'cursor-pointer',
        selected ? 'border-fg shadow-[var(--tt-shadow-sm)] ring-1 ring-fg' : !planned && 'border-line hover:border-line-strong'
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-fg sm:text-base">{run.companyName}</h3>
          <p className="mt-0.5 truncate text-xs text-fg-muted">
            {run.periodLabel}
            {run.payDate ? ` · Pay date ${dateText(run.payDate)}` : ''}
          </p>
        </div>
        <StagePill stage={run.stage} pending={waiting} />
      </header>

      <RunStepper run={run} />

      {calculating && (
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-fg-muted">
            <span>{run.compute.state === 'queued' ? 'Waiting to start…' : 'Calculating salaries…'}</span>
            <span className="tabular-nums">
              {run.compute.done}/{run.compute.total || run.totals.employees || '—'}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
            <div className="h-full origin-left rounded-full bg-fg transition-transform duration-500" style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
        </div>
      )}

      {run.stage === 'failed' && run.compute.error && <p className="text-xs font-medium text-[var(--tt-danger)]">{run.compute.error}</p>}

      {hasNumbers ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <Figure label="Net pay" value={money(run.totals.net)} strong />
          </div>
          <Figure label="Employees" value={String(run.totals.employees)} />
          <Figure label="Gross" value={money(run.totals.gross)} />
          <Figure label="Deductions" value={money(run.totals.deductions)} />
          <Figure label="Employer cost" value={money(run.totals.employer)} />
        </div>
      ) : (
        <p className="text-xs text-fg-muted">
          <span className="font-bold text-fg">{run.totals.employees}</span> employee{run.totals.employees === 1 ? '' : 's'} in this pay period
          {planned ? '. Nothing has been calculated yet.' : '.'}
        </p>
      )}

      {hasNumbers && (
        <div className="flex flex-wrap gap-1.5">
          <Counter icon={<AlertCircle className="h-3 w-3" />} value={run.totals.errors} label={run.totals.errors === 1 ? 'error' : 'errors'} danger />
          <Counter icon={<AlertCircle className="h-3 w-3" />} value={run.totals.warnings} label={run.totals.warnings === 1 ? 'warning' : 'warnings'} />
          <Counter icon={<Lock className="h-3 w-3" />} value={run.totals.held} label="held" />
        </div>
      )}

      {waiting && (
        <div className="flex items-start gap-2 rounded-lg border border-line-strong bg-bg-subtle px-3 py-2.5">
          <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg" />
          <div className="min-w-0 text-xs">
            <p className="font-semibold text-fg">Waiting for approval to {run.pendingAction === 'reopen' ? 'reopen' : 'finalize'}</p>
            {run.pendingNote && <p className="mt-0.5 text-fg-muted">{run.pendingNote}</p>}
          </div>
        </div>
      )}

      {run.stage === 'paid' && (
        <p className="flex items-center gap-1.5 text-xs text-fg-muted">
          <CheckCircle2 className="h-3.5 w-3.5 text-fg" />
          Paid on {dateText(run.paidOn)}
          {run.paidReference ? ` · Ref ${run.paidReference}` : ''}
        </p>
      )}

      {(primary || secondary.length > 0 || (hasNumbers && !calculating)) && (
        <div onClick={stop} className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {primary}
          {secondary}
          {hasNumbers && !calculating && (
            <div className="ml-auto">
              <ExportsMenu run={run} busy={isBusy('export')} onExport={(kind) => props.onExport(run, kind)} />
            </div>
          )}
        </div>
      )}

      {error && <p className="-mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
    </article>
  );
}
