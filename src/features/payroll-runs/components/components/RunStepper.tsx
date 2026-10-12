import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { STAGE_STEP, STEPS } from '../../constants/payrollRuns.constants';
import type { Run } from '../../types/payrollRuns.model';

export function RunStepper({ run }: { run: Run }) {
  const done = STAGE_STEP[run.stage];
  const failed = run.stage === 'failed';
  return (
    <ol className="flex w-full items-start" aria-label="Payroll progress">
      {STEPS.map((label, i) => {
        const isDone = i < done;
        const isCurrent = i === done;
        const isFailed = failed && i === 0;
        return (
          <li key={label} className="relative flex min-w-0 flex-1 flex-col items-center">
            {i > 0 && (
              <span aria-hidden className={cx('absolute left-0 right-1/2 top-[9px] h-px -translate-x-0', i <= done ? 'bg-fg' : 'bg-line')} />
            )}
            {i < STEPS.length - 1 && (
              <span aria-hidden className={cx('absolute left-1/2 right-0 top-[9px] h-px', i < done ? 'bg-fg' : 'bg-line')} />
            )}
            <span
              className={cx(
                'relative z-[1] flex h-[19px] w-[19px] items-center justify-center rounded-full border text-[10px] font-bold transition-colors duration-200',
                isFailed
                  ? 'border-[var(--tt-danger)] bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]'
                  : isDone
                    ? 'border-fg bg-fg text-fg-inverted'
                    : isCurrent
                      ? 'border-fg bg-surface text-fg ring-2 ring-fg/10'
                      : 'border-line bg-surface text-fg-subtle'
              )}
            >
              {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cx(
                'mt-1 truncate px-0.5 text-[10px] font-semibold sm:text-[11px]',
                isFailed ? 'text-[var(--tt-danger)]' : isDone || isCurrent ? 'text-fg' : 'text-fg-subtle'
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
