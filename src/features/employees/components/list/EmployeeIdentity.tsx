'use client';

import type { EmployeeListItemDto } from '../../types/employees.dto';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function EmployeeIdentity({ employee }: { employee: EmployeeListItemDto }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-bg-subtle text-[11px] font-bold text-fg 2xl:h-10 2xl:w-10 2xl:text-xs">
        {initials(employee.name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-fg sm:text-sm 2xl:text-base">{employee.name}</p>
        <div className="truncate text-[11px] text-fg-muted 2xl:text-xs">
          {[employee.employee_code, employee.designation].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
    </div>
  );
}
