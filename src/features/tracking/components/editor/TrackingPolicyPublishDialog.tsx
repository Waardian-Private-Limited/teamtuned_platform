'use client';

import React from 'react';
import { Rocket, Smartphone, Users, Zap } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';

interface TrackingPolicyPublishDialogProps {
  open: boolean;
  policyName: string;
  currentRevision: number;
  assignedCount: number;
  isDefault: boolean;
  isPublishing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function TrackingPolicyPublishDialog({
  open,
  policyName,
  currentRevision,
  assignedCount,
  isDefault,
  isPublishing,
  onClose,
  onConfirm,
}: TrackingPolicyPublishDialogProps) {
  const nextRevision = currentRevision + 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Publish policy changes?"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPublishing}
            onClick={onConfirm}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isPublishing ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Rocket className="h-3.5 w-3.5" />
            )}
            <span>Publish revision (r{nextRevision})</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-fg-muted sm:text-sm">
          Publishing updates to <strong className="text-fg">{policyName}</strong> will increment its revision to{' '}
          <strong className="text-fg font-mono">r{nextRevision}</strong>.
        </p>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-line bg-bg-subtle/50 p-3">
            <div className="flex items-center gap-1.5 text-fg-muted mb-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Revision</span>
            </div>
            <p className="text-xs font-bold text-fg">
              r{currentRevision} &rarr; <span className="text-emerald-600">r{nextRevision}</span>
            </p>
          </div>

          <div className="rounded-xl border border-line bg-bg-subtle/50 p-3">
            <div className="flex items-center gap-1.5 text-fg-muted mb-1">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Assigned</span>
            </div>
            <p className="text-xs font-bold text-fg">
              {assignedCount} {assignedCount === 1 ? 'employee' : 'employees'}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-bg-subtle/50 p-3">
            <div className="flex items-center gap-1.5 text-fg-muted mb-1">
              <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Delivery</span>
            </div>
            <p className="text-xs font-bold text-fg">Next device sync</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-3 text-xs text-fg-muted leading-relaxed space-y-1.5">
          <p className="font-semibold text-fg">How changes roll out to devices:</p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-fg-subtle sm:text-xs">
            <li>Employees currently recording location will download the new rules on their next server heartbeat.</li>
            <li>New tracking sessions will initialize with revision r{nextRevision} immediately.</li>
            {isDefault && (
              <li>As this is the default policy, all unassigned employees will automatically adopt these updated rules.</li>
            )}
          </ul>
        </div>
      </div>
    </Dialog>
  );
}
