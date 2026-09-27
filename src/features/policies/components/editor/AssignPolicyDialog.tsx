'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { useScopeTargets } from '../../hooks/useScopeTargets';
import { SCOPE_TYPE_OPTIONS, SCOPE_TYPES_WITHOUT_PICKER } from '../../constants/policies.constants';
import type { ScopeType } from '../../types/policies.model';
import type { AssignInput } from '../../hooks/usePolicyAssignments';

interface AssignPolicyDialogProps {
  open: boolean;
  policyName: string;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (input: AssignInput) => void;
}

const inputCls = 'h-9 w-full min-w-0 rounded-lg border bg-surface px-2.5 text-xs text-fg outline-none transition-colors sm:text-[13px]';
const labelCls = 'mb-1 block text-[11px] font-semibold text-fg-muted sm:text-xs';
const idleBorder = 'border-line focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';
const errorBorder = 'border-[var(--tt-danger)] focus:border-[var(--tt-danger)] focus:ring-1 focus:ring-[var(--tt-danger)]';

export function AssignPolicyDialog({ open, policyName, isSaving, onClose, onConfirm }: AssignPolicyDialogProps) {
  const [scopeType, setScopeType] = React.useState<ScopeType>('organization');
  const [scopeId, setScopeId] = React.useState<string>('');
  const [priority, setPriority] = React.useState('0');
  const [effectiveFrom, setEffectiveFrom] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = React.useState('');
  const [touched, setTouched] = React.useState(false);

  const { targets, isLoading: targetsLoading, error: targetsError } = useScopeTargets(scopeType);

  React.useEffect(() => {
    if (!open) return;
    setScopeType('organization');
    setScopeId('');
    setPriority('0');
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setEffectiveTo('');
    setTouched(false);
  }, [open]);

  React.useEffect(() => {
    setScopeId('');
  }, [scopeType]);

  const needsTarget = scopeType !== 'organization';
  const usesFreeId = (SCOPE_TYPES_WITHOUT_PICKER as readonly string[]).includes(scopeType);
  const targetMissing = needsTarget && !Number(scopeId);

  const submit = () => {
    if (targetMissing) {
      setTouched(true);
      return;
    }
    onConfirm({
      scopeType,
      scopeId: needsTarget ? Number(scopeId) : null,
      priority: Number(priority) || 0,
      effectiveFrom,
      effectiveTo: effectiveTo || null,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-fg sm:text-base">Assign policy</h2>
          <p className="mt-0.5 truncate text-[11px] text-fg-muted sm:text-xs">
            {policyName} — the most specific matching scope wins: employee, then role, department, site, sub-organization, employee type, organization.
          </p>
        </div>
      }
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={submit}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Check className="h-3.5 w-3.5" />}
            <span>Assign</span>
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Scope</label>
          <select value={scopeType} onChange={(e) => setScopeType(e.target.value as ScopeType)} className={cx(inputCls, idleBorder)}>
            {SCOPE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {needsTarget && (
          <div>
            <label className={labelCls}>{usesFreeId ? 'Target id' : 'Target'}</label>
            {usesFreeId ? (
              <input
                type="number"
                min={1}
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="e.g. 42"
                className={cx(inputCls, touched && targetMissing ? errorBorder : idleBorder)}
              />
            ) : (
              <select
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                onBlur={() => setTouched(true)}
                disabled={targetsLoading}
                className={cx(inputCls, touched && targetMissing ? errorBorder : idleBorder)}
              >
                <option value="">{targetsLoading ? 'Loading…' : 'Select…'}</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            )}
            {touched && targetMissing && <p className="mt-1 text-xs font-medium text-[var(--tt-danger)]">Pick what this policy applies to</p>}
            {targetsError && <p className="mt-1 text-xs font-medium text-[var(--tt-danger)]">{targetsError}</p>}
          </div>
        )}

        <div>
          <label className={labelCls}>Priority <span className="font-normal text-fg-subtle">(higher wins within a scope)</span></label>
          <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className={cx(inputCls, idleBorder)} />
        </div>

        <div>
          <label className={labelCls}>Effective from</label>
          <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className={cx(inputCls, idleBorder)} />
        </div>

        <div>
          <label className={labelCls}>Effective to <span className="font-normal text-fg-subtle">(optional)</span></label>
          <input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} className={cx(inputCls, idleBorder)} />
        </div>
      </div>
    </Dialog>
  );
}
