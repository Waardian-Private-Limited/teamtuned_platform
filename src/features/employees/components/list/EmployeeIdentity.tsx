'use client';

import Link from 'next/link';
import type { EmployeeListItemDto } from '../../types/employees.dto';
import { useEmployeeRoutes } from '../../hooks/useEmployeeRoutes';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function EmployeeIdentity({ employee }: { employee: EmployeeListItemDto }) {
  const routes = useEmployeeRoutes();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-bg-subtle text-[11px] font-bold text-fg 2xl:h-10 2xl:w-10 2xl:text-xs">
        {initials(employee.name)}
      </span>
      <div className="min-w-0">
        <Link href={routes.detail(employee.id)} className="block truncate text-xs font-semibold text-fg hover:underline sm:text-sm 2xl:text-base">{employee.name}</Link>
        <div className="truncate text-[11px] text-fg-muted 2xl:text-xs">
          {[employee.employee_code, employee.designation].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
    </div>
  );
}
