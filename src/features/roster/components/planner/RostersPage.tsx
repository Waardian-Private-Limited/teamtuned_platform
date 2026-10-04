'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePermission } from '@/lib/hooks/usePermission';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { cx } from '@/theme/tokens';
import { ROSTER_PERMISSIONS } from '../../constants/roster.constants';
import type { RosterRow } from '../../types/roster.types';
import { useRosters } from '../../hooks/useRosters';
import { useRostersMutations } from '../../hooks/useRostersMutations';
import { RostersToolbar } from './components/RostersToolbar';
import { RostersTable } from './components/RostersTable';
import { NewRosterDialog } from './components/NewRosterDialog';
import { ExportRosterDialog } from './components/ExportRosterDialog';
import { TeamsEmptyState } from '../teams/components/TeamsEmptyState';

function LoadingRows() {
  return (
    <div className="animate-pulse divide-y divide-line/60">
      {Array.from({ length: 6 }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4 lg:px-5">
          <div className="h-3.5 w-32 rounded bg-bg-subtle" />
          <div className="h-3.5 w-40 rounded bg-bg-subtle/70" />
          <div className="ml-auto h-5 w-16 rounded-full bg-bg-subtle" />
        </div>
      ))}
    </div>
  );
}

export function RostersPage() {
  const pathname = usePathname();
  const router = useRouter();
  const base = pathname.startsWith('/org-admin') ? '/org-admin/roster' : '/employee/roster';
  const { can } = usePermission();
  const canAdd = can(ROSTER_PERMISSIONS.ADD);
  const canEdit = can(ROSTER_PERMISSIONS.EDIT);
  const canDelete = can(ROSTER_PERMISSIONS.DELETE);

  const list = useRosters();
  const mutations = useRostersMutations(list.refetch);
  const [creating, setCreating] = useState(false);
  const [exportRow, setExportRow] = useState<RosterRow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(list.rosters.length / pageSize));
  const pageRows = useMemo(() => list.rosters.slice((page - 1) * pageSize, page * pageSize), [list.rosters, page, pageSize]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => {
    setPage(1);
  }, [list.unitId, list.status, list.subOrgId, list.fromMonth, list.toMonth]);
  const [confirm, setConfirm] = useState<{ kind: 'archive' | 'delete'; row: RosterRow } | null>(null);

  const open = useCallback((row: RosterRow) => router.push(`${base}/${row.id}`), [router, base]);

  const submitCreate = async (unitId: number, start: string, end: string) => {
    const id = await mutations.create(unitId, start, end);
    if (id) {
      setCreating(false);
      router.push(`${base}/${id}`);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const ok = confirm.kind === 'archive' ? await mutations.archive(confirm.row) : await mutations.remove(confirm.row);
    if (ok) setConfirm(null);
  };

  const noTeams = list.unitsLoaded && list.units.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <RostersToolbar
        total={list.rosters.length}
        units={list.visibleUnits}
        unitId={list.unitId}
        onUnitChange={list.setUnitId}
        status={list.status}
        onStatusChange={list.setStatus}
        subOrgId={list.subOrgId}
        onSubOrgChange={list.setSubOrgId}
        fromMonth={list.fromMonth}
        toMonth={list.toMonth}
        onFromMonth={list.setFromMonth}
        onToMonth={list.setToMonth}
        hasFilters={list.hasFilters}
        onClear={list.clearFilters}
        canAdd={canAdd && !noTeams}
        onAdd={() => setCreating(true)}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && (
          <div className="border-b border-line p-3">
            <Alert message={list.error} tone="error" />
          </div>
        )}
        {list.loading ? (
          <LoadingRows />
        ) : list.rosters.length === 0 ? (
          noTeams ? (
            <TeamsEmptyState
              title="Create a team first"
              description="A roster is built for one team over a period. Set up a team with its members and the shifts it needs, then come back to plan."
              action={
                <Link
                  href={`${base}/teams`}
                  className="mt-3.5 sm:mt-4 2xl:mt-6 inline-flex h-9 sm:h-9.5 2xl:h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 2xl:px-6 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm 2xl:text-base"
                >
                  Go to teams
                </Link>
              }
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
              {list.hasFilters ? (
                <>
                  <h3 className="text-base font-semibold text-fg">No rosters match</h3>
                  <p className="mt-1 max-w-sm text-sm text-fg-muted">Try changing or clearing the filters.</p>
                  <button type="button" onClick={list.clearFilters} className="mt-4 text-sm font-semibold text-fg underline-offset-4 hover:underline">Clear filters</button>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-fg">No rosters yet</h3>
                  <p className="mt-1 max-w-sm text-sm text-fg-muted">Create a roster for a team and period, generate it, review it and publish it to your people.</p>
                  {canAdd && (
                    <button type="button" onClick={() => setCreating(true)} className="mt-5 inline-flex h-10 items-center rounded-lg bg-[var(--tt-primary)] px-5 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]">
                      New roster
                    </button>
                  )}
                </>
              )}
            </div>
          )
        ) : (
          <div className={cx('flex min-h-0 flex-1 flex-col transition-opacity duration-200', list.fetching ? 'opacity-70' : 'opacity-100')}>
            <RostersTable
              rows={pageRows}
              canEdit={canEdit}
              canDelete={canDelete}
              busyId={mutations.busyId}
              onOpen={open}
              onArchive={(row) => setConfirm({ kind: 'archive', row })}
              onDelete={(row) => setConfirm({ kind: 'delete', row })}
              onExport={setExportRow}
            />
            <div className="border-t border-line bg-surface px-4 py-2.5">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={list.rosters.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
              />
            </div>
          </div>
        )}
      </div>

      {exportRow && <ExportRosterDialog open rosterId={exportRow.id} teamName={exportRow.unit_name} onClose={() => setExportRow(null)} />}

      <NewRosterDialog
        open={creating}
        units={list.visibleUnits}
        defaultUnitId={list.unitId}
        saving={mutations.saving}
        fieldError={mutations.fieldError}
        onClearError={mutations.clearFieldError}
        onClose={() => {
          setCreating(false);
          mutations.clearFieldError();
        }}
        onSubmit={submitCreate}
      />

      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === 'delete' ? 'Delete roster?' : 'Archive roster?'}
        footer={
          <>
            <Button variant="secondary" className="!h-10 !w-auto px-4 !text-sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant={confirm?.kind === 'delete' ? 'danger' : 'primary'} className="!h-10 !w-auto px-5 !text-sm" loading={mutations.busyId !== null} onClick={runConfirm}>
              {confirm?.kind === 'delete' ? 'Delete' : 'Archive'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          {confirm?.kind === 'delete'
            ? `The ${confirm.row.unit_name} roster for ${confirm.row.period_start} to ${confirm.row.period_end} and all its edits will be removed. This cannot be undone.`
            : 'An archived roster becomes read-only. Schedules already published to employees stay as they are.'}
        </p>
      </Dialog>
    </div>
  );
}
