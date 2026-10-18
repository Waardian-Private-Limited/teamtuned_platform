'use client';

import type { EmployeeSiteRow } from '../../types/employeeSites.model';

const tagClass = 'inline-flex items-center rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide 2xl:text-[11px]';

// Small inline markers next to the employee's name: in-charge, any-site
// access, and a non-active status.
export function EmployeeTags({ employee }: { employee: EmployeeSiteRow }) {
  return (
    <>
      {employee.isIncharge && <span className={`${tagClass} border-fg bg-fg text-fg-inverted`}>In-charge</span>}
      {employee.canCheckinAnySite && <span className={`${tagClass} border-line text-fg-muted`}>Any site</span>}
      {employee.status && employee.status !== 'Active' && (
        <span className={`${tagClass} border-dashed border-line-strong text-fg-subtle`}>{employee.status}</span>
      )}
    </>
  );
}
