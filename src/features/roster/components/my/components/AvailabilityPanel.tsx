'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { STATUS_LABELS } from '../../../constants/roster.constants';
import { formatDay, maskToDays } from '../../../utils/rosterTime';
import { WEEKDAYS, ALL_DAYS_MASK } from '../../../constants/roster.constants';
import { useMyRosterAvailability } from '../../../hooks/useMyRosterAvailability';
import { AddAvailabilityDialog } from './AddAvailabilityDialog';

const KIND_TEXT = { unavailable: 'Cannot work', avoid: 'Would rather not work', prefer: 'Would like to work' } as const;

export function AvailabilityPanel() {
  const a = useMyRosterAvailability();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">Tell your manager when you cannot work or which days you prefer.</p>
        <Button className="!h-9 !w-auto shrink-0 !px-3 !text-[13px]" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {a.loading ? (
        <TableSkeleton rows={3} columns={3} />
      ) : a.error ? (
        <p className="text-sm font-medium text-[var(--tt-danger)]">{a.error}</p>
      ) : a.entries.length === 0 ? (
        <EmptyState compact title="No availability entries" description="Add one when you need time off from shifts or have a preference." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {a.entries.map((e) => {
            const days = maskToDays(e.days_mask);
            const everyDay = e.days_mask === ALL_DAYS_MASK;
            const active = e.status === 'pending' || e.status === 'approved';
            return (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-fg">{KIND_TEXT[e.kind]}</p>
                  <p className="text-xs text-fg-muted">
                    {e.from_date === e.to_date ? formatDay(e.from_date.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : `${formatDay(e.from_date.slice(0, 10))} to ${formatDay(e.to_date.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    {!everyDay && ` · ${days.map((d) => WEEKDAYS[d]).join(', ')}`}
                    {e.shift_template_id ? ` · ${a.shiftNames.get(e.shift_template_id) || 'One shift'} only` : ''}
                  </p>
                  {e.note && <p className="mt-0.5 text-xs text-fg-muted">{e.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-semibold text-fg">{STATUS_LABELS[e.status]}</span>
                  {active && (
                    <Button variant="ghost" className="!h-8 !w-auto !px-2 !text-xs" onClick={() => void a.cancel(e.id)}>Cancel</Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding && <AddAvailabilityDialog shiftOptions={a.shiftOptions} onClose={() => setAdding(false)} onSubmit={a.add} />}
    </div>
  );
}
