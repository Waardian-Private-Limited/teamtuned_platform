'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Claim } from '../../types/reimbursement.model';
import { dateText, money } from '../../utils/format';
import { ChannelBadge, ClaimStatusPill, FlagCount } from './StatusBadges';
import { PhysicalCopyPill } from './PaperBill';

interface ClaimCardListProps {
  rows: Claim[];
  href: (id: number) => string;
  showEmployee?: boolean;
  showChannel?: boolean;
}

/** Card rows for phones and the employee's own list. */
export function ClaimCardList({ rows, href, showEmployee, showChannel }: ClaimCardListProps) {
  return (
    <>
      {rows.map((r) => (
        <Link
          key={r.id}
          href={href(r.id)}
          className={cx('group flex items-start gap-3 bg-surface p-4 transition-colors hover:bg-bg-subtle/60', (r.status === 'cancelled' || r.status === 'rejected') && 'opacity-70')}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{showEmployee ? r.employee.name : r.title}</p>
                <p className="mt-0.5 truncate text-xs text-fg-muted">
                  {showEmployee ? [r.title, r.employee.code].filter(Boolean).join(' · ') : [r.number, r.categories.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums text-fg">{money(r.amount)}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <ClaimStatusPill status={r.status} channel={r.channel} />
              {showChannel && <ChannelBadge channel={r.channel} />}
              {r.physicalCopy.status !== 'not_required' && <PhysicalCopyPill copy={r.physicalCopy} audience={showEmployee ? 'hr' : 'me'} />}
              <FlagCount count={r.flagCount} />
              <span className="text-[11px] text-fg-muted">
                {r.status === 'draft' ? `Saved ${dateText(r.createdAt)}` : `Submitted ${dateText(r.submittedAt || r.createdAt)}`} · {r.lineCount} {r.lineCount === 1 ? 'expense' : 'expenses'}
              </span>
            </div>
          </div>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </>
  );
}
