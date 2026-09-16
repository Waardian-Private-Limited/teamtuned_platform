'use client';

import React from 'react';
import { Plus, SquarePen, Trash2, Check, ArrowLeft } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Tooltip } from '@/components/ui/Tooltip';
import { text } from '@/theme/tokens';
import type { PermissionSet, PermissionCategory } from '../../types/roles.model';
import { PermissionTree } from './PermissionTree';

interface PermissionSetsDialogProps {
  open: boolean;
  sets: PermissionSet[];
  categories: PermissionCategory[];
  categoriesLoading: boolean;
  isSaving: boolean;
  fieldError: { field: 'name'; message: string } | null;
  onClose: () => void;
  onCreate: (input: { name: string; description: string; permissions: string[] }) => void;
  onUpdate: (id: number, input: { name: string; description: string; permissions: string[] }) => void;
  onDelete: (id: number) => void;
}

type View = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; set: PermissionSet };

export function PermissionSetsDialog({
  open,
  sets,
  categories,
  categoriesLoading,
  isSaving,
  fieldError,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: PermissionSetsDialogProps) {
  const [view, setView] = React.useState<View>({ mode: 'list' });
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) setView({ mode: 'list' });
  }, [open]);

  const openCreate = () => {
    setName('');
    setDescription('');
    setSelected(new Set());
    setView({ mode: 'create' });
  };

  const openEdit = (set: PermissionSet) => {
    setName(set.name);
    setDescription(set.description ?? '');
    setSelected(new Set(set.permissions));
    setView({ mode: 'edit', set });
  };

  const submit = () => {
    const input = { name: name.trim(), description: description.trim(), permissions: Array.from(selected) };
    if (view.mode === 'create') onCreate(input);
    else if (view.mode === 'edit') onUpdate(view.set.id, input);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Permission Sets" maxWidthClassName="max-w-xl">
      {view.mode === 'list' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className={text.body}>Reusable bundles of permissions for the bulk-apply drawer.</p>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[var(--tt-primary)] px-2.5 text-xs font-semibold text-[var(--tt-on-primary)] transition-all hover:bg-[var(--tt-primary-hover)]"
            >
              <Plus className="h-3.5 w-3.5" />
              New set
            </button>
          </div>

          {sets.length === 0 ? (
            <p className="rounded-lg border border-line bg-bg-subtle px-3 py-6 text-center text-sm text-fg-muted">
              No permission sets yet.
            </p>
          ) : (
            <ul className="divide-y divide-line/60 rounded-lg border border-line">
              {sets.map((set) => (
                <li key={set.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{set.name}</span>
                    <span className="block truncate text-xs text-fg-muted">{set.permissions.length} permission{set.permissions.length === 1 ? '' : 's'}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Tooltip content="Edit set">
                      <button type="button" onClick={() => openEdit(set)} className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
                        <SquarePen className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete set" align="end">
                      <button type="button" onClick={() => onDelete(set.id)} className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <button type="button" onClick={() => setView({ mode: 'list' })} className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-fg">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sets
          </button>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Set name</label>
            <div className="flex h-10 items-center rounded-lg border border-line bg-surface px-3 focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none focus:ring-0" autoFocus />
            </div>
            {fieldError && <p className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{fieldError.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-xs text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">
              Permissions <span className="font-normal text-fg-muted">({selected.size} selected)</span>
            </label>
            <PermissionTree categories={categories} selected={selected} onChange={setSelected} isLoading={categoriesLoading} />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setView({ mode: 'list' })} className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm">
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving || !name.trim()}
              onClick={submit}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            >
              {isSaving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Check className="h-3.5 w-3.5" />}
              {view.mode === 'create' ? 'Create set' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
