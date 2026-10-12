import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import { DEDUCTION_STATUS_HELP, DEDUCTION_STATUS_LABEL } from '../../constants/otherDeductions.constants';
import type { DeductionStatus } from '../../types/otherDeductions.model';

const TONE: Record<DeductionStatus, string> = {
  draft: 'border-dashed border-line-strong bg-bg-subtle text-fg-muted',
  pending: 'border-line-strong bg-surface text-fg',
  approved: 'border-line bg-bg-subtle text-fg',
  paid: 'border-fg/20 bg-fg text-[var(--tt-on-primary)]',
  rejected: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
  cancelled: 'border-line bg-surface text-fg-subtle line-through',
};

export function DeductionStatusBadge({ status }: { status: DeductionStatus }) {
  return (
    <Tooltip content={DEDUCTION_STATUS_HELP[status]} side="top" align="start">
      <span tabIndex={0} className={cx('inline-flex cursor-help items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold sm:text-xs', TONE[status])}>
        {DEDUCTION_STATUS_LABEL[status]}
      </span>
    </Tooltip>
  );
}
