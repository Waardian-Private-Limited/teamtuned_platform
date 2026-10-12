'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Advance } from '../../types/salaryAdvance.model';
import { money, monthLabel } from '../../utils/format';
import { RecoveryCell } from './AdvanceTable';
import { AdvanceStatusPill } from './StatusBadges';

export function AdvanceCardList({ rows, detailHref, onOpen }: { rows: Advance[]; detailHref?: (id: number) => string; onOpen?: (row: Advance) => void }) {
  return (
    <>
      {rows.map((row) => {
        const body = (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-fg">{detailHref ? row.employeeName : row.typeName}</div>
                <div className="mt-0.5 truncate text-xs text-fg-muted">
                  {detailHref ? `${row.employeeCode || '—'} · ${row.typeName}` : `${row.installments} × ${money(row.installmentAmount)}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold tabular-nums text-fg">{money(row.amount)}</div>
                {row.nextDue && <div className="mt-0.5 text-[11px] text-fg-muted">Next {money(row.nextDue.amount)} · {monthLabel(row.nextDue.month, 'short')}</div>}
              </div>
            </div>
            <div className="mt-3">
              <RecoveryCell row={row} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <AdvanceStatusPill status={row.status} />
              <ChevronRight className="h-4 w-4 text-fg-subtle" />
            </div>
          </>
        );
        const cls = cx('block w-full bg-surface p-4 text-left transition-colors hover:bg-bg-subtle/50', (row.status === 'cancelled' || row.status === 'rejected') && 'opacity-60');
        return detailHref ? (
          <Link key={row.id} href={detailHref(row.id)} className={cls}>
            {body}
          </Link>
        ) : (
          <button key={row.id} type="button" onClick={() => onOpen?.(row)} className={cls}>
            {body}
          </button>
        );
      })}
    </>
  );
}
