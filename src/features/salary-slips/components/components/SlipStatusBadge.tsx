import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import { SLIP_STATUS_LABEL } from '../../constants/salarySlips.constants';
import type { SlipStatus } from '../../types/salarySlips.model';

const TONE: Record<SlipStatus, string> = {
  visible: 'border-fg/20 bg-fg text-[var(--tt-on-primary)]',
  not_generated: 'border-line-strong bg-surface text-fg',
  held: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
  draft: 'border-dashed border-line-strong bg-bg-subtle text-fg-muted',
};

const HINT: Record<SlipStatus, string> = {
  visible: 'Visible to the employee in the app',
  not_generated: 'Not visible to the employee yet',
  held: 'Hidden from the app and salary withheld',
  draft: 'Payroll is still a draft',
};

export function SlipStatusBadge({ status, reason, align = 'center' }: { status: SlipStatus; reason?: string | null; align?: 'start' | 'center' | 'end' }) {
  const tip = status === 'held' && reason ? `Held: ${reason.length > 80 ? `${reason.slice(0, 80)}…` : reason}` : HINT[status];
  return (
    <Tooltip content={tip} side="top" align={align}>
      <span
        aria-label={status === 'held' && reason ? `${SLIP_STATUS_LABEL[status]}: ${reason}` : SLIP_STATUS_LABEL[status]}
        className={cx('inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold sm:text-xs', TONE[status])}
      >
        {SLIP_STATUS_LABEL[status]}
      </span>
    </Tooltip>
  );
}
