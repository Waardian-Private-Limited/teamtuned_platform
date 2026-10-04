'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import type { LeaveRequest } from '../types/leave';
import { STATUS_TONE, days, range, SESSION_LABEL } from '../utils/format';

// One request per row; works as a table on wide screens and as cards on phones.
export function RequestsList({ rows, showEmployee, onOpen }: { rows: LeaveRequest[]; showEmployee: boolean; onOpen: (r: LeaveRequest) => void }) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => onOpen(r)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-bg-subtle sm:px-4">
            <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: r.leave_type.color ?? 'var(--tt-primary)' }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-fg">{showEmployee ? r.employee.name : r.leave_type.name}</p>
              <p className="truncate text-xs text-fg-muted">
                {showEmployee ? `${r.leave_type.name} · ` : ''}{range(r.start_date, r.end_date)}
                {r.start_date === r.end_date && r.start_session !== 'full' ? ` · ${SESSION_LABEL[r.start_session]}` : ''}
              </p>
            </div>
            <span className="hidden text-sm font-semibold text-fg sm:block">{days(r.charged_days)}{r.lop_days > 0 && <span className="ml-1 text-xs font-normal text-[var(--tt-danger)]">{days(r.lop_days)} unpaid</span>}</span>
            <StatusPill label={r.status} tone={STATUS_TONE[r.status]} />
          </button>
        </li>
      ))}
    </ul>
  );
}
