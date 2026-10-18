'use client';

import { MapPin } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import type { EmployeeSiteRow } from '../../types/employeeSites.model';
import { EmployeeTags } from './EmployeeTags';

interface EmployeeSiteCardListProps {
  employees: EmployeeSiteRow[];
  canAssign: boolean;
  onOpen: (employee: EmployeeSiteRow) => void;
}

export function EmployeeSiteCardList({ employees, canAssign, onOpen }: EmployeeSiteCardListProps) {
  return (
    <>
      {employees.map((emp) => (
        <div key={emp.id} className="p-4" onClick={() => onOpen(emp)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-medium text-fg">{emp.name}</span>
                <EmployeeTags employee={emp} />
              </div>
              <div className={cx(text.caption, 'mt-0.5 truncate')}>
                {[emp.code, emp.department].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(emp);
              }}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-bg-subtle"
            >
              {canAssign ? 'Assign' : 'View'}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-fg-subtle" />
              {emp.primarySite ? emp.primarySite.name : 'Not assigned'}
            </span>
            <span>{emp.siteCount} site{emp.siteCount === 1 ? '' : 's'}</span>
            <span>{emp.otherLocationCount} other location{emp.otherLocationCount === 1 ? '' : 's'}</span>
          </div>
        </div>
      ))}
    </>
  );
}
