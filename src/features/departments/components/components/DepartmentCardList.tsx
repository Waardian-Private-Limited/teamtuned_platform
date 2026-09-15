'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { cx, text } from '@/theme/tokens';
import type { Department } from '../../types/departments.model';
import { DepartmentRowActions } from './DepartmentRowActions';

interface DepartmentCardListProps {
  departments: Department[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
  onToggleStatus: (department: Department) => void;
  onOpenHeads: (department: Department) => void;
  togglingId?: number | null;
}

export function DepartmentCardList({
  departments,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenHeads,
  togglingId,
}: DepartmentCardListProps) {
  return (
    <>
      {departments.map((department) => (
        <div key={department.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-fg">{department.name}</div>
              {department.description && (
                <div className={cx(text.caption, 'mt-0.5 truncate')}>{department.description}</div>
              )}
            </div>
            <StatusPill label={department.status} tone={department.status} />
          </div>

          <button type="button" onClick={() => onOpenHeads(department)} className="mt-2 text-left text-sm">
            {department.orgWideHeadName ? (
              <span className="text-fg-muted">
                Head: <span className="text-fg">{department.orgWideHeadName}</span>
                {department.siteHeadCount > 0 && (
                  <span className={text.caption}>
                    {' '}
                    +{department.siteHeadCount} site{department.siteHeadCount === 1 ? '' : 's'}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-fg-subtle underline-offset-4 hover:underline">Assign a head</span>
            )}
          </button>

          <div className="mt-3 flex justify-end">
            <DepartmentRowActions
              department={department}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
              onOpenHeads={onOpenHeads}
              isToggling={togglingId === department.id}
            />
          </div>
        </div>
      ))}
    </>
  );
}
