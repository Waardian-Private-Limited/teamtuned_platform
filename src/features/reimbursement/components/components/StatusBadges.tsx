'use client';

import { AlertTriangle, CircleAlert, Info } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  CHANNEL_HELP,
  CHANNEL_LABEL,
  CLAIM_STATUS_HELP,
  CLAIM_STATUS_LABEL,
  FUND_STATUS_LABEL,
  WALLET_STATUS_HELP,
  WALLET_STATUS_LABEL,
} from '../../constants/reimbursement.constants';
import type { Channel, ClaimStatus, Flag, FundRequestStatus, WalletStatus } from '../../types/reimbursement.model';
import { money } from '../../utils/format';

const PILL = 'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold sm:text-xs';

const CLAIM_TONE: Record<ClaimStatus, string> = {
  draft: 'border-dashed border-line-strong bg-surface text-fg-muted',
  pending: 'border-line-strong bg-surface text-fg',
  approved: 'border-dashed border-fg/40 bg-bg-subtle text-fg',
  paid: 'border-fg/20 bg-fg text-[var(--tt-on-primary)]',
  rejected: 'border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
  cancelled: 'border-line bg-surface text-fg-subtle line-through',
};

/** `channel` lets an approved wallet expense read as "Spent" — it is final, nothing is paid back. */
export function ClaimStatusPill({ status, channel }: { status: ClaimStatus; channel?: Channel }) {
  const walletDone = channel === 'wallet' && status === 'approved';
  const label = walletDone ? 'Spent from wallet' : status === 'approved' ? 'To be paid' : CLAIM_STATUS_LABEL[status] || status;
  const tone = walletDone ? CLAIM_TONE.paid : CLAIM_TONE[status] || CLAIM_TONE.pending;
  return (
    <Tooltip content={walletDone ? 'Approved and taken from the wallet balance.' : CLAIM_STATUS_HELP[status]} side="top" align="start">
      <span tabIndex={0} className={cx(PILL, 'cursor-help', tone)}>
        {label}
      </span>
    </Tooltip>
  );
}

export function ChannelBadge({ channel }: { channel: Channel }) {
  return (
    <Tooltip content={CHANNEL_HELP[channel]} side="top" align="start">
      <span tabIndex={0} className={cx(PILL, 'cursor-help', channel === 'wallet' ? 'border-fg/30 bg-bg-subtle text-fg' : 'border-line bg-surface text-fg-muted')}>
        {CHANNEL_LABEL[channel]}
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

/** A balance that reads clearly when negative: red with a minus sign. */
export function Balance({ value, className }: { value: number; className?: string }) {
  return <span className={cx('tabular-nums', value < 0 ? 'text-[var(--tt-danger)]' : 'text-fg', className)}>{money(value)}</span>;
}

export function FlagList({ flags, compact }: { flags: Flag[]; compact?: boolean }) {
  if (!flags.length) return null;
  return (
    <ul className={cx('flex flex-col', compact ? 'gap-1' : 'gap-1.5')}>
      {flags.map((f, i) => {
        const Icon = f.severity === 'error' ? CircleAlert : f.severity === 'warning' ? AlertTriangle : Info;
        return (
          <li
            key={`${f.code}-${i}`}
            className={cx(
              'flex items-start gap-1.5 text-[11px] sm:text-xs',
              f.severity === 'error' ? 'font-medium text-[var(--tt-danger)]' : f.severity === 'warning' ? 'text-fg' : 'text-fg-muted'
            )}
          >
            <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{f.message}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function FlagCount({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-line-strong px-1.5 py-0.5 text-[10px] font-semibold text-fg sm:text-[11px]">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      {count} {count === 1 ? 'flag' : 'flags'}
    </span>
  );
}
