'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';

interface CreateTrackingPolicyDialogProps {
  open: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    description?: string;
    subOrganizationId?: number | null;
    isDefault?: boolean;
  }) => void;
}

export function CreateTrackingPolicyDialog({
  open,
  isSaving,
  onClose,
  onSubmit,
}: CreateTrackingPolicyDialogProps) {
  const { isOrgAdmin } = usePermission();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isDefault, setIsDefault] = React.useState(false);
  const [subOrganizationId, setSubOrganizationId] = React.useState<number | null>(null);
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setIsDefault(false);
      setSubOrganizationId(null);
      setTouched(false);
    }
  }, [open]);

  const nameError = touched && !name.trim();

  const handleCreate = () => {
    if (!name.trim()) {
      setTouched(true);
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      subOrganizationId,
      isDefault,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create Tracking Policy"
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
            onClick={handleCreate}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span>Create Policy</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">
            Policy Name <span className="text-[var(--tt-danger)]">*</span>
          </label>
          <div
            className={`flex h-10 items-center rounded-lg border bg-surface px-3 transition-colors ${
              nameError
                ? 'border-[var(--tt-danger)] ring-1 ring-[var(--tt-danger)]'
                : 'border-line focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]'
            }`}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g., Field Staff, Delivery Agents, Executives"
              className="w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none focus:ring-0 placeholder:text-fg-subtle"
              autoFocus
            />
          </div>
          {nameError && (
            <p className="mt-1 text-xs text-[var(--tt-danger)]">Policy name is required</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">
            Description <span className="text-fg-subtle font-normal">(Optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what team or department this policy applies to..."
            rows={3}
            className="w-full min-w-0 rounded-lg border border-line bg-surface p-3 text-xs sm:text-sm text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] placeholder:text-fg-subtle resize-none"
          />
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

        <p className="text-[11px] text-fg-muted">
          The policy is initialized with safe default rules (work hours tracking, 15m intervals). You can customize geofence, accuracy, and rules in the editor.
        </p>
      </div>
    </Dialog>
  );
}
