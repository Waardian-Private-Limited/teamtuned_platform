import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  ADVANCE_STATUS_HELP,
  ADVANCE_STATUS_LABEL,
  INSTALLMENT_STATUS_HELP,
  INSTALLMENT_STATUS_LABEL,
} from '../../constants/salaryAdvance.constants';
import type { AdvanceStatus, InstallmentStatus } from '../../types/salaryAdvance.model';

const ADVANCE_TONE: Record<AdvanceStatus, string> = {
  pending: 'border-line-strong bg-surface text-fg',
  approved: 'border-dashed border-fg/40 bg-bg-subtle text-fg',
  active: 'border-fg/20 bg-fg text-[var(--tt-on-primary)]',
  closed: 'border-line bg-bg-subtle text-fg-muted',
  rejected: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
  cancelled: 'border-line bg-surface text-fg-subtle line-through',
  written_off: 'border-line bg-surface text-fg-subtle',
  merged: 'border-dashed border-line-strong bg-bg-subtle text-fg-muted',
};

const INSTALLMENT_TONE: Record<InstallmentStatus, string> = {
  scheduled: 'border-line bg-surface text-fg-muted',
  deducted: 'border-fg/20 bg-fg text-[var(--tt-on-primary)]',
  partial: 'border-dashed border-fg/40 bg-bg-subtle text-fg',
  carried: 'border-dashed border-line-strong bg-surface text-fg',
  skipped: 'border-line bg-surface text-fg-subtle line-through',
  waived: 'border-line bg-bg-subtle text-fg-subtle',
  paid_manually: 'border-line-strong bg-bg-subtle text-fg',
  moved: 'border-dashed border-line bg-surface text-fg-subtle',
};

const PILL = 'inline-flex cursor-help items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold sm:text-xs';

export function AdvanceStatusPill({ status }: { status: AdvanceStatus }) {
  return (
    <Tooltip content={ADVANCE_STATUS_HELP[status]} side="top" align="start">
      <span tabIndex={0} className={cx(PILL, ADVANCE_TONE[status] || ADVANCE_TONE.pending)}>
        {ADVANCE_STATUS_LABEL[status] || status}
      </span>
    </Tooltip>
  );
}

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  return (
    <Tooltip content={INSTALLMENT_STATUS_HELP[status]} side="top" align="start">
      <span tabIndex={0} className={cx(PILL, INSTALLMENT_TONE[status] || INSTALLMENT_TONE.scheduled)}>
        {INSTALLMENT_STATUS_LABEL[status] || status}
      </span>
    </Tooltip>
  );
}

export function RecoveryProgress({ progress, className }: { progress: number; className?: string }) {
  const value = Math.round(progress);
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label="Recovered"
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle', className)}
    >
      <div className="h-full origin-left rounded-full bg-fg transition-transform duration-500" style={{ transform: `scaleX(${Math.min(100, Math.max(0, value)) / 100})` }} />
    </div>
  );
}

export function Block({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-lg bg-bg-subtle', className)} />;
}
