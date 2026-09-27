'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { usePayCalendar } from '../../hooks/usePayCalendar';

interface PayCalendarDialogProps {
  open: boolean;
  policyId: number;
  onClose: () => void;
}

/**
 * The next twelve pay cycles this policy's payroll-cycle section produces —
 * the check an admin makes after changing cycle anchors or pay day, before
 * payroll runs on them.
 */
export function PayCalendarDialog({ open, policyId, onClose }: PayCalendarDialogProps) {
  const { periods, isLoading, error, load } = usePayCalendar(policyId);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      title={
        <div>
          <h2 className="text-sm font-bold text-fg sm:text-base">Pay calendar</h2>
          <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">Next cycles from the published payroll-cycle configuration.</p>
        </div>
      }
      footer={
        <button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm">
          Close
        </button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-fg-muted">Building calendar…</p>
      ) : error ? (
        <p className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>
      ) : periods.length === 0 ? (
        <p className="text-xs text-fg-muted">No cycles to show — publish a version with a payroll cycle first.</p>
      ) : (
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th className="border-b border-line pb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Cycle start</th>
              <th className="border-b border-line pb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Cycle end</th>
              <th className="border-b border-line pb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Pay date</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={`${p.cycleStart}-${p.payDate}`}>
                <td className="border-b border-line/50 py-2 text-xs text-fg-muted">{p.cycleStart}</td>
                <td className="border-b border-line/50 py-2 text-xs text-fg-muted">{p.cycleEnd}</td>
                <td className="border-b border-line/50 py-2 text-xs font-semibold text-fg">{p.payDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Dialog>
  );
}
