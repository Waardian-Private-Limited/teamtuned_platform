'use client';

import React from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { Alert } from '@/components/ui/Alert';
import { ROSTER_PERMISSIONS } from '../../constants/roster.constants';
import { useTeamsList } from '../../hooks/useTeamsList';
import { useTeamsCatalog } from '../../hooks/useTeamsCatalog';
import type { RosterUnit } from '../../types/roster.types';
import { ConfirmDeleteDialog } from '../catalog-shared/ConfirmDeleteDialog';
import { TeamsToolbar } from './components/TeamsToolbar';
import { TeamsTree } from './components/TeamsTree';
import { TeamDrawer } from './components/TeamDrawer';
import { TeamsEmptyState } from './components/TeamsEmptyState';

export function TeamsPage() {
  const { can } = usePermission();
  const canAdd = can(ROSTER_PERMISSIONS.ADD);
  const canEdit = can(ROSTER_PERMISSIONS.EDIT);
  const canDelete = can(ROSTER_PERMISSIONS.DELETE);
  const list = useTeamsList();
  const catalog = useTeamsCatalog();
  const [drawer, setDrawer] = React.useState<{ open: boolean; unitId: number | null }>({ open: false, unitId: null });
  const [deleteTarget, setDeleteTarget] = React.useState<RosterUnit | null>(null);

  const openNew = () => setDrawer({ open: true, unitId: null });
  const openEdit = (u: RosterUnit) => setDrawer({ open: true, unitId: u.id });
  const closeDrawer = () => setDrawer((d) => ({ ...d, open: false }));
  const closeDelete = () => {
    setDeleteTarget(null);
    list.clearDeleteError();
  };
  const confirmDelete = async () => {
    if (deleteTarget && (await list.remove(deleteTarget))) closeDelete();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <TeamsToolbar
        total={list.units.length}
        search={list.searchInput}
        onSearch={list.setSearchInput}
        status={list.status}
        onStatus={list.setStatus}
        subOrgId={list.subOrgId}
        onSubOrg={list.setSubOrgId}
        canAdd={canAdd}
        onAdd={openNew}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && <div className="border-b border-line p-3"><Alert message={list.error} tone="error" /></div>}

        {list.loading ? (
          <div className="animate-pulse divide-y divide-line/60">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 lg:px-5">
                <div className="h-3.5 rounded bg-bg-subtle" style={{ width: `${120 + (i % 3) * 40}px` }} />
                <div className="ml-auto h-5 w-16 rounded-full bg-bg-subtle" />
              </div>
            ))}
          </div>
        ) : list.units.length === 0 ? (
          <div className={`flex flex-1 flex-col transition-opacity duration-200 ${list.fetching ? 'opacity-70' : 'opacity-100'}`}>
            <TeamsEmptyState
              status={list.status}
              canAdd={canAdd}
              onAdd={openNew}
              searchTerm={list.searchInput}
              hasSubOrgFilter={Boolean(list.subOrgId)}
              onClear={list.clearFilters}
            />
          </div>
        ) : (
          <div className={`flex min-h-0 flex-1 flex-col transition-opacity duration-200 ${list.fetching ? 'opacity-70' : 'opacity-100'}`}>
            <TeamsTree units={list.units} canEdit={canEdit} canDelete={canDelete} busyId={list.busyId} onEdit={openEdit} onToggle={list.toggleStatus} onDelete={setDeleteTarget} />
          </div>
        )}
      </div>

      <TeamDrawer open={drawer.open} unitId={drawer.unitId} units={list.allUnits} catalog={catalog} onClose={closeDrawer} onChanged={list.refetch} />

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Delete team"
        subject={deleteTarget?.name ?? ''}
        body="This cannot be undone. A team with rosters or sub-teams cannot be deleted; deactivate it instead."
        isDeleting={list.busyId === deleteTarget?.id}
        error={list.deleteError}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
