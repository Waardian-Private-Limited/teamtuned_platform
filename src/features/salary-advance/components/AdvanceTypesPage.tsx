'use client';

import React from 'react';
import { Plus, Power, Search, SquarePen } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { ILLUSTRATIONS, KIND_LABEL, SALARY_ADVANCE_PERMISSIONS } from '../constants/salaryAdvance.constants';
import { useAdvanceTypes, type AdvanceTypeStatusFilter } from '../hooks/useAdvanceTypes';
import type { AdvanceType, AdvanceTypeFormInput } from '../types/salaryAdvance.model';
import { AdvanceTypeFormDialog } from './components/AdvanceTypeFormDialog';
import { NoAccess } from './components/NoAccess';

const STATUS_OPTIONS: ReadonlyArray<{ value: AdvanceTypeStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const th = 'border-b border-line bg-bg-subtle px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted sm:px-4 sm:py-3 2xl:px-6 2xl:text-xs';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 2xl:px-6';
const iconBtn = 'rounded-[var(--tt-radius-sm)] p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';

export function AdvanceTypesPage() {
  const { can } = usePermission();
  if (!can(SALARY_ADVANCE_PERMISSIONS.POLICY)) return <NoAccess what="advance types" />;
  return <Types />;
}

function RowActions({ type, onEdit, onToggle, toggling }: { type: AdvanceType; onEdit: () => void; onToggle: () => void; toggling: boolean }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip content="Edit">
        <button type="button" aria-label={`Edit ${type.name}`} onClick={onEdit} className={iconBtn}>
          <SquarePen className="h-4 w-4" />
        </button>
      </Tooltip>
      <Tooltip content={type.status === 'active' ? 'Deactivate' : 'Activate'} align="end">
        <button type="button" aria-label={type.status === 'active' ? `Deactivate ${type.name}` : `Activate ${type.name}`} disabled={toggling} onClick={onToggle} className={iconBtn}>
          {toggling ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Power className="h-4 w-4" />}
        </button>
      </Tooltip>
    </div>
  );
}

function Types() {
  const t = useAdvanceTypes();
  const [editing, setEditing] = React.useState<{ type: AdvanceType | null } | null>(null);
  const { clearFormErrors } = t;

  const open = (type: AdvanceType | null) => {
    clearFormErrors();
    setEditing({ type });
  };
  const close = () => {
    setEditing(null);
    clearFormErrors();
  };
  const submit = async (input: AdvanceTypeFormInput) => {
    if (await t.save(input, editing?.type?.id)) setEditing(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between 2xl:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Advance types</h1>
            <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted">{t.types.length}</span>
          </div>
          <button type="button" onClick={() => open(null)} className="inline-flex h-8.5 items-center gap-1 rounded-lg bg-[var(--tt-primary)] px-2.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:hidden">
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-56 2xl:h-10">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input value={t.searchInput} onChange={(e) => t.setSearchInput(e.target.value)} placeholder="Search types…" className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm" />
          </div>
          <div className="w-full sm:w-48">
            <SegmentedControl options={STATUS_OPTIONS} value={t.status} onChange={t.setStatus} />
          </div>
          <SubOrgFilter value={t.subOrgId} onChange={t.setSubOrgId} />
          <button type="button" onClick={() => open(null)} className="hidden h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:inline-flex sm:text-sm 2xl:h-10">
            <Plus className="h-3.5 w-3.5" />
            New type
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {t.error && <p role="alert" className="border-b border-line px-4 py-3 text-xs font-medium text-[var(--tt-danger)] sm:text-sm">{t.error}</p>}
        {t.isInitialLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : t.types.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6">
            {t.hasActiveFilters ? (
              <EmptyState illustration={ILLUSTRATIONS.flow} title="No matching types" description="Nothing matches the current search or status." action={{ label: 'Clear filters', onClick: t.clearFilters, variant: 'link' }} />
            ) : (
              <EmptyState
                illustration={ILLUSTRATIONS.flow}
                title="No advance types yet"
                description="Create types such as Salary advance, Emergency loan or Festival advance. Each gets its own rules in Policies."
                action={{ label: 'New type', onClick: () => open(null) }}
              />
            )}
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-auto tt-scroll-hidden transition-opacity duration-200 md:block', t.isFetching ? 'opacity-75' : 'opacity-100')}>
              <table className="w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-bg-subtle">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Code</th>
                    <th className={th}>Kind</th>
                    <th className={th}>Status</th>
                    <th className={cx(th, 'text-right')}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {t.types.map((type) => (
                    <tr key={type.id} className="transition-colors hover:bg-bg-subtle/50">
                      <td className={td}>
                        <div className="text-xs font-semibold text-fg sm:text-sm">{type.name}</div>
                        {type.description && <div className="mt-0.5 max-w-md truncate text-[11px] text-fg-muted sm:text-xs" title={type.description}>{type.description}</div>}
                      </td>
                      <td className={cx(td, 'font-mono text-xs text-fg-muted')}>{type.code}</td>
                      <td className={cx(td, 'text-xs text-fg sm:text-sm')}>{KIND_LABEL[type.kind]}</td>
                      <td className={td}><StatusPill label={type.status} tone={type.status === 'active' ? 'active' : 'neutral'} /></td>
                      <td className={td}>
                        <RowActions type={type} onEdit={() => open(type)} onToggle={() => t.toggleStatus(type)} toggling={t.togglingId === type.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden transition-opacity duration-200 md:hidden', t.isFetching ? 'opacity-75' : 'opacity-100')}>
              {t.types.map((type) => (
                <li key={type.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">{type.name}</p>
                    <p className="mt-0.5 truncate text-xs text-fg-muted">{type.code} · {KIND_LABEL[type.kind]}</p>
                    <div className="mt-2"><StatusPill label={type.status} tone={type.status === 'active' ? 'active' : 'neutral'} /></div>
                  </div>
                  <RowActions type={type} onEdit={() => open(type)} onToggle={() => t.toggleStatus(type)} toggling={t.togglingId === type.id} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <AdvanceTypeFormDialog
        open={Boolean(editing)}
        initial={editing?.type ?? null}
        isSaving={t.isSaving}
        fieldErrors={t.fieldErrors}
        formError={t.formError}
        onFieldErrors={t.setFieldErrors}
        onClose={close}
        onSubmit={submit}
      />
    </div>
  );
}
