'use client';

import React from 'react';
import { Copy } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';
import type { TrackingPolicyDto } from '../../types/tracking.dto';

interface CloneTrackingPolicyDialogProps {
  open: boolean;
  policy: TrackingPolicyDto | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (name: string, subOrganizationId?: number | null) => void;
}

export function CloneTrackingPolicyDialog({
  open,
  policy,
  isSaving,
  onClose,
  onConfirm,
}: CloneTrackingPolicyDialogProps) {
  const { isOrgAdmin } = usePermission();
  const [name, setName] = React.useState('');
  const [subOrganizationId, setSubOrganizationId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (open && policy) {
      setName(`${policy.name} (Copy)`);
      setSubOrganizationId(policy.sub_organization_id ?? null);
    }
  }, [open, policy]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Duplicate Tracking Policy"
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
            disabled={isSaving || !name.trim()}
            onClick={() => onConfirm(name.trim(), subOrganizationId)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>Duplicate</span>
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-fg-muted">
        Creates a new tracking policy with the same configuration as{' '}
        <span className="font-semibold text-fg">{policy?.name}</span>. No employees are assigned automatically.
      </p>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">New policy name</label>
          <div className="flex h-10 items-center rounded-lg border border-line bg-surface px-3 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none focus:ring-0"
              autoFocus
            />
          </div>
        </div>
        <SubOrgPicker value={subOrganizationId} onChange={setSubOrganizationId} allowShared={isOrgAdmin} />
      </div>
    </Dialog>
  );
}
