'use client';

import React from 'react';
import { Check, Send, X } from 'lucide-react';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { SalaryHistoryDrawer } from '@/features/compensation/components/SalaryHistoryDrawer';
import { useCompensationSettings } from '@/features/compensation/hooks/useCompensationSettings';
import type { RevisionDto } from '@/features/compensation/types/compensation.dto';
import * as api from '../api/salaryRevisions.api';
import { REVISION_PERMISSIONS } from '../constants/salaryRevisions.constants';
import { useRevisionList } from '../hooks/useRevisionList';
import { useRevisionMutations } from '../hooks/useRevisionMutations';
import { RevisionsToolbar } from './components/RevisionsToolbar';
import { RevisionTable } from './components/RevisionTable';
import { RevisionCardList } from './components/RevisionCardList';
import { RevisionsEmptyState } from './components/RevisionsEmptyState';
import { RevisionFormDialog } from './components/RevisionFormDialog';
import { RevisionLetterDrawer } from './components/RevisionLetterDrawer';
import { RevisionDecisionDialog, type DecisionTarget } from './components/RevisionDecisionDialog';
import type { RevisionActionHandlers } from './components/RevisionRowActions';

export function SalaryRevisionsPage() {
  const { can: canCode, hasPerm } = usePermission();
  const can = (code: string) => canCode(code) || hasPerm('HR_MODE');
  const perms = {
    add: can(REVISION_PERMISSIONS.ADD),
    edit: can(REVISION_PERMISSIONS.EDIT),
    approve: can(REVISION_PERMISSIONS.APPROVE),
    remove: can(REVISION_PERMISSIONS.DELETE),
  };
  const list = useRevisionList();
  const mutations = useRevisionMutations(list.refetch);
  const settings = useCompensationSettings(null);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [form, setForm] = React.useState<{ open: boolean; revision?: RevisionDto | null }>({ open: false });
  const [historyId, setHistoryId] = React.useState<number | null>(null);
  const [letterId, setLetterId] = React.useState<number | null>(null);
  const [decision, setDecision] = React.useState<DecisionTarget | null>(null);

  React.useEffect(() => setSelected(new Set()), [list.revisions]);

  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected((s) => (list.revisions.length && list.revisions.every((r) => s.has(r.id)) ? new Set() : new Set(list.revisions.map((r) => r.id))));
  const openCreate = () => setForm({ open: true, revision: null });

  const handlers: RevisionActionHandlers = {
    onHistory: (r) => setHistoryId(r.employee.id),
    onLetter: (r) => setLetterId(r.id),
    onEdit: (r) => setForm({ open: true, revision: r }),
    onSubmit: (r) => setDecision({ ids: [r.id], decision: 'submit', label: r.employee.name }),
    onDecide: (r, d) => setDecision({ ids: [r.id], decision: d, label: r.employee.name }),
    onCancel: (r) => setDecision({ ids: [r.id], decision: 'cancel', label: r.employee.name }),
  };

  const confirm = (note: string) => {
    if (!decision) return Promise.resolve(false);
    if (decision.decision === 'approve') return mutations.approve(decision.ids, note || undefined);
    if (decision.decision === 'reject') return mutations.reject(decision.ids, note || undefined);
    if (decision.decision === 'submit') return mutations.submit(decision.ids);
    return mutations.cancel(decision.ids);
  };

  const pick = (status: string) => list.revisions.filter((r) => selected.has(r.id) && r.status === status).map((r) => r.id);
  const pending = pick('pending');
  const drafts = pick('draft');
  const fade = list.isFetching ? 'opacity-75' : 'opacity-100';
  const loadLetter = React.useCallback((id: number) => api.getLetter(id), []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <RevisionsToolbar
        total={list.total}
        counts={list.counts}
        searchValue={list.searchInput}
        onSearchChange={list.setSearchInput}
        status={list.status}
        onStatusChange={list.setStatus}
        type={list.type}
        onTypeChange={list.setType}
        subOrgId={list.subOrgId}
        onSubOrgChange={list.setSubOrgId}
        canAdd={perms.add}
        onAdd={openCreate}
      />

      {(pending.length > 0 || drafts.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2">
          <span className="text-xs font-semibold text-fg sm:text-sm">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
            {perms.add && drafts.length > 0 && <Btn icon={<Send className="h-3.5 w-3.5" />} onClick={() => setDecision({ ids: drafts, decision: 'submit', label: `${drafts.length} draft revision(s)` })}>Submit {drafts.length}</Btn>}
            {perms.approve && pending.length > 0 && (
              <>
                <Btn icon={<X className="h-3.5 w-3.5" />} onClick={() => setDecision({ ids: pending, decision: 'reject', label: `${pending.length} revision(s)` })}>Reject</Btn>
                <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={() => setDecision({ ids: pending, decision: 'approve', label: `${pending.length} revision(s)` })}>Approve {pending.length}</Btn>
              </>
            )}
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && <div className="border-b border-line p-3"><Alert message={list.error} tone="error" /></div>}
        {list.isInitialLoading ? (
          <div className="flex-1 overflow-hidden"><TableSkeleton rows={6} columns={6} /></div>
        ) : list.revisions.length === 0 ? (
          <div className={cx('flex flex-1 flex-col transition-opacity duration-200', fade)}>
            <RevisionsEmptyState filtered={list.hasActiveFilters} canAdd={perms.add} onAdd={openCreate} onClear={list.clearFilters} />
          </div>
        ) : (
          <>
            <div className={cx('hidden min-h-0 flex-1 overflow-hidden transition-opacity duration-200 md:block', fade)}>
              <RevisionTable revisions={list.revisions} selected={selected} onToggle={toggle} onToggleAll={toggleAll} perms={perms} busyIds={mutations.busyIds} handlers={handlers} />
            </div>
            <div className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity duration-200 tt-scroll-hidden md:hidden', fade)}>
              <RevisionCardList revisions={list.revisions} selected={selected} onToggle={toggle} perms={perms} busyIds={mutations.busyIds} handlers={handlers} />
            </div>
            {list.total > 0 && (
              <div className="border-t border-line bg-surface px-4 py-2.5">
                <Pagination currentPage={list.page} totalPages={list.totalPages} totalItems={list.total} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} />
              </div>
            )}
          </>
        )}
      </div>

      <RevisionFormDialog open={form.open} revision={form.revision} revisionTypes={settings.data?.catalog.revision_types || []} onClose={() => setForm({ open: false })} onSaved={list.refetch} />
      <RevisionDecisionDialog target={decision} onClose={() => setDecision(null)} onConfirm={confirm} />
      <RevisionLetterDrawer revisionId={letterId} load={loadLetter} onClose={() => setLetterId(null)} />
      <SalaryHistoryDrawer employeeId={historyId} onClose={() => setHistoryId(null)} />
    </div>
  );
}
