'use client';

import { Download, Send } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { RUN_STATUS_LABEL } from '../../constants/salarySlips.constants';
import type { PayRun, PayslipCounts, RunPayslipSummary } from '../../types/salarySlips.model';
import { shortDate } from '../../utils/format';

interface RunSummaryBarProps {
  run: PayRun;
  summary: RunPayslipSummary | null;
  summaryLoaded: boolean;
  pageCounts: PayslipCounts;
  canGenerate: boolean;
  generateBlockedReason: string | null;
  canDownloadAll: boolean;
  onGenerateAll: () => void;
  onDownloadAll: () => void;
}

function releaseLine(run: PayRun) {
  if (run.isReleased) return `All payslips released on ${shortDate(run.releasedAt)}`;
  if (run.releaseMode === 'manual') return 'Payslips are generated only by HR';
  return run.releaseOn ? `Auto-generates on ${shortDate(run.releaseOn)}` : 'Auto-generates after pay day';
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-bold tabular-nums text-fg">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function CountsLine({ run, summary, summaryLoaded, pageCounts }: Pick<RunSummaryBarProps, 'run' | 'summary' | 'summaryLoaded' | 'pageCounts'>) {
  if (run.status === 'draft') {
    const held = summary?.held ?? null;
    return (
      <p className="text-xs text-fg-muted 2xl:text-sm">
        Draft preview. Payslips can be generated once the payroll is finalized.
        {held !== null && held > 0 && (
          <>
            {' '}
            <span className="font-bold tabular-nums text-fg">{held}</span> held.
          </>
        )}
      </p>
    );
  }
  if (!summaryLoaded) return <p className="h-4 w-56 animate-pulse rounded bg-bg-subtle" aria-hidden />;
  const counts = summary?.counts ?? pageCounts;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted 2xl:text-sm">
      <Count label="generated" value={counts.generated} />
      <span aria-hidden className="text-fg-subtle">·</span>
      <Count label="not generated" value={counts.notGenerated} />
      <span aria-hidden className="text-fg-subtle">·</span>
      <Count label="held" value={counts.held} />
      {!summary?.counts && <span className="italic">on this page</span>}
    </div>
  );
}

export function RunSummaryBar({
  run,
  summary,
  summaryLoaded,
  pageCounts,
  canGenerate,
  generateBlockedReason,
  canDownloadAll,
  onGenerateAll,
  onDownloadAll,
}: RunSummaryBarProps) {
  const isDraft = run.status === 'draft';
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5 md:flex-row md:items-center md:justify-between 2xl:p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-bold text-fg 2xl:text-base">{run.companyName}</span>
          <span
            className={cx(
              'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold',
              isDraft ? 'border-dashed border-line-strong text-fg-muted' : 'border-line bg-bg-subtle text-fg'
            )}
          >
            {run.pendingAction ? 'Waiting for approval' : RUN_STATUS_LABEL[run.status]}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted 2xl:text-sm">
          <span>{run.periodLabel}</span>
          {run.payDate && <span>Pay date {shortDate(run.payDate)}</span>}
          {!isDraft && <span className="font-medium text-fg">{releaseLine(run)}</span>}
        </div>
        <CountsLine run={run} summary={summary} summaryLoaded={summaryLoaded} pageCounts={pageCounts} />
      </div>

      <div className="flex flex-col items-stretch gap-1.5 md:items-end">
      <div className="flex flex-wrap items-center gap-2">
        {canDownloadAll && (
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={onDownloadAll}>
            Download all
          </Btn>
        )}
        {canGenerate && (
          <Tooltip content={generateBlockedReason} side="bottom" align="end">
            <Btn variant="primary" icon={<Send className="h-3.5 w-3.5" />} disabled={Boolean(generateBlockedReason)} onClick={onGenerateAll}>
              Generate all
            </Btn>
          </Tooltip>
        )}
      </div>
      {canGenerate && generateBlockedReason && <p className="text-[11px] text-fg-muted md:text-right">{generateBlockedReason}</p>}
      </div>
    </div>
  );
}
