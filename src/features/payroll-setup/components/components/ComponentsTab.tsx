'use client';

import React from 'react';
import { AlertTriangle, ArrowUpDown, Check, ChevronDown, ChevronUp, Plus, Search, SquarePen, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cx, text } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { StatusPill } from '@/components/ui/StatusPill';
import { Tooltip } from '@/components/ui/Tooltip';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Dialog } from '@/components/ui/Dialog';
import type { useComponentList } from '../../hooks/useComponentList';
import type { useComponentMutations } from '../../hooks/useComponentMutations';
import type { SalaryComponent, ComponentFormInput } from '../../types/payroll-setup.model';
import { STATUS_FILTER_OPTIONS, COMPONENT_TYPES } from '../../constants/payroll-setup.constants';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

interface ComponentsTabProps {
  list: ReturnType<typeof useComponentList>;
  mutations: ReturnType<typeof useComponentMutations>;
  perms: { canAdd: boolean; canEdit: boolean; canDelete: boolean };
  onOpenCreate: () => void;
  onOpenEdit: (component: SalaryComponent) => void;
  onDelete: (component: SalaryComponent) => void;
  formState: { mode: 'create' | 'edit'; component?: SalaryComponent } | null;
  deleteTarget: SalaryComponent | null;
  onCloseForm: () => void;
  onCloseDelete: () => void;
}

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-surface px-3 h-9 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';

export function ComponentsTab({
  list,
  mutations,
  perms,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  formState,
  deleteTarget,
  onCloseForm,
  onCloseDelete,
}: ComponentsTabProps) {
  const hasFilters = list.hasActiveFilters;
  const [isReordering, setIsReordering] = React.useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
        <div className="relative flex h-9 flex-1 items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:max-w-xs">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
          <input
            value={list.searchInput}
            onChange={(e) => list.setSearchInput(e.target.value)}
            placeholder="Search components…"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm"
          />
        </div>
        <div className="sm:w-52">
          <SegmentedControl options={STATUS_FILTER_OPTIONS} value={list.status} onChange={list.setStatus} />
        </div>
        <select
          value={list.typeFilter}
          onChange={(e) => list.setTypeFilter(e.target.value as 'all' | 'credit' | 'debit')}
          className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg outline-none focus:border-[var(--tt-primary)]"
        >
          <option value="all">All types</option>
          <option value="credit">Earnings</option>
          <option value="debit">Deductions</option>
        </select>
        <div className="flex items-center gap-2 sm:ml-auto">
          {perms.canEdit && list.components.length > 1 && (
            <button
              type="button"
              onClick={() => setIsReordering(true)}
              className="group relative inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-surface/90 px-3 text-xs font-semibold text-fg shadow-2xs transition-all duration-200 hover:border-line-strong hover:bg-bg-subtle hover:shadow-xs active:scale-[0.97] sm:text-sm"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-fg-muted transition-transform duration-300 group-hover:rotate-180 group-hover:text-fg" />
              <span>Reorder Sequence</span>
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-bg-subtle px-1.5 font-mono text-[10px] font-bold text-fg-muted transition-colors group-hover:bg-fg/10 group-hover:text-fg">
                {list.components.length}
              </span>
            </button>
          )}
          {perms.canAdd && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Component</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && (
          <div className="border-b border-line p-3">
            <Alert message={list.error} tone="error" />
          </div>
        )}

        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden p-2">
            <TableSkeleton rows={6} columns={5} />
          </div>
        ) : list.components.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="mb-3.5 w-36 sm:w-44 select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vectors/credit.svg" alt="Salary components illustration" className="h-auto w-full object-contain" />
            </div>
            <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base">
              {hasFilters ? 'No matching components' : 'No salary components yet'}
            </h3>
            <p className={cx(text.caption, 'mt-1 max-w-sm')}>
              {hasFilters
                ? 'Try adjusting your search or filters.'
                : 'Earnings (Basic, HRA, allowances) and structure deductions are defined here and used as building blocks of employee salaries.'}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={list.clearFilters}
                className="mt-3.5 inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
              >
                Clear filters
              </button>
            ) : (
              perms.canAdd && (
                <button
                  type="button"
                  onClick={onOpenCreate}
                  className="mt-3.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add your first component</span>
                </button>
              )
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block min-h-0 flex-1 overflow-auto tt-scroll-hidden">
              <table className="w-full min-w-[620px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-bg-subtle">
                  <tr>
                    <th className="border-b border-line px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted">Component</th>
                    <th className="border-b border-line px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted">Type</th>
                    <th className="border-b border-line px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted">Calculation</th>
                    <th className="border-b border-line px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted">Order</th>
                    <th className="border-b border-line px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted">Status</th>
                    <th className="border-b border-line px-3.5 py-2.5 sm:px-4 sm:py-3 text-right text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.components.map((component) => (
                    <tr key={component.id} className="transition-colors hover:bg-bg-subtle/50">
                      <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        <div className="text-xs sm:text-sm font-semibold text-fg">{component.name}</div>
                        {component.description && <div className={cx(text.caption, 'mt-0.5 max-w-md truncate')}>{component.description}</div>}
                      </td>
                      <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        <span
                          className={cx(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            component.type === 'credit'
                              ? 'bg-[var(--tt-success)]/10 text-[var(--tt-success)]'
                              : 'bg-[var(--tt-danger)]/10 text-[var(--tt-danger)]'
                          )}
                        >
                          {component.type === 'credit' ? 'Earning' : 'Deduction'}
                        </span>
                      </td>
                      <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-fg">
                          {component.calculationType === 'percentage'
                            ? `${component.percentageValue}% of ${component.percentageBasis === 'basic' ? 'Basic' : component.percentageBasis === 'gross' ? 'Monthly Salary' : 'Component'}`
                            : 'Flat amount'}
                        </span>
                      </td>
                      <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        <span className="inline-flex min-w-[26px] h-6 items-center justify-center rounded-md border border-line bg-bg-subtle px-1.5 font-mono text-xs font-semibold text-fg">
                          {component.displayOrder}
                        </span>
                      </td>
                      <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        <StatusPill label={component.status} tone={component.status} />
                      </td>
                      <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        <div className="flex items-center justify-end gap-1">
                          {perms.canEdit && (
                            <Tooltip content="Edit Component">
                              <button
                                type="button"
                                onClick={() => onOpenEdit(component)}
                                className="rounded-[var(--tt-radius-sm)] p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                              >
                                <SquarePen className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          )}
                          {perms.canDelete && !component.isSystem && (
                            <Tooltip content="Delete Component" align="end">
                              <button
                                type="button"
                                onClick={() => onDelete(component)}
                                className="rounded-[var(--tt-radius-sm)] p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)]"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< md) */}
            <div className="block md:hidden min-h-0 flex-1 overflow-auto p-3 space-y-2.5 tt-scroll-hidden">
              {list.components.map((component) => (
                <div key={component.id} className="rounded-xl border border-line bg-surface p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-fg flex items-center gap-1.5">
                        <span>{component.name}</span>
                        <span
                          className={cx(
                            'inline-flex rounded-full px-1.5 py-0.2 text-[9px] font-semibold',
                            component.type === 'credit'
                              ? 'bg-[var(--tt-success)]/10 text-[var(--tt-success)]'
                              : 'bg-[var(--tt-danger)]/10 text-[var(--tt-danger)]'
                          )}
                        >
                          {component.type === 'credit' ? 'Earning' : 'Deduction'}
                        </span>
                      </div>
                      {component.description && <div className="text-[11px] text-fg-muted truncate">{component.description}</div>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex min-w-[22px] h-5 items-center justify-center rounded border border-line/70 bg-bg-subtle px-1 font-mono text-[11px] font-semibold text-fg">
                        {component.displayOrder}
                      </span>
                      <StatusPill label={component.status} tone={component.status} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] border-t border-line/40 pt-2">
                    <div>
                      <span className="text-fg-subtle text-[10px] block uppercase">Calculation</span>
                      <span className="font-medium text-fg">
                        {component.calculationType === 'percentage'
                          ? `${component.percentageValue}% of ${component.percentageBasis === 'basic' ? 'Basic' : component.percentageBasis === 'gross' ? 'Monthly Salary' : 'Component'}`
                          : 'Flat amount'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {perms.canEdit && (
                        <button
                          type="button"
                          onClick={() => onOpenEdit(component)}
                          className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle"
                        >
                          <SquarePen className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {perms.canDelete && !component.isSystem && (
                        <button
                          type="button"
                          onClick={() => onDelete(component)}
                          className="rounded-md p-1.5 text-fg-muted hover:text-[var(--tt-danger)] hover:bg-bg-subtle"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ComponentFormDialog
        open={Boolean(formState)}
        mode={formState?.mode ?? 'create'}
        initial={formState?.component}
        components={list.components}
        isSaving={mutations.isSaving}
        fieldError={mutations.fieldError}
        onClose={onCloseForm}
        onSubmit={async (input) => {
          const ok = formState?.mode === 'edit' && formState.component
            ? await mutations.updateComponent(formState.component.id, input)
            : await mutations.createComponent(input);
          if (ok) onCloseForm();
        }}
      />

      <ReorderComponentsDialog
        open={isReordering}
        components={list.components}
        isSaving={mutations.isSaving}
        onClose={() => setIsReordering(false)}
        onSave={async (orderedIds) => {
          await mutations.reorderComponents(orderedIds);
        }}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={onCloseDelete}
        title="Delete Component"
        footer={
          mutations.deleteBlockedMessage ? (
            <button
              type="button"
              onClick={onCloseDelete}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onCloseDelete}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mutations.isSaving}
                onClick={async () => {
                  if (!deleteTarget) return;
                  const ok = await mutations.deleteComponent(deleteTarget.id);
                  if (ok) onCloseDelete();
                }}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-danger)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-danger)]/90 active:scale-[0.98] disabled:opacity-50 sm:text-sm"
              >
                {mutations.isSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                <span>Delete</span>
              </button>
            </>
          )
        }
      >
        {mutations.deleteBlockedMessage ? (
          <Alert message={mutations.deleteBlockedMessage} tone="error" />
        ) : (
          <p className={text.body}>
            Delete <span className="font-semibold text-fg">{deleteTarget?.name}</span>? Employees currently using it
            will be unaffected until their salaries are re-edited, but you cannot assign it going forward.
          </p>
        )}
      </Dialog>
    </div>
  );
}

function ComponentFormDialog({
  open,
  mode,
  initial,
  components = [],
  isSaving,
  fieldError,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: SalaryComponent;
  components?: SalaryComponent[];
  isSaving: boolean;
  fieldError: { field: string; message: string } | null;
  onClose: () => void;
  onSubmit: (input: ComponentFormInput) => void;
}) {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<'credit' | 'debit'>('credit');
  const [description, setDescription] = React.useState('');
  const [displayOrder, setDisplayOrder] = React.useState('0');
  const [calculationType, setCalculationType] = React.useState<'flat' | 'percentage'>('flat');
  const [percentageValue, setPercentageValue] = React.useState('');
  const [percentageBasis, setPercentageBasis] = React.useState<'basic' | 'gross' | 'component'>('gross');
  const [basisComponentId, setBasisComponentId] = React.useState<number | null>(null);

  const isEdit = mode === 'edit';

  const nextSeqOrder = React.useMemo(() => {
    if (!components || components.length === 0) return 1;
    const max = Math.max(...components.map((c) => Number(c.displayOrder) || 0));
    return max + 1;
  }, [components]);

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setType(initial?.type ?? 'credit');
    setDescription(initial?.description ?? '');
    setDisplayOrder(String(initial?.displayOrder ?? nextSeqOrder));
    setCalculationType(initial?.calculationType ?? 'flat');
    setPercentageValue(initial?.percentageValue !== null && initial?.percentageValue !== undefined ? String(initial.percentageValue) : '');
    setPercentageBasis(initial?.percentageBasis ?? 'gross');
    setBasisComponentId(initial?.basisComponentId ?? null);
  }, [open, initial, nextSeqOrder]);

  const parsedOrder = parseInt(displayOrder, 10);
  const conflictingComponent = React.useMemo(() => {
    if (isNaN(parsedOrder) || parsedOrder <= 0) return null;
    return components.find((c) => (!initial || c.id !== initial.id) && Number(c.displayOrder) === parsedOrder);
  }, [components, initial, parsedOrder]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name,
      type,
      description,
      displayOrder,
      status: initial?.status ?? 'active',
      calculationType,
      percentageValue: calculationType === 'percentage' ? percentageValue : '',
      percentageBasis,
      basisComponentId: calculationType === 'percentage' && percentageBasis === 'component' ? basisComponentId : null,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-sm font-bold text-fg sm:text-base">{isEdit ? 'Edit Component' : 'Add Salary Component'}</h2>
          <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
            {isEdit ? 'Update the component configuration' : 'Define an earning or deduction building block for salaries'}
          </p>
        </div>
      }
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
            onClick={handleSubmit}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Check className="h-3.5 w-3.5" />}
            <span>{isEdit ? 'Save changes' : 'Add Component'}</span>
          </button>
        </>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">
            Component Name <span className="text-[var(--tt-danger)]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Basic, HRA, Special Allowance"
            className={inputClass}
            autoFocus
          />
          {fieldError?.field === 'component_name' ? (
            <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError.message}</p>
          ) : (
            <p className="mt-1 text-[11px] text-fg-muted">Must be unique within your organization.</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Type</label>
          <div className="grid grid-cols-2 gap-2.5">
            {COMPONENT_TYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={cx(
                  'flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
                  type === opt.value
                    ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                    : 'border-line bg-surface hover:bg-bg-subtle'
                )}
              >
                <span className={cx('flex h-2 w-2 shrink-0 rounded-full', opt.value === 'credit' ? 'bg-[var(--tt-success)]' : 'bg-[var(--tt-danger)]')} />
                <div>
                  <div className="text-xs font-semibold text-fg">{opt.label}</div>
                  <div className="text-[11px] text-fg-muted">
                    {opt.value === 'credit' ? 'Adds to salary' : 'Deducted from salary'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Calculation Mode: Flat vs Percentage of Salary */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">Calculation Mode</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setCalculationType('flat')}
              className={cx(
                'rounded-lg border p-2.5 text-left transition-all',
                calculationType === 'flat'
                  ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                  : 'border-line bg-surface hover:bg-bg-subtle'
              )}
            >
              <div className="text-xs font-semibold text-fg">Flat Amount</div>
              <div className="text-[11px] text-fg-muted">Fixed amount entered per employee</div>
            </button>
            <button
              type="button"
              onClick={() => setCalculationType('percentage')}
              className={cx(
                'rounded-lg border p-2.5 text-left transition-all',
                calculationType === 'percentage'
                  ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                  : 'border-line bg-surface hover:bg-bg-subtle'
              )}
            >
              <div className="text-xs font-semibold text-fg">% of Salary</div>
              <div className="text-[11px] text-fg-muted">e.g. 50% of Monthly, 20% of Monthly, 40% of Basic</div>
            </button>
          </div>

          {calculationType === 'percentage' && (
            <div className="mt-3 rounded-lg border border-line bg-bg-subtle/50 p-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg">
                    Percentage (%) <span className="text-[var(--tt-danger)]">*</span>
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    max={100}
                    step="0.01"
                    value={percentageValue}
                    onChange={(e) => setPercentageValue(e.target.value)}
                    placeholder="e.g. 50"
                    className={inputClass}
                  />
                  {fieldError?.field === 'percentage_value' && (
                    <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{fieldError.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg">Calculated As % Of</label>
                  <select
                    value={percentageBasis}
                    onChange={(e) => {
                      setPercentageBasis(e.target.value as 'basic' | 'gross' | 'component');
                      if (e.target.value !== 'component') setBasisComponentId(null);
                    }}
                    className={inputClass}
                  >
                    <option value="gross">% of Monthly Salary / Total CTC (Gross)</option>
                    <option value="basic">% of Basic Salary</option>
                    <option value="component">% of Specific Component</option>
                  </select>
                </div>
              </div>

              {percentageBasis === 'component' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg">Base Component</label>
                  <select
                    value={basisComponentId ?? ''}
                    onChange={(e) => setBasisComponentId(e.target.value ? Number(e.target.value) : null)}
                    className={inputClass}
                  >
                    <option value="">Select component…</option>
                    {components
                      .filter((c) => !initial || c.id !== initial.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold text-fg sm:text-[13px]">Description</label>
            <span className="text-[11px] text-fg-subtle">Optional</span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this component for?"
            rows={2}
            className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-xs text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-sm"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold text-fg sm:text-[13px]">Display / Sort Order</label>
            <span className="text-[11px] text-fg-muted">
              Next in sequence: <span className="font-semibold text-fg">{nextSeqOrder}</span>
            </span>
          </div>
          <input
            type="number"
            min={1}
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            placeholder={`e.g. ${nextSeqOrder}`}
            className={cx(
              inputClass,
              conflictingComponent && 'border-amber-400 focus:border-amber-500 focus:ring-amber-400'
            )}
          />

          {conflictingComponent ? (
            <div className="mt-2.5 rounded-lg border-2 border-amber-500 bg-amber-50 p-3 shadow-xs dark:bg-zinc-900 dark:border-amber-400 space-y-1.5">
              <p className="text-[13px] font-bold text-zinc-900 dark:text-white leading-snug">
                Order {parsedOrder} is already assigned to <span className="underline decoration-amber-500 decoration-2">{conflictingComponent.name}</span>
              </p>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200 leading-relaxed">
                You can switch to the next sequence number or keep this to automatically shift existing components down.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setDisplayOrder(String(nextSeqOrder))}
                  className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-amber-700 active:scale-95"
                >
                  Switch to next sequence ({nextSeqOrder})
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-fg-muted">
              Determines the order of appearance on salary slips and payroll sheets (1 appears first).
            </p>
          )}
        </div>
      </form>
    </Dialog>
  );
}

function ReorderComponentsDialog({
  open,
  components,
  isSaving,
  onClose,
  onSave,
}: {
  open: boolean;
  components: SalaryComponent[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (orderedIds: number[]) => Promise<void>;
}) {
  const [orderedItems, setOrderedItems] = React.useState<SalaryComponent[]>([]);

  React.useEffect(() => {
    if (open) {
      setOrderedItems([...components].sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0)));
    }
  }, [open, components]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= orderedItems.length) return;
    const next = [...orderedItems];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    setOrderedItems(next);
  };

  const shuffleItems = () => {
    const arr = [...orderedItems];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setOrderedItems(arr);
  };

  const sortEarningsFirst = () => {
    const arr = [...orderedItems].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'credit' ? -1 : 1;
      return (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0);
    });
    setOrderedItems(arr);
  };

  const handleSave = async () => {
    await onSave(orderedItems.map((c) => c.id));
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-sm font-bold text-fg sm:text-base">Reorder Salary Components</h2>
          <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
            Move components up or down one-by-one or shuffle them into sequence. Lower numbers appear first on salary slips.
          </p>
        </div>
      }
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
            onClick={handleSave}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Check className="h-3.5 w-3.5" />}
            <span>Save Sequence</span>
          </button>
        </>
      }
    >
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-fg uppercase tracking-wide">
              {orderedItems.length} Components
            </span>
            <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-fg-muted">
              Sequence 1 – {orderedItems.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={shuffleItems}
              title="Shuffle all components with animation"
              className="inline-flex h-7 items-center rounded-md border border-line bg-surface px-2.5 text-[11px] font-semibold text-fg shadow-2xs transition-all hover:border-line-strong hover:bg-bg-subtle active:scale-95"
            >
              Shuffle
            </button>
            <button
              type="button"
              onClick={sortEarningsFirst}
              title="Sort Earnings (Credits) to top"
              className="inline-flex h-7 items-center rounded-md border border-line bg-surface px-2.5 text-[11px] font-semibold text-fg shadow-2xs transition-all hover:border-line-strong hover:bg-bg-subtle active:scale-95"
            >
              Earnings First
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-1 max-h-[380px] overflow-y-auto space-y-1 tt-scroll-hidden">
          <AnimatePresence initial={false}>
            {orderedItems.map((item, index) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 32,
                }}
                className="flex items-center justify-between p-2 transition-colors hover:bg-bg-subtle/70 rounded-lg border border-transparent hover:border-line/40"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-subtle font-mono text-xs font-bold text-fg ring-1 ring-line">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs sm:text-sm font-semibold text-fg truncate">{item.name}</span>
                      <span
                        className={cx(
                          'inline-flex rounded-full px-1.5 py-0.2 text-[9px] font-semibold shrink-0',
                          item.type === 'credit'
                            ? 'bg-[var(--tt-success)]/10 text-[var(--tt-success)]'
                            : 'bg-[var(--tt-danger)]/10 text-[var(--tt-danger)]'
                        )}
                      >
                        {item.type === 'credit' ? 'Earning' : 'Deduction'}
                      </span>
                    </div>
                    <div className="text-[11px] text-fg-muted">
                      {item.calculationType === 'percentage'
                        ? `${item.percentageValue}% of ${item.percentageBasis}`
                        : 'Flat amount'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2 rounded-lg border border-line bg-surface p-0.5 shadow-2xs">
                  <button
                    type="button"
                    title="Move up"
                    disabled={index === 0 || isSaving}
                    onClick={() => moveItem(index, 'up')}
                    className="flex h-6 w-6 items-center justify-center rounded text-fg-muted transition-all hover:bg-bg-subtle hover:text-fg active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="h-3.5 w-3.5 stroke-[2.5]" />
                  </button>
                  <div className="h-3.5 w-px bg-line" />
                  <button
                    type="button"
                    title="Move down"
                    disabled={index === orderedItems.length - 1 || isSaving}
                    onClick={() => moveItem(index, 'down')}
                    className="flex h-6 w-6 items-center justify-center rounded text-fg-muted transition-all hover:bg-bg-subtle hover:text-fg active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="h-3.5 w-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Dialog>
  );
}
