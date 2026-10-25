'use client';

import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  EXPENSE_STATUS_HELP,
  EXPENSE_STATUS_LABEL,
  FUND_STATUS_LABEL,
  INWARD_STATUS_LABEL,
  MY_PHYSICAL_COPY_LABEL,
  PHYSICAL_COPY_LABEL,
  WALLET_STATUS_HELP,
  WALLET_STATUS_LABEL,
} from '../../constants/petty-cash.constants';
import type { ExpenseStatus, FundRequestStatus, Inward, PhysicalCopy, WalletStatus } from '../../types/petty-cash.model';
import { money } from '../../utils/format';

export const PILL = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold sm:text-xs';

const EXPENSE_TONE: Record<ExpenseStatus, string> = {
  pending: 'border-line-strong bg-surface text-fg',
  approved: 'border-fg/20 bg-fg text-[var(--tt-on-primary)]',
  rejected: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
  cancelled: 'border-line bg-surface text-fg-subtle line-through',
};

export function ExpenseStatusPill({ status }: { status: ExpenseStatus }) {
  return (
    <Tooltip content={EXPENSE_STATUS_HELP[status]} side="top" align="start">
      <span tabIndex={0} className={cx(PILL, 'cursor-help', EXPENSE_TONE[status] || EXPENSE_TONE.pending)}>
        {EXPENSE_STATUS_LABEL[status] || status}
      </span>
    </Tooltip>
  );
}

const WALLET_TONE: Record<WalletStatus, string> = {
  active: 'border-fg/20 bg-fg text-[var(--tt-on-primary)]',
  frozen: 'border-dashed border-fg/40 bg-bg-subtle text-fg',
  closed: 'border-line bg-surface text-fg-subtle',
};

export function WalletStatusPill({ status }: { status: WalletStatus }) {
  return (
    <Tooltip content={WALLET_STATUS_HELP[status]} side="top" align="start">
      <span tabIndex={0} className={cx(PILL, 'cursor-help', WALLET_TONE[status])}>
        {WALLET_STATUS_LABEL[status]}
      </span>
    </Tooltip>
  );
}

/** Dashed pill: attention, not an error. */
export function LowBadge({ className }: { className?: string }) {
  return <span className={cx(PILL, 'border-dashed border-fg/60 bg-surface text-fg', className)}>Running low</span>;
}

const FUND_TONE: Record<FundRequestStatus, string> = {
  pending: 'border-line-strong bg-surface text-fg',
  approved: 'border-dashed border-fg/40 bg-bg-subtle text-fg',
  paid: 'border-fg/20 bg-fg text-[var(--tt-on-primary)]',
  rejected: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
  cancelled: 'border-line bg-surface text-fg-subtle line-through',
};

export function FundStatusPill({ status }: { status: FundRequestStatus }) {
  return <span className={cx(PILL, FUND_TONE[status])}>{FUND_STATUS_LABEL[status] || status}</span>;
}

const COPY_TONE: Record<PhysicalCopy['status'], string> = {
  not_required: 'border-line bg-surface text-fg-subtle',
  optional: 'border-line bg-surface text-fg-muted',
  pending: 'border-dashed border-fg/60 bg-surface text-fg',
  received: 'border-line-strong bg-bg-subtle text-fg',
};

/** Paper-bill status. `me` uses the spender's wording ("Hand in the paper bill"). */
export function PhysicalCopyPill({ copy, audience = 'hr', className }: { copy: PhysicalCopy; audience?: 'hr' | 'me'; className?: string }) {
  const label = (audience === 'me' ? MY_PHYSICAL_COPY_LABEL : PHYSICAL_COPY_LABEL)[copy.status];
  return (
    <span className={cx(PILL, COPY_TONE[copy.status], className)}>
      {copy.status === 'received' && <Check className="h-3 w-3" aria-hidden />}
      {label}
    </span>
  );
}

/** A balance that reads clearly when negative: red with a minus sign. */
export function Balance({ value, className }: { value: number; className?: string }) {
  return <span className={cx('tabular-nums', value < 0 ? 'text-[var(--tt-danger)]' : 'text-fg', className)}>{money(value)}</span>;
}

/** The inward number, prominent: monospace-free, bold, boxed. */
export function InwardNo({ value, className }: { value: string | null; className?: string }) {
  if (!value) return <span className={cx('text-fg-muted', className)}>—</span>;
  return <span className={cx('inline-flex rounded-md border border-line-strong bg-bg-subtle px-1.5 py-0.5 text-xs font-bold tabular-nums text-fg', className)}>{value}</span>;
}

const INWARD_TONE: Record<Inward['status'], string> = {
  not_required: 'border-line bg-surface text-fg-subtle',
  pending: 'border-dashed border-fg/60 bg-surface text-fg',
  partial: 'border-line-strong bg-surface text-fg',
  received: 'border-line-strong bg-bg-subtle text-fg',
};

/** Goods inward status: to receive, partly received, received. */
export function InwardPill({ inward, className }: { inward: Inward; className?: string }) {
  return (
    <span className={cx(PILL, INWARD_TONE[inward.status], className)}>
      {inward.status === 'received' && <Check className="h-3 w-3" aria-hidden />}
      {INWARD_STATUS_LABEL[inward.status]}
    </span>
  );
}

/** Every inward number of an expense (one per receipt). */
export function InwardNos({ numbers, className }: { numbers: string[]; className?: string }) {
  if (!numbers.length) return <span className={cx('text-fg-muted', className)}>—</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {numbers.map((n) => (
        <InwardNo key={n} value={n} className={className} />
      ))}
    </span>
  );
}
