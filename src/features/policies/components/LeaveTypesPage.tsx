'use client';

import React from 'react';
import { Plus, Sparkles, SquarePen, Trash2 } from 'lucide-react';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { StatusPill } from '@/components/ui/StatusPill';
import { useLeaveTypeList } from '../hooks/useLeaveTypeList';
import { useLeaveTypeMutations } from '../hooks/useLeaveTypeMutations';
import { POLICY_PERMISSIONS, LEAVE_TYPE_CATEGORY_OPTIONS } from '../constants/policies.constants';
import type { LeaveType, LeaveTypeFormInput } from '../types/policies.model';

function LeaveTypeFormDialog({
  open, initial, isSaving, onClose, onSubmit,
}: {
  open: boolean;
  initial?: LeaveType;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: LeaveTypeFormInput) => void;
}) {
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [category, setCategory] = React.useState<LeaveTypeFormInput['category']>('paid');

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setCode(initial?.code ?? '');
    setCategory(initial?.category ?? 'paid');
  }, [open, initial]);

  const submit = () => {
    if (!name.trim() || !code.trim()) return;
    onSubmit({ name: name.trim(), code: code.trim(), category, unit: 'day', isPaid: category === 'paid', requiresApproval: true, allowHalfDay: true, status: 'active' });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? 'Edit Leave Type' : 'Create Leave Type'}
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || !name.trim() || !code.trim()}
            onClick={submit}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:opacity-40 sm:text-sm"
          >
            {isSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            <span>{initial ? 'Save changes' : 'Create'}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]" autoFocus />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Code</label>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={!!initial} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] disabled:opacity-50" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {LEAVE_TYPE_CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={cx('rounded-lg border p-2 text-left text-[11px] font-semibold transition-all', category === opt.value ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)] text-fg' : 'border-line text-fg-muted hover:bg-bg-subtle')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export function LeaveTypesPage() {
  const { can } = usePermission();
  const canAdd = can(POLICY_PERMISSIONS.ADD);
  const canEdit = can(POLICY_PERMISSIONS.EDIT);
  const canDelete = can(POLICY_PERMISSIONS.DELETE);

  const list = useLeaveTypeList();
  const mutations = useLeaveTypeMutations(list.refetch);

  const [formState, setFormState] = React.useState<{ mode: 'create' | 'edit'; leaveType?: LeaveType } | null>(null);

  const handleSubmit = async (input: LeaveTypeFormInput) => {
    const ok = formState?.mode === 'edit' && formState.leaveType
      ? await mutations.updateLeaveType(formState.leaveType.id, input)
      : await mutations.createLeaveType(input);
    if (ok) setFormState(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5">
        <div>
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg">Leave Types</h1>
          <p className="mt-0.5 text-xs text-fg-muted">The catalogue every leave policy's rules reference — annual, sick, casual, and every statutory/special type.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => mutations.seedCatalog()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm">
            <Sparkles className="h-3.5 w-3.5" /> Apply global catalogue
          </button>
          {canAdd && (
            <button type="button" onClick={() => setFormState({ mode: 'create' })} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] sm:text-sm">
              <Plus className="h-3.5 w-3.5" /> New Leave Type
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-line bg-surface">
        {list.error && <div className="border-b border-line p-3"><Alert message={list.error} tone="error" /></div>}
        {list.isLoading ? (
          <div className="p-6 text-sm text-fg-muted">Loading…</div>
        ) : (
          <div className="h-full overflow-auto tt-scroll-hidden">
            <table className="w-full min-w-[520px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-bg-subtle">
                <tr>
                  <th className="border-b border-line px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">Name</th>
                  <th className="border-b border-line px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">Code</th>
                  <th className="border-b border-line px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">Category</th>
                  <th className="border-b border-line px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">Status</th>
                  <th className="border-b border-line px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-fg-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.leaveTypes.map((lt) => (
                  <tr key={lt.id} className="hover:bg-bg-subtle/50">
                    <td className="border-b border-line/60 px-4 py-2.5 text-sm font-medium text-fg">
                      {lt.name}
                      {lt.isSystem && <span className="ml-2 rounded-full border border-line bg-bg-subtle px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">System</span>}
                    </td>
                    <td className="border-b border-line/60 px-4 py-2.5 text-sm text-fg-muted"><code>{lt.code}</code></td>
                    <td className="border-b border-line/60 px-4 py-2.5 text-sm capitalize text-fg-muted">{lt.category}</td>
                    <td className="border-b border-line/60 px-4 py-2.5"><StatusPill label={lt.status} tone={lt.status} /></td>
                    <td className="border-b border-line/60 px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button type="button" onClick={() => setFormState({ mode: 'edit', leaveType: lt })} className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg" aria-label="Edit">
                            <SquarePen className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && !lt.isSystem && (
                          <button type="button" onClick={() => mutations.deleteLeaveType(lt.id)} className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]" aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LeaveTypeFormDialog open={Boolean(formState)} initial={formState?.leaveType} isSaving={mutations.isSaving} onClose={() => setFormState(null)} onSubmit={handleSubmit} />
    </div>
  );
}
