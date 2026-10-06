'use client';

import React from 'react';
import { Play, PowerOff, Shield, Users, X } from 'lucide-react';
import type { TrackingPolicyDto } from '../../types/tracking.dto';

interface TrackingAssignmentsBulkBarProps {
  selectedCount: number;
  policies: TrackingPolicyDto[];
  selectedPolicyId: number | null;
  onPolicyChange: (policyId: number | null) => void;
  onApply: (enable: boolean) => void;
  onClear: () => void;
  isBusy: boolean;
}

export function TrackingAssignmentsBulkBar({
  selectedCount,
  policies,
  selectedPolicyId,
  onPolicyChange,
  onApply,
  onClear,
  isBusy,
}: TrackingAssignmentsBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-2.5 sm:px-3.5 shadow-xs transition-all">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Count Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-subtle px-2.5 py-1 text-xs font-semibold text-fg">
          <Users className="h-3.5 w-3.5 text-fg-muted" />
          <span>{selectedCount} Selected</span>
        </span>

        {/* Policy Selector */}
        <div className="relative flex items-center">
          <Shield className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-fg-muted" />
          <select
            value={selectedPolicyId ?? ''}
            onChange={(e) => onPolicyChange(e.target.value ? Number(e.target.value) : null)}
            className="h-8 rounded-lg border border-line bg-surface pl-8 pr-3 text-xs font-medium text-fg outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]"
            aria-label="Target Policy"
            disabled={isBusy}
          >
            <option value="">Default Policy</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.is_default ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons (Strict Black & White theme) */}
      <div className="flex items-center gap-2">
        {/* Enable Button */}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onApply(true)}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-fg px-3 text-xs font-semibold text-bg shadow-xs transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isBusy ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Play className="h-3 w-3 fill-current" />
          )}
          <span>Enable</span>
        </button>

        {/* Disable Button */}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onApply(false)}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg shadow-xs transition-all hover:bg-bg-subtle active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PowerOff className="h-3 w-3 text-fg-muted" />
          <span>Disable</span>
        </button>

        {/* Clear selection */}
        <button
          type="button"
          disabled={isBusy}
          onClick={onClear}
          title="Clear selection"
          aria-label="Clear selection"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
