'use client';

import { ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/features/compensation/components/shared/StatusBadge';
import type { RevisionDto } from '@/features/compensation/types/compensation.dto';
import { date, inr, pct } from '@/features/compensation/utils/format';
import { RevisionRowActions, type RevisionActionHandlers, type RevisionPerms } from './RevisionRowActions';

export function RevisionCardList({ revisions, selected, onToggle, perms, busyIds, handlers }: {
  revisions: RevisionDto[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  perms: RevisionPerms;
  busyIds: Set<number>;
  handlers: RevisionActionHandlers;
}) {
  return (
    <>
      {revisions.map((r) => (
        <div key={r.id} className="p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <label className="flex min-w-0 items-start gap-2.5">
              <input type="checkbox" className="mt-1" checked={selected.has(r.id)} onChange={() => onToggle(r.id)} aria-label={`Select ${r.employee.name}`} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-fg">{r.employee.name}</span>
                <span className="block truncate text-[11px] text-fg-muted">{r.revision_type_label} · {date(r.effective_from)}</span>
              </span>
            </label>
            <StatusBadge status={r.status} />
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
            {inr(r.previous_ctc)} <ArrowRight className="h-3 w-3" /> <b className="text-fg">{inr(r.new_ctc)}</b> <span className="font-semibold text-fg">{pct(r.change_percent)}</span>
          </p>
          {r.new_designation && r.new_designation !== r.previous_designation && <p className="mt-1 text-[11px] text-fg-muted">{r.previous_designation || '—'} → {r.new_designation}</p>}
          <div className="mt-2.5 border-t border-line/60 pt-2">
            <RevisionRowActions revision={r} perms={perms} busy={busyIds.has(r.id)} handlers={handlers} />
          </div>
        </div>
      ))}
    </>
  );
}
