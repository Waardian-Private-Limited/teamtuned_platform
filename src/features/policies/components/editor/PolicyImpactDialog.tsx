'use client';

import { AlertTriangle, Rocket } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import type { PolicyImpact } from '../../types/policies.model';

interface PolicyImpactDialogProps {
  open: boolean;
  impact: PolicyImpact | null;
  isLoading: boolean;
  isPublishing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * The user-visible half of the balance-safety guarantee: shows exactly who
 * is affected and by how much before a leave policy goes live, computed by
 * the same PreviewEntitlementImpact use-case the backend uses to decide
 * whether a recalculation would claw back already-used leave.
 */
export function PolicyImpactDialog({ open, impact, isLoading, isPublishing, onClose, onConfirm }: PolicyImpactDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Publish this version?"
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
            disabled={isPublishing || isLoading}
            onClick={onConfirm}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isPublishing ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Rocket className="h-3.5 w-3.5" />}
            <span>Publish</span>
          </button>
        </>
      }
    >
      {isLoading ? (
        <p className="text-sm text-fg-muted">Calculating impact…</p>
      ) : impact ? (
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">
            <span className="font-semibold text-fg">{impact.affectedEmployeeCount}</span> employee{impact.affectedEmployeeCount === 1 ? '' : 's'} will have their entitlement recalculated when this goes live.
          </p>

          {impact.warnings.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-[var(--tt-warning)]/30 bg-[var(--tt-warning)]/5 p-3">
              {impact.warnings.map((w, i) => (
                <p key={i} className="flex items-start gap-1.5 text-xs text-fg-muted">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tt-warning)]" />
                  {w.message}
                </p>
              ))}
            </div>
          )}

          {impact.sampleDeltas.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-line tt-scroll-hidden">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-bg-subtle">
                  <tr>
                    <th className="px-2.5 py-1.5 text-left font-semibold text-fg-muted">Employee</th>
                    <th className="px-2.5 py-1.5 text-right font-semibold text-fg-muted">Current</th>
                    <th className="px-2.5 py-1.5 text-right font-semibold text-fg-muted">New</th>
                    <th className="px-2.5 py-1.5 text-right font-semibold text-fg-muted">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {impact.sampleDeltas.map((d, i) => (
                    <tr key={i}>
                      <td className="px-2.5 py-1.5 text-fg">#{d.employeeId}</td>
                      <td className="px-2.5 py-1.5 text-right text-fg-muted">{d.current}</td>
                      <td className="px-2.5 py-1.5 text-right text-fg-muted">{d.projected}</td>
                      <td className={`px-2.5 py-1.5 text-right font-semibold ${d.delta > 0 ? 'text-[var(--tt-success)]' : d.delta < 0 ? 'text-[var(--tt-danger)]' : 'text-fg-muted'}`}>
                        {d.delta > 0 ? '+' : ''}{d.delta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-fg-muted">This will replace the current live configuration for every employee assigned to this policy.</p>
      )}
    </Dialog>
  );
}
