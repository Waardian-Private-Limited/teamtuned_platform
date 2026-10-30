'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Hourglass, Lock } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import { STAGE_STEP, STEPS } from '../../constants/payrollRuns.constants';
import type { Run } from '../../types/payrollRuns.model';
import { dateText, money } from '../../utils/format';
import { StagePill } from './controls';
import { ExportsMenu } from './ExportsMenu';
import { Counter, runActions, type RunCardProps } from './RunCard';

type RunTableProps = Omit<RunCardProps, 'run' | 'selected' | 'error' | 'previewing'> & {
  runs: Run[];
  selectedId: number | null;
  previewKey?: string | null;
  errors: Record<string, string | undefined>;
};

const th = 'border-b border-line bg-bg-subtle px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted 2xl:px-4';
const td = 'border-b border-line/60 px-3 py-2.5 align-middle 2xl:px-4';

function Progress({ run, calculating, pct }: { run: Run; calculating: boolean; pct: number }) {
  if (calculating) {
    return (
      <div className="w-36">
        <div className="flex items-center justify-between text-[11px] font-semibold text-fg-muted">
          <span>{run.compute.state === 'queued' ? 'Waiting…' : 'Calculating…'}</span>
          <span className="tabular-nums">
            {run.compute.done}/{run.compute.total || run.totals.employees || '—'}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
          <div className="h-full origin-left rounded-full bg-fg transition-transform duration-500" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      </div>
    );
  }
  const done = STAGE_STEP[run.stage];
  return (
    <div className="flex flex-col gap-1">
      <StagePill stage={run.stage} pending={Boolean(run.pendingAction)} />
      <Tooltip content={<StepList run={run} done={done} />} side="bottom" align="start">
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex cursor-help items-center gap-1 rounded py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-fg/30"
          aria-label={`Step ${Math.min(done + 1, STEPS.length)} of ${STEPS.length}: ${STEPS[Math.min(done, STEPS.length - 1)]}`}
        >
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={cx('h-1 w-5 rounded-full', run.stage === 'failed' && i === 0 ? 'bg-[var(--tt-danger)]' : i < done ? 'bg-fg' : i === done ? 'bg-fg/40' : 'bg-line')}
            />
          ))}
        </button>
      </Tooltip>
    </div>
  );
}

function stepWhen(run: Run, i: number) {
  if (i === 0) return run.computedAt ? `Calculated ${dateText(run.computedAt)}` : null;
  if (i === 2) return run.finalizedAt ? `Finalized ${dateText(run.finalizedAt)}` : run.pendingAction === 'finalize' ? 'Waiting for approval' : null;
  if (i === 3) return run.releasedAt ? `Generated ${dateText(run.releasedAt)}` : null;
  if (i === 4) return run.paidOn ? `Paid ${dateText(run.paidOn)}` : null;
  return null;
}

function StepList({ run, done }: { run: Run; done: number }) {
  return (
    <ol className="flex flex-col gap-1 py-0.5">
      {STEPS.map((label, i) => {
        const failed = run.stage === 'failed' && i === 0;
        const mark = failed ? '!' : i < done ? '✓' : i === done ? '●' : '○';
        const when = stepWhen(run, i);
        return (
          <li key={label} className={cx('flex items-baseline gap-2 whitespace-nowrap', i > done && !failed && 'opacity-60')}>
            <span className="w-3 text-center">{mark}</span>
            <span className="font-semibold">{label}</span>
            {(when || i === done) && <span className="opacity-70">{when || (failed ? 'Failed' : 'Now')}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Row(props: RunCardProps) {
  const { run, selected, error, onSelect } = props;
  const { planned, calculating, pct, isBusy, waiting, hasNumbers, primary, secondary } = runActions(props);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const note = waiting
    ? { icon: <Hourglass className="h-3 w-3" />, text: `Waiting for approval to ${run.pendingAction === 'reopen' ? 'reopen' : 'finalize'}${run.pendingNote ? ` · ${run.pendingNote}` : ''}` }
    : run.stage === 'paid'
      ? { icon: <CheckCircle2 className="h-3 w-3" />, text: `Paid on ${dateText(run.paidOn)}${run.paidReference ? ` · Ref ${run.paidReference}` : ''}` }
      : null;

  return (
    <>
      <tr
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
          'transition-colors',
          planned ? 'bg-bg-subtle/30' : 'cursor-pointer hover:bg-bg-subtle/50',
          (selected || props.previewing) && 'bg-bg-subtle shadow-[inset_3px_0_0_var(--tt-primary)]'
        )}
      >
        <td className={td}>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-fg">{run.companyName}</p>
            <p className="mt-0.5 truncate text-xs text-fg-muted">
              {run.periodLabel}
              {run.payDate ? ` · Pay ${dateText(run.payDate)}` : ''}
            </p>
            {note && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-fg-muted">
                {note.icon}
                <span className="truncate">{note.text}</span>
              </p>
            )}
            {run.stage === 'failed' && run.compute.error && <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{run.compute.error}</p>}
          </div>
        </td>
        <td className={td}>
          <Progress run={run} calculating={calculating} pct={pct} />
        </td>
        <td className={cx(td, 'text-right text-sm font-semibold tabular-nums text-fg')}>{run.totals.employees}</td>
        <td className={cx(td, 'text-right')}>
          {hasNumbers ? (
            <>
              <p className="text-sm font-extrabold tabular-nums text-fg">{money(run.totals.net)}</p>
              <p className="mt-0.5 hidden whitespace-nowrap text-[11px] tabular-nums text-fg-muted xl:block">
                Gross {money(run.totals.gross)} · Ded {money(run.totals.deductions)}
              </p>
            </>
          ) : (
            <span className="text-xs text-fg-subtle">{planned ? 'Not started' : '—'}</span>
          )}
        </td>
        <td className={cx(td, 'hidden lg:table-cell')}>
          {hasNumbers ? (
            <div className="flex flex-wrap gap-1">
              <Counter icon={<AlertCircle className="h-3 w-3" />} value={run.totals.errors} label={run.totals.errors === 1 ? 'error' : 'errors'} danger />
              <Counter icon={<AlertCircle className="h-3 w-3" />} value={run.totals.warnings} label={run.totals.warnings === 1 ? 'warning' : 'warnings'} />
              <Counter icon={<Lock className="h-3 w-3" />} value={run.totals.held} label="held" />
            </div>
          ) : (
            <span className="text-xs text-fg-subtle">—</span>
          )}
        </td>
        <td className={cx(td, 'text-right')} onClick={stop}>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {primary}
            {secondary}
            {hasNumbers && !calculating && <ExportsMenu run={run} busy={isBusy('export')} onExport={(kind) => props.onExport(run, kind)} />}
          </div>
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={6} className="border-b border-line/60 px-3 pb-2 text-xs font-medium text-[var(--tt-danger)] 2xl:px-4">
            {error}
          </td>
        </tr>
      )}
    </>
  );
}

export function RunTable({ runs, selectedId, previewKey, errors, ...handlers }: RunTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-xs tt-scroll-hidden">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className={th}>Company &amp; period</th>
            <th className={th}>Progress</th>
            <th className={cx(th, 'text-right')}>Employees</th>
            <th className={cx(th, 'text-right')}>Net pay</th>
            <th className={cx(th, 'hidden lg:table-cell')}>Issues</th>
            <th className={cx(th, 'text-right')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <Row key={run.key} run={run} selected={run.id !== null && run.id === selectedId} previewing={run.key === previewKey} error={errors[run.key]} {...handlers} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
