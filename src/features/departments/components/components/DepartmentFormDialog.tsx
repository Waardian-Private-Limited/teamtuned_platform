'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import type { Department, DepartmentFormInput, DepartmentStatus } from '../../types/departments.model';
import type { FieldError } from '../../hooks/useDepartmentMutations';

interface DepartmentFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Department;
  isSaving: boolean;
  fieldError: FieldError | null;
  onClose: () => void;
  onSubmit: (input: DepartmentFormInput) => void;
}

export function DepartmentFormDialog({
  open,
  mode,
  initial,
  isSaving,
  fieldError,
  onClose,
  onSubmit,
}: DepartmentFormDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<DepartmentStatus>('active');

  // Re-seed from `initial` every time the dialog opens
  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setStatus(initial?.status ?? 'active');
  }, [open, initial]);

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), status });
  };

  const titleNode = (
    <div>
      <h2 className="text-sm font-bold text-fg sm:text-base">
        {mode === 'create' ? 'Create Department' : 'Edit Department'}
      </h2>
      <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
        {mode === 'create'
          ? 'Define a new organizational unit for your teams and workflows'
          : 'Modify department details and active status'}
      </p>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titleNode}
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
            onClick={submit}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>{mode === 'create' ? 'Create Department' : 'Save changes'}</span>
          </button>
        </>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {/* Department Name */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold text-fg sm:text-[13px]">
              Department Name <span className="text-[var(--tt-danger)]">*</span>
            </label>
          </div>
          <div className="relative flex h-10 w-full items-center rounded-lg border border-line bg-surface px-3 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Engineering, People Ops, Operations"
              className="w-full min-w-0 border-none bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-0"
              autoFocus
            />
          </div>
          {fieldError?.field === 'name' ? (
            <p className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{fieldError.message}</p>
          ) : (
            <p className="mt-1 text-[11px] text-fg-muted">Must be unique within your organization.</p>
          )}
        </div>

        {/* Description */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold text-fg sm:text-[13px]">Description</label>
            <span className="text-[11px] text-fg-subtle">Optional</span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the department's responsibilities, scope, or focus…"
            rows={3}
            className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-xs text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-sm"
          />
        </div>

        {/* Status Option Cards */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Status</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setStatus('active')}
              className={cx(
                'flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
                status === 'active'
                  ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                  : 'border-line bg-surface hover:bg-bg-subtle'
              )}
            >
              <span className="flex h-2 w-2 shrink-0 rounded-full bg-[var(--tt-success)]" />
              <div>
                <div className="text-xs font-semibold text-fg">Active</div>
                <div className="text-[11px] text-fg-muted">Ready for assignments</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatus('inactive')}
              className={cx(
                'flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
                status === 'inactive'
                  ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                  : 'border-line bg-surface hover:bg-bg-subtle'
              )}
            >
              <span className="flex h-2 w-2 shrink-0 rounded-full bg-slate-400" />
              <div>
                <div className="text-xs font-semibold text-fg">Inactive</div>
                <div className="text-[11px] text-fg-muted">Hidden from assignments</div>
              </div>
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

