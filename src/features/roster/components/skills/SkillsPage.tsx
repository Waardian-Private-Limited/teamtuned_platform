'use client';

import { usePermission } from '@/lib/hooks/usePermission';
import { Alert } from '@/components/ui/Alert';
import { ROSTER_PERMISSIONS } from '../../constants/roster.constants';
import { useSkillsList } from '../../hooks/useSkillsList';
import { PageHeader } from '../catalog-shared/ToolbarShell';
import { SkillsList } from './components/SkillsList';
import { EmployeeSkillsPanel } from './components/EmployeeSkillsPanel';

export function SkillsPage() {
  const { can } = usePermission();
  const canAdd = can(ROSTER_PERMISSIONS.ADD);
  const canEdit = can(ROSTER_PERMISSIONS.EDIT);
  const canDelete = can(ROSTER_PERMISSIONS.DELETE);
  const list = useSkillsList();

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Skills" count={list.skills.length} hint="Tag people with skills, then require them on shifts so only qualified people are rostered." />
      {list.error && <Alert message={list.error} tone="error" />}
      {list.loading ? (
        <div className="grid animate-pulse gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="h-64 rounded-xl border border-line bg-bg-subtle/60" />
          <div className="h-64 rounded-xl border border-line bg-bg-subtle/60" />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 content-start items-start gap-3 overflow-y-auto lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <SkillsList
            skills={list.skills}
            busy={list.busy}
            rowError={list.rowError}
            canAdd={canAdd}
            canEdit={canEdit}
            canDelete={canDelete}
            onAdd={list.add}
            onRename={list.rename}
            onDelete={list.remove}
          />
          <EmployeeSkillsPanel skills={list.skills} canEdit={canEdit} onSaved={list.refetch} />
        </div>
      )}
    </div>
  );
}
