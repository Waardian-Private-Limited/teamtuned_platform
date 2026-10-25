'use client';

import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Scale, Undo2, Wallet, Calculator } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { LEDGER_TYPE_LABEL } from '../../constants/petty-cash.constants';
import type { LedgerEntry, LedgerType } from '../../types/petty-cash.model';
import { dateText, money, signedMoney } from '../../utils/format';
import { Balance } from './StatusBadges';

const ICON: Record<LedgerType, LucideIcon> = { opening: Wallet, top_up: ArrowDownLeft, expense: ArrowUpRight, return: Undo2, adjustment: Scale, count_diff: Calculator };

function what(e: LedgerEntry) {
  if (e.expense) return [e.expense.number, e.expense.merchant || e.expense.description].filter(Boolean).join(' · ');
  return e.note || LEDGER_TYPE_LABEL[e.type];
}

/** Wallet movements with the balance after each one. `expenseHref` links expense rows to their page. */
export function LedgerList({ entries, expenseHref }: { entries: LedgerEntry[]; expenseHref?: (id: number) => string }) {
  const th = 'border-b border-line bg-bg-subtle px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted 2xl:px-6';
  const td = 'border-b border-line/60 px-4 py-2.5 text-xs sm:text-sm 2xl:px-6';
  const label = (e: LedgerEntry) =>
    e.ref?.type === 'expense' && expenseHref ? (
      <Link href={expenseHref(e.ref.id)} className="font-semibold text-fg underline-offset-2 hover:underline">
        {what(e)}
      </Link>
    ) : (
      <span className="font-semibold text-fg">{what(e)}</span>
    );
  const sub = (e: LedgerEntry) => [LEDGER_TYPE_LABEL[e.type], e.expense?.inwardNo ? `Inward ${e.expense.inwardNo}` : null, e.by].filter(Boolean).join(' · ');
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Entry</th>
              <th className={cx(th, 'hidden lg:table-cell')}>Reference</th>
              <th className={cx(th, 'text-right')}>Amount</th>
              <th className={cx(th, 'text-right')}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const Icon = ICON[e.type] || Wallet;
              return (
                <tr key={e.id}>
                  <td className={cx(td, 'whitespace-nowrap text-fg-muted')}>{dateText(e.date)}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate">{label(e)}</div>
                        <div className="truncate text-[11px] text-fg-muted">{sub(e)}</div>
                      </div>
                    </div>
                  </td>
                  <td className={cx(td, 'hidden text-fg-muted lg:table-cell')}>{e.reference || '—'}</td>
                  <td className={cx(td, 'text-right font-semibold tabular-nums text-fg')}>{signedMoney(e.amount, money)}</td>
                  <td className={cx(td, 'text-right')}>
                    <Balance value={e.balanceAfter} className="font-semibold" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-line md:hidden">
        {entries.map((e) => {
          const Icon = ICON[e.type] || Wallet;
          return (
            <li key={e.id} className="flex items-start gap-3 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{label(e)}</span>
                  <span className="shrink-0 font-bold tabular-nums text-fg">{signedMoney(e.amount, money)}</span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[11px] text-fg-muted">
                  <span className="truncate">
                    {dateText(e.date)} · {sub(e)}
                    {e.reference ? ` · ${e.reference}` : ''}
                  </span>
                  <span className="shrink-0">
                    Balance <Balance value={e.balanceAfter} className="font-semibold" />
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
