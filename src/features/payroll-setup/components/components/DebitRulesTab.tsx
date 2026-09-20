'use client';

import React from 'react';
import { Plus, Search, Power, SquarePen, Trash2, Users } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { StatusPill } from '@/components/ui/StatusPill';
import { Dialog } from '@/components/ui/Dialog';
import { DebitFormDialog } from './DebitFormDialog';
import { DebitAssignmentsDrawer } from './DebitAssignmentsDrawer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Tooltip } from '@/components/ui/Tooltip';
import type { useDebitList } from '../../hooks/useDebitList';
import type { useDebitMutations } from '../../hooks/useDebitMutations';
import type { DebitRule } from '../../types/payroll-setup.model';
import { DEBIT_CATEGORIES, STATUS_FILTER_OPTIONS } from '../../constants/payroll-setup.constants';
import { formatCurrency } from '../../utils/validators';

interface DebitRulesTabProps {
  list: ReturnType<typeof useDebitList>;
  mutations: ReturnType<typeof useDebitMutations>;
  perms: { canAdd: boolean; canEdit: boolean; canDelete: boolean };
  components: Array<{ id: number; name: string }>;
  onOpenCreate: () => void;
  onOpenEdit: (rule: DebitRule) => void;
  onDelete: (rule: DebitRule) => void;
  onOpenAssignments: (rule: DebitRule) => void;
  formState: { mode: 'create' | 'edit'; rule?: DebitRule } | null;
  deleteTarget: DebitRule | null;
  assignmentsTarget: DebitRule | null;
  onCloseForm: () => void;
  onCloseDelete: () => void;
  onCloseAssignments: () => void;
}

function categoryLabel(value: string) {
  return DEBIT_CATEGORIES.find((c) => c.value === value)?.label || value;
}

function ruleValueText(rule: DebitRule): string {
  if (rule.isStatutory) {
    const config = rule.config || {};
    switch (rule.category) {
      case 'epf': {
        const rate = Number(config.rate ?? 12);
        const ceiling = Number(config.wageCeiling ?? 15000);
        return `${rate}% of ${String(config.componentName || 'Basic')}${config.applyCeiling !== false ? ` (cap ${formatCurrency(ceiling)}/mo wage)` : ''}`;
      }
      case 'esi': {
        const rate = Number(config.rate ?? 0.75);
        const ceiling = Number(config.eligibilityCeiling ?? 21000);
        return `${rate}% of gross (applies when gross ≤ ${formatCurrency(ceiling)})`;
      }
      case 'professional_tax': {
        const amount = Number(config.monthlyAmount ?? 200);
        return `${formatCurrency(amount)}/month · ${String(config.state || 'State')}`;
      }
      case 'lwf': {
        const amount = Number(config.amount ?? 0);
        return `${formatCurrency(amount)} · ${String(config.frequency || 'monthly')}`;
      }
      case 'tds':
        return 'Auto-computed from employee tax profile';
      default:
        return 'Statutory';
    }
  }
  if (rule.debitType === 'percentage') {
    const refLabel =
      rule.referenceAmount === 'breakdown_item'
        ? rule.breakdownItemName || 'component'
        : rule.referenceAmount === 'before_deduction'
          ? 'gross'
          : rule.referenceAmount === 'after_deduction'
            ? 'post-deduction'
            : 'net';
    return `${rule.percentageValue}% of ${refLabel}`;
  }
  return formatCurrency(rule.fixedAmount);
}

const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function scheduleText(rule: DebitRule): string {
  if (rule.frequency === 'selected_months' && rule.applicableMonths && rule.applicableMonths.length) {
    if (rule.applicableMonths.length === 12) return 'Every month';
    return rule.applicableMonths.map((m) => MONTH_SHORT_NAMES[m - 1] || `${m}`).join(', ');
  }
  if (rule.frequency === 'one_time' && rule.oneTimeMonth) {
    return `One-time: ${rule.oneTimeMonth}`;
  }
  return 'Every month';
}

export function DebitRulesTab({
  list,
  mutations,
  perms,
  components,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  onOpenAssignments,
  formState,
  deleteTarget,
  assignmentsTarget,
  onCloseForm,
  onCloseDelete,
  onCloseAssignments,
}: DebitRulesTabProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
        <div className="relative flex h-9 flex-1 items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:max-w-xs">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
          <input
            value={list.searchInput}
            onChange={(e) => list.setSearchInput(e.target.value)}
            placeholder="Search rules…"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm"
          />
        </div>
        <div className="sm:w-52">
          <SegmentedControl options={STATUS_FILTER_OPTIONS} value={list.status} onChange={list.setStatus} />
        </div>
        <select
          value={list.category}
          onChange={(e) => list.setCategory(e.target.value)}
          className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg outline-none focus:border-[var(--tt-primary)]"
        >
          <option value="all">All categories</option>
          {DEBIT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {perms.canAdd && (
          <button
            type="button"
            onClick={onOpenCreate}
            className="sm:ml-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Rule</span>
          </button>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && (
          <div className="border-b border-line p-3">
            <Alert message={list.error} tone="error" />
          </div>
        )}

        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden p-3 space-y-3">
            {/* Desktop Skeleton */}
            <div className="hidden md:block space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2 border-b border-line/40">
                  <div className="h-4 w-44 rounded bg-bg-subtle animate-pulse" />
                  <div className="h-4 w-32 rounded bg-bg-subtle/70 animate-pulse" />
                  <div className="h-4 w-28 rounded bg-bg-subtle/70 animate-pulse" />
                  <div className="h-5 w-16 rounded-full bg-bg-subtle animate-pulse" />
                  <div className="h-4 w-16 rounded bg-bg-subtle ml-auto animate-pulse" />
                </div>
              ))}
            </div>
            {/* Mobile Skeleton */}
            <div className="block md:hidden space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-line p-3 space-y-2 animate-pulse bg-surface">
                  <div className="h-4 w-36 rounded bg-bg-subtle" />
                  <div className="h-3 w-24 rounded bg-bg-subtle/70" />
                  <div className="h-3 w-28 rounded bg-bg-subtle/50" />
                </div>
              ))}
            </div>
          </div>
        ) : list.debits.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="mb-3.5 w-36 sm:w-44 select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vectors/debits.svg" alt="Deduction rules illustration" className="h-auto w-full object-contain" />
            </div>
            <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base">
              {list.hasActiveFilters ? 'No matching rules' : 'Create your first deduction rule'}
            </h3>
            <p className={cx(text.caption, 'mt-1 max-w-sm')}>
              {list.hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Statutory deductions (EPF, ESI, PT, LWF, TDS) and custom deductions are configured once and assigned to employees when needed.'}
            </p>
            {list.hasActiveFilters ? (
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
                  <span>Add Deduction Rule</span>
                </button>
              )
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block min-h-0 flex-1 overflow-auto tt-scroll-hidden">
              <table className="w-full min-w-[760px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-bg-subtle">
                  <tr>
                    <th className="border-b border-line px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted">Rule</th>
                    <th className="border-b border-line px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted">Amount</th>
                    <th className="border-b border-line px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted">Schedule</th>
                    <th className="border-b border-line px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted">Assigned</th>
                    <th className="border-b border-line px-3.5 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted">Status</th>
                    <th className="border-b border-line px-3.5 py-2.5 sm:px-4 sm:py-3 text-right text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.debits.map((rule) => (
                    <tr key={rule.id} className="transition-colors hover:bg-bg-subtle/50">
                      <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        <div className="flex items-center gap-2">
                          <div className="text-xs sm:text-sm font-semibold text-fg">{rule.name}</div>
                          <span
                            className={cx(
                              'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                              rule.isStatutory
                                ? 'bg-[var(--tt-primary)]/10 text-[var(--tt-primary)]'
                                : 'border border-line bg-bg-subtle text-fg-muted'
                            )}
                          >
                            {categoryLabel(rule.category)}
                          </span>
                        </div>
                        {rule.description && <div className={cx(text.caption, 'mt-0.5 max-w-xs truncate')}>{rule.description}</div>}
                      </td>
                      <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        <span className="text-xs sm:text-sm text-fg">{ruleValueText(rule)}</span>
                      </td>
                      <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-fg">
                          {scheduleText(rule)}
                        </span>
                      </td>
                      <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        <button
                          type="button"
                          onClick={() => onOpenAssignments(rule)}
                          className="inline-flex items-center gap-1 text-xs sm:text-sm text-fg-muted transition-colors hover:text-[var(--tt-primary)]"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>{rule.assignedEmployeeCount}</span>
                        </button>
                      </td>
                      <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        <StatusPill label={rule.status} tone={rule.status} />
                      </td>
                      <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip content="Manage Assignments">
                            <button
                              type="button"
                              onClick={() => onOpenAssignments(rule)}
                              className="rounded-[var(--tt-radius-sm)] p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                            >
                              <Users className="h-4 w-4" />
                            </button>
                          </Tooltip>
                          {perms.canEdit && (
                            <>
                              <Tooltip content="Edit Rule">
                                <button
                                  type="button"
                                  onClick={() => onOpenEdit(rule)}
                                  className="rounded-[var(--tt-radius-sm)] p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                                >
                                  <SquarePen className="h-4 w-4" />
                                </button>
                              </Tooltip>
                              <Tooltip content={rule.status === 'active' ? 'Deactivate' : 'Activate'} align="end">
                                <button
                                  type="button"
                                  disabled={mutations.togglingId === rule.id}
                                  onClick={() => mutations.toggleStatus(rule)}
                                  className="rounded-[var(--tt-radius-sm)] p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:opacity-40"
                                >
                                  {mutations.togglingId === rule.id ? (
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                  ) : (
                                    <Power className="h-4 w-4" />
                                  )}
                                </button>
                              </Tooltip>
                            </>
                          )}
                          {perms.canDelete && (
                            <Tooltip content="Delete Rule" align="end">
                              <button
                                type="button"
                                onClick={() => onDelete(rule)}
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
              {list.debits.map((rule) => (
                <div key={rule.id} className="rounded-xl border border-line bg-surface p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-fg flex items-center gap-1.5 flex-wrap">
                        <span>{rule.name}</span>
                        <span className="inline-flex rounded-full px-1.5 py-0.2 text-[9px] font-semibold bg-bg-subtle text-fg-muted border border-line">
                          {categoryLabel(rule.category)}
                        </span>
                      </div>
                      {rule.description && <div className="text-[11px] text-fg-muted truncate">{rule.description}</div>}
                    </div>
                    <StatusPill label={rule.status} tone={rule.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-b border-line/40 py-2">
                    <div>
                      <span className="text-fg-subtle block text-[10px] uppercase">Calculation</span>
                      <span className="font-medium text-fg">{ruleValueText(rule)}</span>
                    </div>
                    <div>
                      <span className="text-fg-subtle block text-[10px] uppercase">Schedule</span>
                      <span className="font-medium text-fg">{scheduleText(rule)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenAssignments(rule)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--tt-primary)]"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>{rule.assignedEmployeeCount} assigned</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {perms.canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenEdit(rule)}
                            className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle"
                          >
                            <SquarePen className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={mutations.togglingId === rule.id}
                            onClick={() => mutations.toggleStatus(rule)}
                            className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle"
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {perms.canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(rule)}
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

            {list.total > 0 && (
              <div className="border-t border-line bg-surface px-4 py-2.5">
                <Pagination
                  currentPage={list.page}
                  totalPages={list.totalPages}
                  totalItems={list.total}
                  pageSize={list.pageSize}
                  onPageChange={list.setPage}
                  onPageSizeChange={list.setPageSize}
                />
              </div>
            )}
          </>
        )}
      </div>

      <DebitFormDialog
        open={Boolean(formState)}
        mode={formState?.mode ?? 'create'}
        initial={formState?.rule}
        components={components}
        isSaving={mutations.isSaving}
        fieldError={mutations.fieldError}
        onClose={onCloseForm}
        onSubmit={async (input) => {
          const ok = formState?.mode === 'edit' && formState.rule
            ? await mutations.updateRule(formState.rule.id, input)
            : await mutations.createRule(input);
          if (ok) onCloseForm();
        }}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={onCloseDelete}
        title="Delete Deduction Rule"
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
                  const ok = await mutations.deleteRule(deleteTarget);
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
            Delete <span className="font-semibold text-fg">{deleteTarget?.name}</span>? It will stop appearing in
            assignment options. Existing payslips keep their history.
          </p>
        )}
      </Dialog>

      <DebitAssignmentsDrawer
        open={Boolean(assignmentsTarget)}
        rule={assignmentsTarget}
        perms={perms}
        refetchList={list.refetch}
        onClose={onCloseAssignments}
      />
    </div>
  );
}
