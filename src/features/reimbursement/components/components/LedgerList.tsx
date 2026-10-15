'use client';

import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Scale, Undo2, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { LEDGER_TYPE_LABEL } from '../../constants/reimbursement.constants';
import type { LedgerEntry, LedgerType } from '../../types/reimbursement.model';
import { dateText, money, signedMoney } from '../../utils/format';
import { Balance } from './StatusBadges';

const ICON: Record<LedgerType, LucideIcon> = { opening: Wallet, top_up: ArrowDownLeft, expense: ArrowUpRight, return: Undo2, adjustment: Scale };

function what(e: LedgerEntry) {
  if (e.ref?.type === 'claim') return e.ref.title || `Expense #${e.ref.id}`;
  if (e.ref?.type === 'fund_request') return 'Fund request paid';
  return e.note || LEDGER_TYPE_LABEL[e.type];
}

/** What part of this entry crossed zero, in words. */
function crossings(e: LedgerEntry): string[] {
  const out: string[] = [];
  if (e.coversNegative > 0) out.push(`${money(e.coversNegative)} paid back what was below zero`);
  if (e.goesNegative > 0) out.push(`${money(e.goesNegative)} below zero`);
  return out;
}

function BeforeAfter({ e, className }: { e: LedgerEntry; className?: string }) {
  return (
    <span className={cx('whitespace-nowrap', className)}>
      <Balance value={e.balanceBefore} className="font-normal" />
      <span className="px-1 text-fg-muted" aria-label="to">→</span>
      <Balance value={e.balanceAfter} className="font-semibold" />
    </span>
  );
}

function Crossings({ e }: { e: LedgerEntry }) {
  const lines = crossings(e);
  if (!lines.length) return null;
  return <div className="text-[11px] text-fg-muted">{lines.join(' · ')}</div>;
}

/** Wallet movements with the balance before and after each one. `claimHref` links expenses to their claim. */
export function LedgerList({ entries, claimHref }: { entries: LedgerEntry[]; claimHref?: (id: number) => string }) {
  const th = 'border-b border-line bg-bg-subtle px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted 2xl:px-6';
  const td = 'border-b border-line/60 px-4 py-2.5 text-xs sm:text-sm 2xl:px-6';
  const label = (e: LedgerEntry) =>
    e.ref?.type === 'claim' && claimHref ? (
      <Link href={claimHref(e.ref.id)} className="font-semibold text-fg underline-offset-2 hover:underline">
        {what(e)}
      </Link>
    ) : (
      <span className="font-semibold text-fg">{what(e)}</span>
    );
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
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate">{label(e)}</div>
                        <div className="truncate text-[11px] text-fg-muted">
                          {LEDGER_TYPE_LABEL[e.type]}
                          {e.by ? ` · ${e.by}` : ''}
                        </div>
                        <Crossings e={e} />
                      </div>
                    </div>
                  </td>
                  <td className={cx(td, 'hidden text-fg-muted lg:table-cell')}>{e.reference || '—'}</td>
                  <td className={cx(td, 'text-right font-semibold tabular-nums', e.amount < 0 ? 'text-fg' : 'text-fg')}>{signedMoney(e.amount, money)}</td>
                  <td className={cx(td, 'text-right')}>
                    <BeforeAfter e={e} />
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
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{label(e)}</span>
                  <span className="shrink-0 font-bold tabular-nums text-fg">{signedMoney(e.amount, money)}</span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[11px] text-fg-muted">
                  <span className="truncate">
                    {dateText(e.date)} · {LEDGER_TYPE_LABEL[e.type]}
                    {e.reference ? ` · ${e.reference}` : ''}
                  </span>
                  <BeforeAfter e={e} className="shrink-0" />
                </div>
                <Crossings e={e} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
