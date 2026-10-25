'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FlagCount } from '@/features/expense-bills/components/Flags';
import type { Expense } from '../../types/petty-cash.model';
import { dateText, money } from '../../utils/format';
import type { ExpenseSelection } from './ExpenseTable';
import { ExpenseStatusPill, InwardNos, InwardPill, PhysicalCopyPill } from './StatusBadges';

const checkbox = 'mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong accent-[var(--tt-primary)]';

interface ExpenseCardListProps {
  rows: Expense[];
  href: (id: number) => string;
  /** HR lists lead with who spent it; the employee's own list leads with the merchant. */
  showSpender?: boolean;
  selection?: ExpenseSelection;
  /** `me`: the spender's wording for the paper bill. */
  audience?: 'hr' | 'me';
}

/** Card rows for phones (and the employee's own list on any width). */
export function ExpenseCardList({ rows, href, showSpender, selection, audience = 'hr' }: ExpenseCardListProps) {
  return (
    <>
      {rows.map((r) => {
        const title = r.merchant || r.description || r.category.name;
        return (
          <div key={r.id} className={cx('flex items-start gap-3 bg-surface p-4 transition-colors hover:bg-bg-subtle/60', (r.status === 'cancelled' || r.status === 'rejected') && 'opacity-70', selection?.ids.has(r.id) && 'bg-bg-subtle/60')}>
            {selection && <input type="checkbox" aria-label={`Select ${r.number}`} className={checkbox} checked={selection.ids.has(r.id)} onChange={() => selection.toggle(r.id)} />}
            <Link href={href(r.id)} className="group flex min-w-0 flex-1 items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">{showSpender ? r.spender.name : title}</p>
                    <p className="mt-0.5 truncate text-xs text-fg-muted">{showSpender ? [title, r.number].filter(Boolean).join(' · ') : [r.number, r.category.name, r.wallet.name].filter(Boolean).join(' · ')}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-fg">{money(r.netAmount)}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <ExpenseStatusPill status={r.status} />
                  {r.physicalCopy.status !== 'not_required' && <PhysicalCopyPill copy={r.physicalCopy} audience={audience} />}
                  {r.inward.required && <InwardPill inward={r.inward} />}
                  {r.inward.numbers.length > 0 && <InwardNos numbers={r.inward.numbers} />}
                  <FlagCount count={r.flags.length} />
                  <span className="text-[11px] text-fg-muted">{dateText(r.expenseDate)}</span>
                </div>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        );
      })}
    </>
  );
}
