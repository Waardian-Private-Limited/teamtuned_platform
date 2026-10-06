'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';
import type { TrackingPolicyDto } from '../../types/tracking.dto';

interface TrackingPolicyDetailsDialogProps {
  open: boolean;
  policy: TrackingPolicyDto;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (input: {
    name: string;
    description: string;
    subOrganizationId: number | null;
    isDefault: boolean;
  }) => void;
}

const inputCls =
  'w-full min-w-0 rounded-lg border bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors';
const idleBorder =
  'border-line focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';
const errorBorder =
  'border-[var(--tt-danger)] focus:border-[var(--tt-danger)] focus:ring-1 focus:ring-[var(--tt-danger)]';
const labelCls = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';

export function TrackingPolicyDetailsDialog({
  open,
  policy,
  isSaving,
  onClose,
  onConfirm,
}: TrackingPolicyDetailsDialogProps) {
  const { isOrgAdmin } = usePermission();
  const [name, setName] = React.useState(policy.name);
  const [description, setDescription] = React.useState(policy.description ?? '');
  const [subOrganizationId, setSubOrganizationId] = React.useState<number | null>(
    policy.sub_organization_id ?? null
  );
  const [isDefault, setIsDefault] = React.useState(policy.is_default);
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(policy.name);
    setDescription(policy.description ?? '');
    setSubOrganizationId(policy.sub_organization_id ?? null);
    setIsDefault(policy.is_default);
    setTouched(false);
  }, [open, policy]);

  const nameMissing = !name.trim();

  const submit = () => {
    if (nameMissing) {
      setTouched(true);
      return;
    }
    onConfirm({
      name: name.trim(),
      description: description.trim(),
      subOrganizationId,
      isDefault,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit policy details"
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
            onClick={submit}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
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
      <div className="space-y-4">
        <div>
          <label className={labelCls}>
            Policy name <span className="text-[var(--tt-danger)]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            autoFocus
            className={cx(inputCls, 'h-10', touched && nameMissing ? errorBorder : idleBorder)}
          />
          {touched && nameMissing && (
            <p className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">Policy name is required</p>
          )}
        </div>

        <SubOrgPicker value={subOrganizationId} onChange={setSubOrganizationId} allowShared={isOrgAdmin} />

        <div className="rounded-lg border border-line bg-bg-subtle/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-fg">Set as default policy</p>
              <p className="text-[11px] text-fg-muted mt-0.5">
                Automatically applies to employees without an individual tracking policy assignment.
              </p>
            </div>
            <Switch checked={isDefault} onChange={setIsDefault} label="Set as default policy" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={cx(inputCls, 'resize-none py-3 text-xs sm:text-sm', idleBorder)}
            placeholder="Describe what team or department this policy applies to..."
          />
        </div>
      </div>
    </Dialog>
  );
}
