'use client';

import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import type { Role, RoleFormInput, RoleStatus, PermissionCategory } from '../../types/roles.model';
import type { FieldError } from '../../hooks/useRoleMutations';
import { PermissionTree } from './PermissionTree';

interface DepartmentOption {
  id: number;
  name: string;
}

interface RoleFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Role;
  departments: DepartmentOption[];
  categories: PermissionCategory[];
  categoriesLoading: boolean;
  isSaving: boolean;
  fieldError: FieldError | null;
  onClose: () => void;
  onSubmit: (input: RoleFormInput) => void;
}

// Two logical steps in one scrollable dialog (not a wizard): role details up
// top, permission tree below — so the form never blocks the reviewer from
// seeing both at once, unlike the legacy 2-step modal it replaces.
export function RoleFormDialog({
  open,
  mode,
  initial,
  departments,
  categories,
  categoriesLoading,
  isSaving,
  fieldError,
  onClose,
  onSubmit,
}: RoleFormDialogProps) {
  const [name, setName] = React.useState('');
  const [departmentId, setDepartmentId] = React.useState<number | null>(null);
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<RoleStatus>('active');
  const [selectedPerms, setSelectedPerms] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setDepartmentId(initial?.departmentId ?? null);
    setDescription(initial?.description ?? '');
    setStatus(initial?.status ?? 'active');
    setSelectedPerms(new Set(initial?.permissions ?? []));
  }, [open, initial]);

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), departmentId, description: description.trim(), status, permissions: Array.from(selectedPerms) });
  };

  const titleNode = (
    <div>
      <h2 className="text-sm font-bold text-fg sm:text-base">{mode === 'create' ? 'Create Role' : 'Edit Role'}</h2>
      <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
        {mode === 'create' ? 'Define a new role and the permissions it grants' : 'Modify role details and permissions'}
      </p>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titleNode}
      maxWidthClassName="max-w-2xl"
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
            <span>{mode === 'create' ? 'Create Role' : 'Save changes'}</span>
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
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">
            Role Name <span className="text-[var(--tt-danger)]">*</span>
          </label>
          <div className="relative flex h-10 w-full items-center rounded-lg border border-line bg-surface px-3 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Site Supervisor, HR Executive"
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Department</label>
            <div className="relative">
              <select
                value={departmentId ?? ''}
                onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)}
                className="h-10 w-full appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-sm text-fg outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] cursor-pointer"
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Status</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={cx(
                  'flex h-10 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-all',
                  status === 'active'
                    ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)] text-fg'
                    : 'border-line bg-surface text-fg-muted hover:bg-bg-subtle'
                )}
              >
                <span className="h-2 w-2 rounded-full bg-[var(--tt-success)]" />
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={cx(
                  'flex h-10 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-all',
                  status === 'inactive'
                    ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)] text-fg'
                    : 'border-line bg-surface text-fg-muted hover:bg-bg-subtle'
                )}
              >
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Inactive
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold text-fg sm:text-[13px]">Description</label>
            <span className="text-[11px] text-fg-subtle">Optional</span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this role is for…"
            rows={2}
            className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-xs text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">
            Permissions <span className="text-fg-muted font-normal">({selectedPerms.size} selected)</span>
          </label>
          <PermissionTree categories={categories} selected={selectedPerms} onChange={setSelectedPerms} isLoading={categoriesLoading} />
        </div>
      </form>
    </Dialog>
  );
}
