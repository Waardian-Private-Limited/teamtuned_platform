'use client';

import React from 'react';
import { ChevronDown, Power, Plus, Search, SquarePen, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { Dialog } from '@/components/ui/Dialog';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import { usePermission } from '@/lib/hooks/usePermission';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx, text } from '@/theme/tokens';
import * as api from '../api/approvals.api';
import { DIMENSION_LABEL, FLOW_PERMISSIONS } from '../constants';
import { useCatalog } from '../hooks/useCatalog';
import type { Dimension, Flow, Lookups } from '../types/approvals';
import { FlowBuilder } from './FlowBuilder';
import { CoveragePanel } from './CoveragePanel';

type View = 'flows' | 'coverage';

function scopeSummary(flow: Flow, lookups: Lookups | null) {
  const keys: Record<Dimension, keyof Lookups> = {
    site: 'sites',
    department: 'departments',
    employment_type: 'employmentTypes',
    role: 'roles',
    roster_unit: 'rosterUnits',
  };
  const parts: string[] = [];
  for (const [dim, ids] of Object.entries(flow.scopes) as [Dimension, number[]][]) {
    if (!ids?.length) continue;
    const names = ids.map((id) => lookups?.[keys[dim]].find((x) => x.id === id)?.name || `#${id}`);
    parts.push(`${DIMENSION_LABEL[dim]}: ${names.join(', ')}`);
  }
  return parts;
}

const cellHeaderClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';
const cellClass =
  'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4 align-top';
const iconButtonClass =
  'rounded-[var(--tt-radius-sm)] p-1.5 2xl:p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer';

export function FlowsPage() {
  const { can, hasPerm } = usePermission();
  const canManage = can(FLOW_PERMISSIONS.MANAGE) || hasPerm('HR_MODE');
  const { catalog, lookups, error: catalogError } = useCatalog();
  const [typeKey, setTypeKey] = React.useState<string>('');
  const [view, setView] = React.useState<View>('flows');
  const [flows, setFlows] = React.useState<Flow[] | null>(null);
  const [search, setSearch] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [builder, setBuilder] = React.useState<{ open: boolean; flow: Flow | null }>({ open: false, flow: null });
  const [removing, setRemoving] = React.useState<Flow | null>(null);
  const [togglingId, setTogglingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (catalog && !typeKey) setTypeKey(catalog.requestTypes[0]?.type ?? '');
  }, [catalog, typeKey]);

  const type = catalog?.requestTypes.find((t) => t.type === typeKey) || null;

  const load = React.useCallback(async () => {
    if (!typeKey) return;
    try {
      setFlows(await api.listFlows(typeKey));
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    }
  }, [typeKey]);

  React.useEffect(() => {
    setFlows(null);
    load();
  }, [load]);

  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);

  const filteredFlows = React.useMemo(() => {
    if (!flows) return null;
    if (!search.trim()) return flows;
    const q = search.trim().toLowerCase();
    return flows.filter((f) => f.name.toLowerCase().includes(q));
  }, [flows, search]);

  React.useEffect(() => {
    setPage(1);
  }, [search, typeKey]);

  const paginatedFlows = React.useMemo(() => {
    if (!filteredFlows) return null;
    const start = (page - 1) * pageSize;
    return filteredFlows.slice(start, start + pageSize);
  }, [filteredFlows, page, pageSize]);

  const toggle = async (f: Flow, next: boolean) => {
    setTogglingId(f.id);
    setFlows((list) => list && list.map((x) => (x.id === f.id ? { ...x, isActive: next } : x)));
    try {
      await api.setFlowActive(f.id, next);
      showSuccess(`Flow ${next ? 'activated' : 'deactivated'}`);
    } catch (e) {
      showError(messageOf(e));
      load();
    } finally {
      setTogglingId(null);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await api.deleteFlow(removing.id);
      showSuccess('Flow deleted');
      setRemoving(null);
      load();
    } catch (e) {
      showError(messageOf(e));
    }
  };

  if (catalogError) return <Alert message={catalogError} />;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Unified Toolbar (matches Departments, Roles, Sites) */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 2xl:p-4">
        {/* Title & Count + Mobile Add Button */}
        <div className="flex items-center justify-between gap-3 lg:justify-start">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Approval Flows</h1>
            <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted 2xl:text-sm">
              {filteredFlows?.length ?? 0}
            </span>
          </div>

          {/* Mobile-only compact Add button */}
          {canManage && (
            <button
              type="button"
              onClick={() => setBuilder({ open: true, flow: null })}
              className="inline-flex h-8.5 items-center justify-center gap-1 rounded-lg bg-[var(--tt-primary)] px-2.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:hidden"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Controls: Search, Request Type Dropdown, View Toggle, Desktop Add Button */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5 lg:flex-nowrap">
          {/* Search Input */}
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-44 md:w-52 2xl:h-10 2xl:w-60">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle 2xl:h-4 2xl:w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flows…"
              className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm"
            />
          </div>

          {/* Request Type Selector (clean dropdown replacing horizontal overflowing tabs) */}
          <div className="relative w-full sm:w-52 md:w-60 2xl:w-68">
            <select
              value={typeKey}
              onChange={(e) => setTypeKey(e.target.value)}
              className="h-9 w-full appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-xs font-semibold text-fg outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] cursor-pointer sm:text-sm 2xl:h-10 2xl:pr-9 2xl:text-base"
            >
              {(catalog?.requestTypes || []).map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted 2xl:right-3 2xl:h-4 2xl:w-4" />
          </div>

          {/* View Toggle: Flows vs Coverage */}
          {!type?.global && (
            <div className="w-full sm:w-36 md:w-40 2xl:w-48">
              <SegmentedControl
                options={[
                  { value: 'flows', label: 'Flows' },
                  { value: 'coverage', label: 'Coverage' },
                ]}
                value={view}
                onChange={(v) => setView(v as View)}
              />
            </div>
          )}

          {/* Tablet & Desktop Add button */}
          {canManage && (
            <button
              type="button"
              onClick={() => setBuilder({ open: true, flow: null })}
              className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:inline-flex sm:text-sm 2xl:h-10 2xl:px-4 2xl:text-base"
            >
              <Plus className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
              <span className="hidden md:inline">New Flow</span>
              <span className="md:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Contextual Description Banner */}
      {type?.description && (
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface/60 px-3.5 py-2.5 text-xs text-fg-muted">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-fg">{type.label}:</span>
            <span>
              {type.global
                ? `${type.description}. Set once and every request type follows it.`
                : `${type.description}. Overrides the global flow.`}
            </span>
          </div>
          {type.global && (
            <span className="rounded bg-[var(--tt-primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--tt-primary)]">
              Global Default
            </span>
          )}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {error && (
          <div className="border-b border-line p-3">
            <Alert message={error} tone="error" />
          </div>
        )}

        {view === 'coverage' && type && !type.global ? (
          <div className="flex-1 overflow-auto p-4">
            <CoveragePanel requestType={type.type} />
          </div>
        ) : filteredFlows === null ? (
          <div className="flex-1 overflow-hidden p-4">
            <TableSkeleton rows={6} columns={6} />
          </div>
        ) : filteredFlows.length === 0 ? (
          <div className="flex flex-1 flex-col">
            <EmptyState
              illustration={{ src: '/vectors/flow.svg', width: 960, height: 755, alt: 'Approval flow' }}
              title={search ? 'No matching approval flows' : 'No approval flow yet'}
              description={
                search
                  ? `No approval flow matching "${search}".`
                  : type?.global
                  ? 'Create one flow here and it applies to leave, salary, comp-off, attendance, roster and every other request.'
                  : 'Without a flow, one person with the approval permission decides. Add a flow to route requests through managers, department heads and more.'
              }
              action={
                canManage && !search
                  ? { label: 'Create a flow', onClick: () => setBuilder({ open: true, flow: null }) }
                  : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden min-h-0 flex-1 overflow-hidden md:block">
              <div className="h-full overflow-auto tt-scroll-hidden">
                <table className="w-full min-w-[760px] border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-bg-subtle select-none">
                    <tr>
                      <th className={cx(cellHeaderClass, 'first:rounded-tl-xl')}>Flow</th>
                      <th className={cellHeaderClass}>Applies To</th>
                      <th className={cellHeaderClass}>Steps</th>
                      <th className={cx(cellHeaderClass, 'w-24 text-center')}>Priority</th>
                      <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-44')}>Status</th>
                      <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-44 text-right last:rounded-tr-xl')}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(paginatedFlows ?? []).map((f) => {
                      const scope = scopeSummary(f, lookups);
                      const isActive = f.isActive;
                      return (
                        <tr key={f.id} className="transition-colors hover:bg-bg-subtle/50">
                          <td className={cellClass}>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-fg sm:text-sm 2xl:text-base">{f.name}</span>
                                <SubOrgBadge subOrgId={f.subOrganizationId} />
                              </div>
                              {f.sla && (
                                <div className={cx(text.caption, 'text-fg-muted')}>
                                  Reminds after {f.sla.remindAfterHours}h
                                  {f.sla.escalateAfterHours ? ` · Escalates after ${f.sla.escalateAfterHours}h` : ''}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className={cellClass}>
                            {scope.length === 0 ? (
                              <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-medium text-fg-muted">
                                Everyone in scope
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-xs md:max-w-sm lg:max-w-md">
                                {scope.map((s, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center rounded-md border border-line bg-bg-subtle/60 px-2 py-0.5 text-xs font-medium text-fg shadow-2xs"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className={cellClass}>
                            <div className="flex flex-wrap items-center gap-1">
                              {f.steps.map((s, i) => (
                                <React.Fragment key={i}>
                                  {i > 0 && <span className="text-fg-subtle text-xs">›</span>}
                                  <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-fg shadow-2xs">
                                    <span>{s.name}</span>
                                    {s.when ? (
                                      <span className="rounded bg-[var(--tt-primary)]/10 px-1 text-[10px] font-semibold text-[var(--tt-primary)]">
                                        if
                                      </span>
                                    ) : null}
                                  </span>
                                </React.Fragment>
                              ))}
                            </div>
                          </td>

                          <td className={cx(cellClass, 'text-center')}>
                            <span className="inline-flex items-center rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-fg">
                              {f.priority}
                            </span>
                          </td>

                          <td className={cellClass}>
                            <StatusPill label={isActive ? 'Active' : 'Inactive'} tone={isActive ? 'active' : 'inactive'} />
                          </td>

                          <td className={cellClass}>
                            <div className="flex items-center justify-end gap-1">
                              {canManage && (
                                <>
                                  <Tooltip content="Edit Flow">
                                    <button
                                      type="button"
                                      onClick={() => setBuilder({ open: true, flow: f })}
                                      aria-label="Edit flow"
                                      className={iconButtonClass}
                                    >
                                      <SquarePen className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
                                    </button>
                                  </Tooltip>

                                  <Tooltip content={isActive ? 'Deactivate' : 'Activate'} align="end">
                                    <button
                                      type="button"
                                      disabled={togglingId === f.id}
                                      onClick={() => toggle(f, !isActive)}
                                      aria-label={isActive ? 'Deactivate flow' : 'Activate flow'}
                                      className={cx(iconButtonClass, togglingId === f.id && 'cursor-not-allowed opacity-60')}
                                    >
                                      {togglingId === f.id ? (
                                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent 2xl:h-4.5 2xl:w-4.5" />
                                      ) : (
                                        <Power className={cx('h-4 w-4 2xl:h-4.5 2xl:w-4.5', isActive ? 'text-[var(--tt-success)]' : 'text-fg-muted')} />
                                      )}
                                    </button>
                                  </Tooltip>

                                  <Tooltip content="Delete Flow" align="end">
                                    <button
                                      type="button"
                                      onClick={() => setRemoving(f)}
                                      aria-label="Delete flow"
                                      className={cx(iconButtonClass, 'hover:text-[var(--tt-danger)]')}
                                    >
                                      <Trash2 className="h-4 w-4 2xl:h-4.5 2xl:w-4.5" />
                                    </button>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto tt-scroll-hidden md:hidden">
              {(paginatedFlows ?? []).map((f) => {
                const scope = scopeSummary(f, lookups);
                const isActive = f.isActive;
                return (
                  <div key={f.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-fg sm:text-sm">{f.name}</span>
                          <SubOrgBadge subOrgId={f.subOrganizationId} />
                        </div>
                        {f.sla && (
                          <p className="mt-0.5 text-[11px] text-fg-muted">
                            Reminds: {f.sla.remindAfterHours}h
                            {f.sla.escalateAfterHours ? ` · Escalates: ${f.sla.escalateAfterHours}h` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusPill label={isActive ? 'Active' : 'Inactive'} tone={isActive ? 'active' : 'inactive'} />
                        {canManage && (
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => setBuilder({ open: true, flow: f })}
                              className={iconButtonClass}
                              aria-label="Edit flow"
                            >
                              <SquarePen className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={togglingId === f.id}
                              onClick={() => toggle(f, !isActive)}
                              className={iconButtonClass}
                              aria-label={isActive ? 'Deactivate flow' : 'Activate flow'}
                            >
                              {togglingId === f.id ? (
                                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Power className={cx('h-4 w-4', isActive ? 'text-[var(--tt-success)]' : 'text-fg-muted')} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemoving(f)}
                              className={cx(iconButtonClass, 'hover:text-[var(--tt-danger)]')}
                              aria-label="Delete flow"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Scope */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">Applies to: </span>
                      {scope.length === 0 ? (
                        <span className="text-xs text-fg-muted">Everyone in scope</span>
                      ) : (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {scope.map((s, idx) => (
                            <span key={idx} className="rounded-md border border-line bg-bg-subtle/60 px-1.5 py-0.5 text-[11px] font-medium text-fg">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Steps */}
                    <div className="flex flex-wrap items-center gap-1">
                      {f.steps.map((s, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="text-fg-subtle text-xs">›</span>}
                          <span className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium text-fg shadow-2xs">
                            {s.name}
                            {s.when && <span className="ml-1 text-[9px] text-[var(--tt-primary)] font-bold">if</span>}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-fg-muted border-t border-line/40">
                      <span>Priority: #{f.priority}</span>
                      <span>{f.steps.length} step{f.steps.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Pagination Bar */}
            {filteredFlows.length > 0 && (
              <div className="border-t border-line bg-surface px-4 py-2.5">
                <Pagination
                  currentPage={page}
                  totalPages={Math.max(1, Math.ceil(filteredFlows.length / pageSize))}
                  totalItems={filteredFlows.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  pageSizeOptions={[10, 25, 50, 100]}
                />
              </div>
            )}
          </>
        )}
      </div>

      {type && (
        <FlowBuilder
          open={builder.open}
          type={type}
          allTypes={catalog?.requestTypes || []}
          flow={builder.flow}
          lookups={lookups}
          onClose={() => setBuilder({ open: false, flow: null })}
          onSaved={load}
        />
      )}

      <Dialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Delete flow"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setRemoving(null)}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmRemove}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-danger)] px-4.5 text-xs font-semibold text-white shadow-xs transition-all hover:opacity-90 active:scale-[0.98] sm:text-sm"
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-sm text-fg-muted">
          Delete <span className="font-semibold text-fg">{removing?.name}</span>? Requests already in progress
          keep the steps they started with.
        </p>
      </Dialog>
    </div>
  );
}

