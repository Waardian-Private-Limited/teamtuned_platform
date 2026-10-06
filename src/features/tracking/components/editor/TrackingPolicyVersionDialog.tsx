'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import type { TrackingPolicyDto } from '../../types/tracking.dto';

interface TrackingPolicyVersionDialogProps {
  open: boolean;
  policy: TrackingPolicyDto | null;
  onClose: () => void;
}

export function TrackingPolicyVersionDialog({
  open,
  policy,
  onClose,
}: TrackingPolicyVersionDialogProps) {
  if (!policy) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
      title={
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-fg sm:text-base">
            Revision r{policy.revision} Configuration
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-fg-muted sm:text-xs">
            {policy.name} · status {policy.status} · last updated{' '}
            {new Date(policy.updated_at).toLocaleString()}
          </p>
        </div>
      }
      footer={
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
        >
          Close
        </button>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-line bg-surface p-3 font-mono text-xs text-fg leading-relaxed max-h-96 overflow-y-auto">
          <pre>{JSON.stringify(policy.config, null, 2)}</pre>
        </div>
      </div>
    </Dialog>
  );
}
