'use client';

import React from 'react';
import { Eye, History } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { TrackingPolicyDto } from '../../types/tracking.dto';

interface TrackingPolicyVersionHistoryProps {
  policy: TrackingPolicyDto;
  onView: (policy: TrackingPolicyDto) => void;
}

export function TrackingPolicyVersionHistory({
  policy,
  onView,
}: TrackingPolicyVersionHistoryProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-fg-muted" />
          <h3 className="text-sm font-semibold text-fg">Version history</h3>
        </div>
        <span className="text-[11px] text-fg-muted font-mono">r{policy.revision}</span>
      </div>

      <ul className="space-y-2">
        <li className="flex items-center justify-between gap-3 rounded-lg border border-line/60 p-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-fg">r{policy.revision}</span>
              <span
                className={cx(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize',
                  policy.status === 'active'
                    ? 'border-[var(--tt-success)]/25 bg-[var(--tt-success-soft)] text-[var(--tt-success)]'
                    : 'border-line bg-surface text-fg-subtle'
                )}
              >
                {policy.status === 'active' ? 'published' : 'archived'}
              </span>
              {policy.is_default && (
                <span className="rounded-full bg-blue-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-blue-600 dark:text-blue-400">
                  default
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-fg-muted">
              Live policy · updated {new Date(policy.updated_at).toLocaleDateString()}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onView(policy)}
              aria-label={`View configuration of revision r${policy.revision}`}
              className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
            >
              <Eye className="h-3 w-3" /> View
            </button>
          </div>
        </li>
      </ul>
    </div>
  );
}
