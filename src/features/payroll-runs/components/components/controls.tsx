'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { STAGE_LABEL } from '../../constants/payrollRuns.constants';
import type { ItemStatus, PayslipState, RunStage } from '../../types/payrollRuns.model';
import { initials } from '../../utils/format';

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-12 w-12 text-sm' : size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  return (
    <span aria-hidden className={cx('flex shrink-0 items-center justify-center rounded-full border border-line bg-bg-subtle font-bold text-fg-muted', box)}>
      {initials(name)}
    </span>
  );
}

export function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg focus-visible:outline-2 focus-visible:outline-[var(--tt-primary)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-lg bg-bg-subtle', className)} />;
}

export const actionBtn = {
  primary:
    'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-[transform,opacity] hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 sm:text-sm',
  secondary:
    'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 sm:text-sm',
} as const;

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cx('inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent', className)} />;
}

const STAGE_TONE: Record<RunStage, string> = {
  not_started: 'border-line bg-surface text-fg-muted',
  not_calculated: 'border-line bg-surface text-fg-muted',
  calculating: 'border-line-strong bg-bg-subtle text-fg',
  failed: 'border-[var(--tt-danger)]/30 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]',
  review: 'border-line-strong bg-bg-subtle text-fg',
  awaiting_finalize_approval: 'border-line-strong bg-bg-subtle text-fg',
  finalized: 'border-fg bg-surface text-fg',
  released: 'border-fg bg-surface text-fg',
  paid: 'border-fg bg-fg text-fg-inverted',
};

export function StagePill({ stage, pending }: { stage: RunStage; pending?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', STAGE_TONE[stage])}>
      <span aria-hidden className={cx('h-1.5 w-1.5 rounded-full', stage === 'paid' ? 'bg-fg-inverted' : stage === 'failed' ? 'bg-[var(--tt-danger)]' : 'bg-current')} />
      {pending ? 'Waiting for approval' : STAGE_LABEL[stage]}
    </span>
  );
}

const ITEM_TONE: Record<ItemStatus, { dot: string; chip: string; label: string }> = {
  ok: { dot: 'bg-fg-subtle', chip: 'border-line text-fg-muted', label: 'OK' },
  warning: { dot: 'bg-fg-muted', chip: 'border-line-strong bg-bg-subtle text-fg', label: 'Warning' },
  error: { dot: 'bg-[var(--tt-danger)]', chip: 'border-[var(--tt-danger)]/30 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]', label: 'Error' },
  held: { dot: 'bg-fg', chip: 'border-fg bg-surface text-fg', label: 'Held' },
};

export function ItemStatusPill({ status }: { status: ItemStatus }) {
  const t = ITEM_TONE[status];
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide', t.chip)}>
      <span aria-hidden className={cx('h-1.5 w-1.5 rounded-full', t.dot)} />
      {t.label}
    </span>
  );
}

const PAYSLIP_TONE: Record<Exclude<PayslipState, 'draft'>, { chip: string; label: string; tip: string }> = {
  visible: { chip: 'border-fg bg-fg text-fg-inverted', label: 'Generated', tip: 'Payslip is visible to the employee in the app' },
  not_generated: { chip: 'border-line-strong bg-surface text-fg-muted', label: 'Not generated', tip: 'Payslip is not visible to the employee yet' },
  held: { chip: 'border-[var(--tt-danger)]/30 bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]', label: 'Held', tip: 'Payslip hidden from the app and salary withheld' },
};

export function PayslipStatePill({ state }: { state: PayslipState | null }) {
  if (!state || state === 'draft') return null;
  const t = PAYSLIP_TONE[state];
  return (
    <span title={t.tip} className={cx('inline-flex items-center whitespace-nowrap rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide', t.chip)}>
      {t.label}
    </span>
  );
}

export function SectionCard({ title, aside, children, className }: { title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('overflow-hidden rounded-xl border border-line bg-surface', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-fg-muted">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
