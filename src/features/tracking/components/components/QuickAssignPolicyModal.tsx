'use client';

import React from 'react';
import { Check, Shield } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import type { TrackedEmployeeDto, TrackingPolicyDto } from '../../types/tracking.dto';

interface QuickAssignPolicyModalProps {
  open: boolean;
  employee: TrackedEmployeeDto | null;
  policies: TrackingPolicyDto[];
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (policyId: number | null) => void;
}

export function QuickAssignPolicyModal({
  open,
  employee,
  policies,
  isSaving,
  onClose,
  onConfirm,
}: QuickAssignPolicyModalProps) {
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (open && employee) {
      setSelectedId(employee.policy_id ?? null);
    }
  }, [open, employee]);

  if (!employee) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Assign Tracking Policy — ${employee.name}`}
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
            disabled={isSaving}
            onClick={() => onConfirm(selectedId)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-fg px-4.5 text-xs font-semibold text-bg shadow-xs transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>Save</span>
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-fg-muted sm:text-sm">
          Select which tracking policy will apply to <strong className="text-fg">{employee.name}</strong>.
        </p>

        <div className="space-y-2">
          {/* Default Policy Option */}
          <label
            className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
              selectedId === null
                ? 'border-line-strong bg-bg-subtle'
                : 'border-line bg-surface hover:bg-bg-subtle/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="quick_policy"
                checked={selectedId === null}
                onChange={() => setSelectedId(null)}
                className="h-4 w-4 text-fg focus:ring-fg"
              />
              <div>
                <p className="text-xs font-semibold text-fg">Default Policy (Automatic)</p>
                <p className="text-[11px] text-fg-muted">
                  Follows organization or sub-organization baseline rules
                </p>
              </div>
            </div>
            <span className="rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
              Default
            </span>
          </label>

          {/* Specific Policies */}
          {policies.map((p) => {
            const isSelected = selectedId === p.id;
            return (
              <label
                key={p.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-line-strong bg-bg-subtle'
                    : 'border-line bg-surface hover:bg-bg-subtle/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="quick_policy"
                    checked={isSelected}
                    onChange={() => setSelectedId(p.id)}
                    className="h-4 w-4 text-fg focus:ring-fg"
                  />
                  <div>
                    <p className="text-xs font-semibold text-fg">{p.name}</p>
                    <p className="text-[11px] text-fg-muted">
                      {p.description || `Revision r${p.revision}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-fg-muted font-medium">
                  <Shield className="h-3.5 w-3.5 text-fg-muted" />
                  <span>r{p.revision}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
