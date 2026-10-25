'use client';

import { cx } from '@/theme/tokens';
import * as api from '../../api/reimbursement.api';
import type { FundRequest } from '../../types/reimbursement.model';
import { dateText, money } from '../../utils/format';
import { FileChip, useLinkOpener } from '@/features/expense-bills/components/FileLinks';
import { FundStatusPill } from './StatusBadges';

interface FundRequestListProps {
  rows: FundRequest[];
  /** Whose links open the attached files: the employee's own (`me`) or wallet staff (`hr`). */
  scope: 'me' | 'hr';
  showEmployee?: boolean;
  action?: (r: FundRequest) => React.ReactNode;
}

export function FundRequestList({ rows, scope, showEmployee, action }: FundRequestListProps) {
  const opener = useLinkOpener();
  return (
    <>
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const reduced = r.approvedAmount !== null && r.approvedAmount !== r.amount;
          return (
            <li key={r.id} className={cx('flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5', (r.status === 'rejected' || r.status === 'cancelled') && 'opacity-70')}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold tabular-nums text-fg">
                    {reduced ? (
                      <>
                        <span className="mr-1.5 font-normal text-fg-subtle line-through">{money(r.amount)}</span>
                        {money(r.approvedAmount)}
                      </>
                    ) : (
                      money(r.approvedAmount ?? r.amount)
                    )}
                  </span>
                  <FundStatusPill status={r.status} />
                </div>
                <p className="mt-0.5 truncate text-xs text-fg-muted">
                  {[showEmployee ? r.employee.name : null, `Asked ${dateText(r.createdAt)}`, r.status === 'paid' ? `Paid ${dateText(r.paidOn)}` : null, r.paidReference ? `Ref ${r.paidReference}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {r.reason && <p className="mt-1 text-xs text-fg sm:text-sm">{r.reason}</p>}
                {r.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Attached files">
                    {r.attachments.map((a) => {
                      const id = `${r.id}:${a.index}`;
                      return (
                        <FileChip
                          key={a.index}
                          name={a.name}
                          size={a.size}
                          type={a.type}
                          busy={opener.opening === id}
                          onClick={() => opener.open(id, () => api.fundRequestFileUrl(scope, r.id, a.index))}
                        />
                      );
                    })}
                  </div>
                )}
                {r.decisionNote && <p className="mt-1 rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs text-fg">{r.decisionNote}</p>}
              </div>
              {action && <div className="flex shrink-0 gap-2">{action(r)}</div>}
            </li>
          );
        })}
      </ul>
      {opener.error && (
        <p role="alert" className="px-4 pb-3 text-xs font-medium text-[var(--tt-danger)] sm:px-5">
          {opener.error}
        </p>
      )}
    </>
  );
}
