'use client';

import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { TextField } from '@/components/ui/FormControls';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { usePermission } from '@/lib/hooks/usePermission';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import { EMPLOYEE_PERMISSIONS } from '@/features/employees/constants/employees.constants';
import { CATALOG_COPY } from '../constants/jobCatalogs.constants';
import { useJobCatalog } from '../hooks/useJobCatalog';
import type { CatalogFormInput, CatalogItem, CatalogKind } from '../types/jobCatalogs.model';

type Draft = CatalogFormInput & { id: number | null };

const blank = (subOrgId: number | null): Draft => ({ id: null, name: '', code: '', description: '', displayOrder: '', status: 'active', subOrganizationId: subOrgId });

const draftOf = (item: CatalogItem): Draft => ({
  id: item.id,
  name: item.name,
  code: item.code,
  description: item.description || '',
  displayOrder: String(item.displayOrder),
  status: item.status,
  subOrganizationId: item.subOrganizationId,
});

/** Settings page for a simple employee catalog (grades or cost centres), laid out like Employment types. */
export function JobCatalogPage({ kind }: { kind: CatalogKind }) {
  const copy = CATALOG_COPY[kind];
  const { isOrgAdmin, can } = usePermission();
  const canEdit = can(EMPLOYEE_PERMISSIONS.EDIT);
  const { subOrgs } = useManageableSubOrgs();
  const catalog = useJobCatalog(kind);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);

  const edit = (next: Draft | null) => {
    catalog.clearErrors();
    setDraft(next);
  };

  const save = async () => {
    if (!draft) return;
    if (await catalog.save(draft.id, draft)) setDraft(null);
  };

  const askRemove = (item: CatalogItem) => setConfirm({
    title: `Delete ${copy.noun}?`,
    body: <p className="text-sm text-fg">{item.name} will be removed. This cannot be undone.</p>,
    cta: 'Delete',
    danger: true,
    run: () => catalog.remove(item),
  });

  const { errors, items } = catalog;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">{copy.title}</h1>
          {items && (
            <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted 2xl:text-sm">{items.length}</span>
          )}
        </div>
        {canEdit && !draft && (
          <button
            type="button"
            onClick={() => edit(blank(subOrgs.length === 1 && !isOrgAdmin ? subOrgs[0].id : null))}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm 2xl:h-10"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add {copy.noun}</span>
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-line bg-surface p-3 tt-scroll-hidden sm:p-4">
        <p className="text-xs text-fg-muted">{copy.intro}</p>

        {draft && (
          <div className="space-y-3 rounded-lg border border-line p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TextField label="Name" required value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} error={errors.name} placeholder={copy.example} maxLength={80} autoFocus />
              <TextField label="Code" value={draft.code} onChange={(v) => setDraft({ ...draft, code: v.toUpperCase() })} error={errors.code} hint="Auto from name if empty" maxLength={20} />
              <TextField label="Order" type="number" min={0} max={9999} value={draft.displayOrder} onChange={(v) => setDraft({ ...draft, displayOrder: v })} error={errors.display_order} hint="Lower shows first" />
            </div>
            <TextField label="Description" value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} maxLength={255} />
            {!draft.id && subOrgs.length > 0 && (
              <select value={draft.subOrganizationId ?? ''} onChange={(e) => setDraft({ ...draft, subOrganizationId: e.target.value ? Number(e.target.value) : null })} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg">
                {isOrgAdmin && <option value="">All sub-organizations</option>}
                {subOrgs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <label className="flex items-center gap-2 text-sm text-fg">
              <input type="checkbox" checked={draft.status === 'active'} onChange={(e) => setDraft({ ...draft, status: e.target.checked ? 'active' : 'inactive' })} />
              Active
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => edit(null)} className="h-9 rounded-lg border border-line px-3.5 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm">Cancel</button>
              <button type="button" disabled={catalog.saving} onClick={save} className="h-9 rounded-lg bg-[var(--tt-primary)] px-3.5 text-xs font-semibold text-[var(--tt-on-primary)] disabled:opacity-40 sm:text-sm">Save</button>
            </div>
          </div>
        )}

        {catalog.loadError ? (
          <p className="text-sm text-[var(--tt-danger)]">{catalog.loadError}</p>
        ) : (
          <ul className="divide-y divide-line/60 rounded-lg border border-line">
            {items === null && <li className="h-12 animate-pulse bg-bg-subtle" />}
            {items?.length === 0 && <li className="px-3 py-6 text-center text-sm text-fg-muted">No {copy.noun}s yet.</li>}
            {items?.map((t) => (
              <li key={t.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-fg">{t.name}<SubOrgBadge subOrgId={t.subOrganizationId} /></p>
                    <p className="text-[11px] text-fg-muted">
                      {[t.code, t.description, `${t.employeeCount} employees`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusPill label={t.status} tone={t.status === 'active' ? 'active' : 'inactive'} />
                    {canEdit && (
                      <button type="button" aria-label={`Edit ${t.name}`} onClick={() => edit(draftOf(t))} className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button type="button" aria-label={`Delete ${t.name}`} onClick={() => askRemove(t)} className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {catalog.rowError?.id === t.id && <p role="alert" className="mt-1 text-xs font-medium text-[var(--tt-danger)]">{catalog.rowError.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
