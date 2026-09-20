'use client';

import React from 'react';
import { Plus, Search, UserMinus, SlidersHorizontal } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Drawer } from '@/components/ui/Drawer';
import { useDebitAssignments } from '../../hooks/useDebitAssignments';
import { currentFinancialYear } from '../../constants/payroll-setup.constants';
import type { DebitRule } from '../../types/payroll-setup.model';
import { TaxProfileDialog } from './TaxProfileDialog';

interface DebitAssignmentsDrawerProps {
  open: boolean;
  rule: DebitRule | null;
  perms: { canEdit: boolean };
  refetchList: () => Promise<void>;
  onClose: () => void;
}

export function DebitAssignmentsDrawer({ open, rule, perms, refetchList, onClose }: DebitAssignmentsDrawerProps) {
  const ruleId = open && rule ? rule.id : null;
  const assignments = useDebitAssignments(ruleId, refetchList);
  const [search, setSearch] = React.useState('');
  const [taxEmployee, setTaxEmployee] = React.useState<{ id: number; name: string } | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    if (ruleId) {
      setSearch('');
      setSelectedCandidateIds(new Set());
      assignments.searchCandidates('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId]);

  React.useEffect(() => {
    if (!ruleId) return;
    const timeout = setTimeout(() => assignments.searchCandidates(search), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const assignedIds = new Set(assignments.employees.map((e) => e.employeeId));
  const availableCandidates = assignments.candidates.filter((c) => !assignedIds.has(c.id));

  const isTdsRule = rule?.category === 'tds';

  return (
    <Drawer open={open} onClose={onClose} title={rule ? `Assignments — ${rule.name}` : 'Assignments'}>
      <div className="space-y-4">
        <p className={text.body}>
          {isTdsRule
            ? 'Assign employees whose salary TDS should be computed for. Each employee can manage their own tax regime and declarations.'
            : 'Assign employees to apply this deduction during payroll. Automation applies from the next payroll cycle.'}
        </p>

        {assignments.error && <Alert message={assignments.error} tone="error" />}

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
            Assigned employees <span className="text-fg-muted">({assignments.total})</span>
          </h3>
          <div className="mt-2 space-y-1.5">
            {assignments.isLoading ? (
              [1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-subtle" />)
            ) : assignments.employees.length === 0 ? (
              <p className={cx(text.caption, 'py-4 text-center')}>No employees assigned to this rule yet.</p>
            ) : (
              assignments.employees.map((employee) => (
                <div
                  key={employee.employeeId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-fg sm:text-sm">{employee.name}</div>
                    <div className={cx(text.caption, 'text-[11px]')}>{employee.designation || employee.email || '—'}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isTdsRule && (
                      <button
                        type="button"
                        onClick={() => setTaxEmployee({ id: employee.employeeId, name: employee.name })}
                        className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg transition-colors hover:bg-bg-subtle"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        Tax Profile
                      </button>
                    )}
                    {perms.canEdit && (
                      <button
                        type="button"
                        disabled={assignments.isAssigning}
                        onClick={() => assignments.remove(employee.employeeId)}
                        className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)] disabled:opacity-40"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {perms.canEdit && (
          <div className="border-t border-line pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Assign employees</h3>
              {availableCandidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCandidateIds.size === availableCandidates.length) {
                      setSelectedCandidateIds(new Set());
                    } else {
                      setSelectedCandidateIds(new Set(availableCandidates.map((c) => c.id)));
                    }
                  }}
                  className="text-xs font-semibold text-[var(--tt-primary)] hover:underline"
                >
                  {selectedCandidateIds.size === availableCandidates.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>
            <div className="relative mt-2 flex h-10 items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
              <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees by name or email…"
                className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm"
              />
            </div>

            {selectedCandidateIds.size > 0 && (
              <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[var(--tt-primary)]/10 p-2.5 border border-[var(--tt-primary)]/20">
                <span className="text-xs font-semibold text-[var(--tt-primary)]">
                  {selectedCandidateIds.size} employee{selectedCandidateIds.size > 1 ? 's' : ''} selected
                </span>
                <button
                  type="button"
                  disabled={assignments.isAssigning}
                  onClick={async () => {
                    const ok = await assignments.assignBulk(Array.from(selectedCandidateIds));
                    if (ok) {
                      setSelectedCandidateIds(new Set());
                      assignments.searchCandidates(search);
                    }
                  }}
                  className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:opacity-50"
                >
                  {assignments.isAssigning ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>Assign Selected</span>
                </button>
              </div>
            )}

            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto tt-scroll-hidden">
              {assignments.isSearching ? (
                <p className={cx(text.caption, 'py-3 text-center')}>Searching…</p>
              ) : availableCandidates.length === 0 ? (
                <p className={cx(text.caption, 'py-3 text-center')}>
                  {search.trim() ? 'No employees match your search.' : 'Start typing to find employees.'}
                </p>
              ) : (
                availableCandidates.map((candidate) => {
                  const isSelected = selectedCandidateIds.has(candidate.id);
                  return (
                    <div
                      key={candidate.id}
                      className={cx(
                        'flex w-full items-center justify-between gap-2 rounded-lg border p-2 transition-colors',
                        isSelected ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5' : 'border-line hover:bg-bg-subtle'
                      )}
                    >
                      <label className="flex flex-1 items-center gap-2.5 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedCandidateIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(candidate.id);
                              else next.delete(candidate.id);
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-line text-[var(--tt-primary)] focus:ring-[var(--tt-primary)]"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-fg sm:text-sm">{candidate.name}</div>
                          <div className={cx(text.caption, 'text-[11px]')}>{candidate.designation || candidate.email || '—'}</div>
                        </div>
                      </label>
                      <button
                        type="button"
                        disabled={assignments.isAssigning}
                        onClick={async () => {
                          const ok = await assignments.assign(candidate.id);
                          if (ok) assignments.searchCandidates(search);
                        }}
                        className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-primary)] disabled:opacity-50"
                        title="Assign immediately"
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <TaxProfileDialog
        open={Boolean(taxEmployee)}
        employee={taxEmployee}
        financialYear={currentFinancialYear()}
        onClose={() => setTaxEmployee(null)}
      />
    </Drawer>
  );
}
