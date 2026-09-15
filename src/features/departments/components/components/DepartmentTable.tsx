'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { cx, text } from '@/theme/tokens';
import type { Department } from '../../types/departments.model';
import { DepartmentRowActions } from './DepartmentRowActions';

interface DepartmentTableProps {
  departments: Department[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
  onToggleStatus: (department: Department) => void;
  onOpenHeads: (department: Department) => void;
  togglingId?: number | null;
}

const cellHeaderClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';

export function DepartmentTable({
  departments,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenHeads,
  togglingId,
}: DepartmentTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[540px] md:min-w-0 border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(cellHeaderClass, 'first:rounded-tl-xl')}>Department</th>
            <th className={cx(cellHeaderClass, 'w-44 sm:w-52 lg:w-60 2xl:w-72')}>Heads</th>
            <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-44')}>Status</th>
            <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-44 text-right last:rounded-tr-xl')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((department) => (
            <tr key={department.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <div className="text-xs sm:text-sm 2xl:text-base font-semibold text-fg">{department.name}</div>
                {department.description && (
                  <div className={cx(text.caption, 'mt-0.5 max-w-xs truncate sm:max-w-sm lg:max-w-md 2xl:max-w-xl 2xl:text-sm')}>
                    {department.description}
                  </div>
                )}
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <button
                  type="button"
                  onClick={() => onOpenHeads(department)}
                  className="group inline-flex items-center gap-1.5 text-left text-xs sm:text-sm 2xl:text-base"
                >
                  {department.orgWideHeadName ? (
                    <span className="flex items-center gap-1 font-medium text-fg group-hover:text-[var(--tt-primary)]">
                      {department.orgWideHeadName}
                      {department.siteHeadCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-bg-subtle px-1.5 py-0.5 text-[10px] sm:text-[11px] 2xl:text-xs font-medium text-fg-muted">
                          +{department.siteHeadCount}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs 2xl:text-sm text-fg-subtle underline-offset-4 group-hover:text-fg group-hover:underline">
                      Unassigned
                    </span>
                  )}
                </button>
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <StatusPill label={department.status} tone={department.status} />
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

