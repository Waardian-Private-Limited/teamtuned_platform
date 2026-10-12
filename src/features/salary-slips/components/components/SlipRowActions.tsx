'use client';

import React from 'react';
import { Download, Lock, LockOpen, Send } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { RowActionKind } from '../../hooks/useSalarySlipActions';
import type { SalarySlipRow } from '../../types/salarySlips.model';

export interface SlipRowPolicy {
  canEdit: boolean;
  canHold: boolean;
  blockedReason: string | null;
}

export interface SlipRowHandlers {
  onGenerate: (row: SalarySlipRow) => void;
  onHold: (row: SalarySlipRow) => void;
  onReleaseHold: (row: SalarySlipRow) => void;
  onDownload: (row: SalarySlipRow) => void;
}

interface SlipRowActionsProps extends SlipRowHandlers {
  row: SalarySlipRow;
  policy: SlipRowPolicy;
  busy: RowActionKind | null;
  showLabels?: 'always' | 'xl';
}

function RowBtn({
  label,
  icon,
  busy,
  disabled,
  tip,
  primary,
  showLabel,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  busy: boolean;
  disabled: boolean;
  tip: string | null;
  primary?: boolean;
  showLabel: 'always' | 'xl';
  onClick: () => void;
}) {
  return (
    <Tooltip content={tip} side="top" align="end">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        aria-label={label}
        className={cx(
          'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          primary ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]' : 'border border-line bg-surface text-fg hover:bg-bg-subtle'
        )}
      >
        {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
        <span className={showLabel === 'xl' ? 'hidden xl:inline' : undefined}>{label}</span>
      </button>
    </Tooltip>
  );
}

export function SlipRowActions({ row, policy, busy, showLabels = 'always', onGenerate, onHold, onReleaseHold, onDownload }: SlipRowActionsProps) {
  const locked = busy !== null;
  const blocked = policy.blockedReason;
  return (
    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
      {policy.canEdit && row.status === 'not_generated' && (
        <RowBtn
          label="Generate"
          icon={<Send className="h-3.5 w-3.5" />}
          primary
          busy={busy === 'generate'}
          disabled={locked || Boolean(blocked)}
          tip={blocked}
          showLabel={showLabels}
          onClick={() => onGenerate(row)}
        />
      )}
      {policy.canEdit && policy.canHold && row.status !== 'held' && (
        <RowBtn
          label="Hold"
          icon={<Lock className="h-3.5 w-3.5" />}
          busy={false}
          disabled={locked || Boolean(blocked)}
          tip={blocked ?? 'Hide from the app and withhold salary'}
          showLabel={showLabels}
          onClick={() => onHold(row)}
        />
      )}
      {policy.canEdit && policy.canHold && row.status === 'held' && (
        <RowBtn
          label="Release hold"
          icon={<LockOpen className="h-3.5 w-3.5" />}
          busy={busy === 'release'}
          disabled={locked || Boolean(blocked)}
          tip={blocked}
          showLabel={showLabels}
          onClick={() => onReleaseHold(row)}
        />
      )}
      <RowBtn
        label="Download"
        icon={<Download className="h-3.5 w-3.5" />}
        busy={busy === 'download'}
        disabled={locked}
        tip={null}
        showLabel={showLabels}
        onClick={() => onDownload(row)}
      />
    </div>
  );
}
