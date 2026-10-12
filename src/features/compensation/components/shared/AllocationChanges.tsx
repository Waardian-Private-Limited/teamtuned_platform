'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { useManageableSubOrgs } from '@/features/sub-organizations/hooks/useManageableSubOrgs';
import type { AllocationSnapshot } from '../../types/compensation.dto';
import { inr } from '../../utils/format';

const annual = (a: AllocationSnapshot) => (a.ctc !== null && a.ctc !== undefined ? Number(a.ctc) : Number(a.gross) * 12);
const same = (a: AllocationSnapshot, b: AllocationSnapshot) => (a.sub_organization_id ?? 0) === (b.sub_organization_id ?? 0);

export function AllocationChanges({ previous, next, struck = false, className }: {
  previous?: AllocationSnapshot[] | null;
  next?: AllocationSnapshot[] | null;
  struck?: boolean;
  className?: string;
}) {
  const { subOrgs } = useManageableSubOrgs();
  if (!next || next.length < 2) return null;
  const nameOf = (id: number | null) => subOrgs.find((s) => s.id === id)?.name || (id ? `Company #${id}` : 'Organization');
  const removed = (previous || []).filter((p) => !next.some((n) => same(n, p)));

  return (
    <ul className={cx('space-y-0.5', struck && 'line-through', className)}>
      {next.map((a) => {
        const before = (previous || []).find((p) => same(p, a));
        return (
          <li key={a.sub_organization_id ?? 0} className="flex flex-wrap items-center gap-1 text-[11px] text-fg-muted">
            <span className="font-semibold text-fg">{nameOf(a.sub_organization_id)}</span>
            {a.is_primary && <span>(primary)</span>}
            <span>{before ? inr(annual(before)) : 'New'}</span>
            <ArrowRight className="h-3 w-3" />
            <b className="text-fg">{inr(annual(a))}</b>
          </li>
        );
      })}
      {removed.map((p) => (
        <li key={`x${p.sub_organization_id ?? 0}`} className="flex flex-wrap items-center gap-1 text-[11px] text-fg-muted">
          <span className="font-semibold text-fg">{nameOf(p.sub_organization_id)}</span>
          <span>{inr(annual(p))}</span>
          <ArrowRight className="h-3 w-3" />
          <span>Removed</span>
        </li>
      ))}
    </ul>
  );
}
