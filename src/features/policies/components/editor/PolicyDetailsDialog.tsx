'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';
import type { PolicyDetail } from '../../types/policies.model';

interface PolicyDetailsDialogProps {
  open: boolean;
  policy: PolicyDetail;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (input: { name: string; description: string; effectiveFrom: string; subOrganizationId: number | null }) => void;
}

const inputCls = 'w-full min-w-0 rounded-lg border bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors';
const idleBorder = 'border-line focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';
const errorBorder = 'border-[var(--tt-danger)] focus:border-[var(--tt-danger)] focus:ring-1 focus:ring-[var(--tt-danger)]';
const labelCls = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';

/**
 * Name, description, sub-organization and the draft's effective date. The code is immutable
 * once created — it is what legacy rows and assignments refer to — so it is
 * shown read-only rather than left out.
 */
export function PolicyDetailsDialog({ open, policy, isSaving, onClose, onConfirm }: PolicyDetailsDialogProps) {
  const { isOrgAdmin } = usePermission();
  const [name, setName] = React.useState(policy.name);
  const [description, setDescription] = React.useState(policy.description ?? '');
  const [effectiveFrom, setEffectiveFrom] = React.useState(policy.draftVersion?.effectiveFrom ?? policy.currentVersion?.effectiveFrom ?? '');
  const [subOrganizationId, setSubOrganizationId] = React.useState<number | null>(policy.subOrganizationId ?? null);
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(policy.name);
    setDescription(policy.description ?? '');
    setEffectiveFrom((policy.draftVersion?.effectiveFrom ?? policy.currentVersion?.effectiveFrom ?? '').slice(0, 10));
    setSubOrganizationId(policy.subOrganizationId ?? null);
    setTouched(false);
  }, [open, policy]);

  const nameMissing = !name.trim();

  const submit = () => {
    if (nameMissing) {
      setTouched(true);
      return;
    }
    onConfirm({ name: name.trim(), description: description.trim(), effectiveFrom, subOrganizationId });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit policy details"
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
            <span>Save</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Policy name <span className="text-[var(--tt-danger)]">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            autoFocus
            className={cx(inputCls, 'h-10', touched && nameMissing ? errorBorder : idleBorder)}
          />
          {touched && nameMissing && <p className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">Policy name is required</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Code</label>
            <input type="text" value={policy.code} readOnly disabled className={cx(inputCls, 'h-10 cursor-not-allowed bg-bg-subtle', idleBorder)} />
          </div>
          <div>
            <label className={labelCls}>Draft effective from</label>
            <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className={cx(inputCls, 'h-10', idleBorder)} />
          </div>
        </div>

        <SubOrgPicker value={subOrganizationId} onChange={setSubOrganizationId} allowShared={isOrgAdmin} />

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={cx(inputCls, 'resize-none py-3 text-xs sm:text-sm', idleBorder)}
          />
        </div>
      </div>
    </Dialog>
  );
}
