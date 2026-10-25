'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import type { FundRequest } from '../../types/petty-cash.model';
import { dayText, money } from '../../utils/format';
import { FUND_MODE_LABEL } from '../../constants/petty-cash.constants';
import { FundStatusPill } from './StatusBadges';

interface FundRequestListProps {
  rows: FundRequest[];
  /** Show who asked (HR lists) — the employee's own list leaves it out. */
  showRequester?: boolean;
  /** A button for the row (Pay, Withdraw…); null for none. */
  action?: (r: FundRequest) => React.ReactNode;
}

const th = 'border-b border-line bg-bg-subtle px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted 2xl:px-6';
const td = 'border-b border-line/60 px-4 py-3 text-xs sm:text-sm 2xl:px-6 align-top';

function Amount({ r }: { r: FundRequest }) {
  const lowered = r.approvedAmount !== null && r.approvedAmount < r.amount;
  return (
    <>
      <div className="font-semibold tabular-nums text-fg">{money(r.approvedAmount ?? r.amount)}</div>
      {lowered && <div className="text-[11px] tabular-nums text-fg-muted line-through">{money(r.amount)}</div>}
    </>
  );
}

function paidText(r: FundRequest) {
  if (r.status !== 'paid') return null;
  return [r.paidAt ? dayText(r.paidAt) : null, r.paidReference ? `Ref ${r.paidReference}` : null].filter(Boolean).join(' · ');
}

/** Fund requests: a table on desktop, cards on phones. */
export function FundRequestList({ rows, showRequester = true, action }: FundRequestListProps) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={th}>Requested</th>
              <th className={th}>Wallet</th>
              {showRequester && <th className={th}>By</th>}
              <th className={cx(th, 'text-right')}>Amount</th>
              <th className={th}>Status</th>
              <th className={cx(th, 'text-right')}>
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={cx(td, 'whitespace-nowrap text-fg-muted')}>{dayText(r.createdAt)}</td>
                <td className={td}>
                  <div className="font-semibold text-fg">{r.wallet.name}</div>
                  <div className="text-[11px] text-fg-muted">{FUND_MODE_LABEL[r.mode]}{r.reason ? ` · ${r.reason}` : ''}</div>
                </td>
                {showRequester && <td className={td}>{r.requestedBy.name}</td>}
                <td className={cx(td, 'text-right')}>
                  <Amount r={r} />
                </td>
                <td className={td}>
                  <FundStatusPill status={r.status} />
                  {paidText(r) && <div className="mt-1 text-[11px] text-fg-muted">{paidText(r)}</div>}
                  {r.decisionNote && <div className="mt-1 text-[11px] text-fg-muted">{r.decisionNote}</div>}
                </td>
                <td className={cx(td, 'text-right')}>{action?.(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{r.wallet.name}</p>
                <p className="truncate text-xs text-fg-muted">{[showRequester ? r.requestedBy.name : null, FUND_MODE_LABEL[r.mode], dayText(r.createdAt)].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="shrink-0 text-right text-sm">
                <Amount r={r} />
              </div>
            </div>
            {r.reason && <p className="text-xs text-fg">{r.reason}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <FundStatusPill status={r.status} />
                {paidText(r) && <span className="text-[11px] text-fg-muted">{paidText(r)}</span>}
              </div>
              {action?.(r)}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
