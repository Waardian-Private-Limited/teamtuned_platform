'use client';

import { MapPin } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import type { EmployeeSiteRow } from '../../types/employeeSites.model';
import { EmployeeTags } from './EmployeeTags';

interface EmployeeSiteTableProps {
  employees: EmployeeSiteRow[];
  canAssign: boolean;
  onOpen: (employee: EmployeeSiteRow) => void;
}

const cellHeaderClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';
const cellClass = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4';

export function EmployeeSiteTable({ employees, canAssign, onOpen }: EmployeeSiteTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[760px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(cellHeaderClass, 'first:rounded-tl-xl')}>Employee</th>
            <th className={cx(cellHeaderClass, 'w-40 lg:w-48 2xl:w-56')}>Department</th>
            <th className={cx(cellHeaderClass, 'w-40 lg:w-48 2xl:w-56')}>Primary site</th>
            <th className={cx(cellHeaderClass, 'w-20 lg:w-24')}>Sites</th>
            <th className={cx(cellHeaderClass, 'w-24 lg:w-28')}>Other locs</th>
            <th className={cx(cellHeaderClass, 'w-28 text-right last:rounded-tr-xl')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr
              key={emp.id}
              onClick={() => onOpen(emp)}
              className="cursor-pointer transition-colors hover:bg-bg-subtle/50"
            >
              <td className={cellClass}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-fg sm:text-sm 2xl:text-base">{emp.name}</span>
                  <EmployeeTags employee={emp} />
                </div>
                <div className={cx(text.caption, 'mt-0.5 truncate 2xl:text-sm')}>
                  {[emp.code, emp.designation || emp.role].filter(Boolean).join(' · ') || '—'}
                </div>
              </td>
              <td className={cellClass}>
                <span className="text-xs text-fg-muted sm:text-sm 2xl:text-base">{emp.department ?? '—'}</span>
              </td>
              <td className={cellClass}>
                {emp.primarySite ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-fg sm:text-sm 2xl:text-base">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                    <span className="truncate">{emp.primarySite.name}</span>
                  </span>
                ) : (
                  <span className="text-xs text-fg-subtle sm:text-sm">Not assigned</span>
                )}
              </td>
              <td className={cellClass}>
                <span className="text-xs font-medium text-fg sm:text-sm 2xl:text-base">{emp.siteCount}</span>
              </td>
              <td className={cellClass}>
                <span className="text-xs font-medium text-fg sm:text-sm 2xl:text-base">{emp.otherLocationCount}</span>
              </td>
              <td className={cx(cellClass, 'text-right')}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(emp);
                  }}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle 2xl:h-9 2xl:text-sm"
                >
                  {canAssign ? 'Assign' : 'View'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
