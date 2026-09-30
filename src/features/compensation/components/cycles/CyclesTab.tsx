'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarRange, Plus, Users } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/compensation.api';
import type { CycleDto, RatingLevel } from '../../types/compensation.dto';
import { date } from '../../utils/format';
import { Btn } from '../shared/Buttons';
import { Empty, Panel, Toolbar } from '../shared/Panel';
import { StatusBadge } from '../shared/StatusBadge';
import { CycleDialog } from './CycleDialog';

export function CyclesTab({ canAdd, basePath, ratingScale }: { canAdd: boolean; basePath: string; ratingScale: RatingLevel[] }) {
  const [cycles, setCycles] = React.useState<CycleDto[] | null>(null);
  const [error, setError] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(() => {
    api.listCycles().then((d) => setCycles(d.cycles)).catch((e) => setError(messageOf(e)));
  }, []);
  React.useEffect(load, [load]);

  return (
    <Panel>
      <Toolbar>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-fg-muted sm:text-sm">Run annual or mid-year reviews: pick eligible people, rate them, check the budget, approve, and increments apply on the effective date.</p>
          {canAdd && <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>New cycle</Btn>}
        </div>
      </Toolbar>
      {error && <div className="p-3"><Alert message={error} tone="error" /></div>}
      {cycles === null ? (
        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-bg-subtle" />)}</div>
      ) : cycles.length === 0 ? (
        <Empty title="No appraisal cycles yet" text="Create a cycle to propose increments and promotions for many employees at once, with a merit budget." action={canAdd ? <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>New cycle</Btn> : undefined} />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto p-3 tt-scroll-hidden sm:grid-cols-2 xl:grid-cols-3">
          {cycles.map((c) => (
            <Link key={c.id} href={`${basePath}/cycles/${c.id}`} className="rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-bg-subtle/40">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-fg">{c.name}</h3>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-muted"><CalendarRange className="h-3.5 w-3.5" />{date(c.period_start)} – {date(c.period_end)}</p>
              <p className="mt-1 text-xs text-fg-muted">Effective {date(c.effective_from)}{c.budget_percent !== null ? ` · Budget ${c.budget_percent}%` : ''}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-fg"><Users className="h-3.5 w-3.5" />{c.proposals ?? 0} proposals</p>
            </Link>
          ))}
        </div>
      )}
      <CycleDialog open={open} defaults={ratingScale} onClose={() => setOpen(false)} onSaved={load} />
    </Panel>
  );
}
