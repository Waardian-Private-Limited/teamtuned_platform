'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { messageOf } from '@/lib/api/errors';
import { usePermission } from '@/lib/hooks/usePermission';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as compApi from '@/features/compensation/api/compensation.api';
import { CycleDialog } from '@/features/compensation/components/cycles/CycleDialog';
import { COMP_PERMISSIONS } from '@/features/compensation/constants/compensation.constants';
import { useCompensationSettings } from '@/features/compensation/hooks/useCompensationSettings';
import type { CycleDto } from '@/features/compensation/types/compensation.dto';
import type { PerformanceDashboard } from '../../types/perf.types';
import { Btn } from '../ui';

type PerfCycle = NonNullable<PerformanceDashboard['cycle']>;

/** Mounted only for people who may create appraisal cycles: it reads the compensation guide for the dialog's defaults. */
function CreateAppraisal({ open, cycle, area, onClose }: { open: boolean; cycle: PerfCycle; area: string; onClose: () => void }) {
  const router = useRouter();
  const settings = useCompensationSettings(null);
  const prefill = React.useMemo(() => ({
    name: `${cycle.name} appraisal`,
    periodStart: cycle.period_start,
    periodEnd: cycle.period_end,
    performanceCycles: [{ id: cycle.id, name: cycle.name, status: cycle.status, period_start: cycle.period_start, period_end: cycle.period_end }],
  }), [cycle]);
  return (
    <CycleDialog
      open={open}
      defaults={settings.data?.settings.ratingScale || []}
      prefill={prefill}
      onClose={onClose}
      onSaved={(c: CycleDto) => router.push(`${area}/compensation/cycles/${c.id}`)}
    />
  );
}

/** Pick an open appraisal cycle and add this performance cycle to the ones it takes ratings from (it is then rated from Performance). */
function LinkExisting({ open, cycle, onClose, onLinked }: { open: boolean; cycle: PerfCycle; onClose: () => void; onLinked: () => void }) {
  const [list, setList] = React.useState<CycleDto[] | null>(null);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setPicked(null);
    setError('');
    setList(null);
    compApi.listCycles()
      // Cycles already rated from Performance, and drafts managers have not been asked to rate (linking switches them to Performance).
      .then((r) => setList(r.cycles.filter((c) => ['draft', 'in_review'].includes(c.status) && !c.performance_cycle_ids.includes(cycle.id)
        && (c.rating_source === 'performance' || (c.status === 'draft' && c.review.status === 'not_started')))))
      .catch((e) => { setList([]); showError(messageOf(e)); });
  }, [open, cycle.id]);

  const link = async () => {
    const target = list?.find((c) => c.id === picked);
    if (!target) { setError('Pick an appraisal cycle'); return; }
    setBusy(true);
    try {
      const res = await compApi.linkPerformanceCycles(target.id, [...target.performance_cycle_ids, cycle.id]);
      showSuccess(res.rating_sync?.changed ? `Linked. “${target.name}” now uses Performance’s ratings: set the increment % for each.` : `Linked to “${target.name}”`);
      onLinked();
      onClose();
    } catch (e) {
      showError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={<h2 className="text-sm font-bold text-fg sm:text-base">Link an appraisal cycle</h2>}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={link}>Link</Btn></>}
    >
      <div className="space-y-2 text-xs sm:text-sm">
        <p className="text-fg-muted">Ratings released in “{cycle.name}” will set increments in the cycle you pick. Cycles it already uses stay linked; several are averaged.</p>
        {list === null ? (
          <div className="h-24 animate-pulse rounded-lg bg-bg-subtle" />
        ) : list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-3 text-fg-muted">No draft or in-review appraisal cycle to link. Create one instead.</p>
        ) : (
          <div className={cx('space-y-1.5', error && 'rounded-lg border border-[var(--tt-danger)] p-1.5')}>
            {list.map((c) => (
              <label key={c.id} className={cx('flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2', picked === c.id ? 'border-fg bg-bg-subtle' : 'border-line hover:bg-bg-subtle/50')}>
                <input type="radio" name="appraisal-cycle" checked={picked === c.id} onChange={() => { setPicked(c.id); setError(''); }} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-fg">{c.name}</span>
                  <span className="block text-[11px] capitalize text-fg-muted">{c.status.replace('_', ' ')} · effective {c.effective_from}{c.performance_cycle_ids.length ? ` · uses ${c.performance_cycle_ids.length} other cycle${c.performance_cycle_ids.length === 1 ? '' : 's'}` : ''}{c.rating_source !== 'performance' ? ` · now rated by ${c.rating_source === 'manager' ? 'managers' : 'HR'}, switches to Performance` : ''}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        {error && <p className="text-[11px] text-[var(--tt-danger)]">{error}</p>}
      </div>
    </Dialog>
  );
}

/**
 * Starting the pay step from Performance: create an appraisal cycle already linked to this cycle, or add this cycle to an open
 * one. Shown only to people with compensation create / edit rights.
 */
export function AppraisalLinkActions({ cycle, area, onLinked }: { cycle: PerfCycle; area: string; onLinked: () => void }) {
  const { can } = usePermission();
  const canCreate = can(COMP_PERMISSIONS.ADD);
  const canLink = can(COMP_PERMISSIONS.EDIT);
  const [open, setOpen] = React.useState<'create' | 'link' | null>(null);
  if (!canCreate && !canLink) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {canCreate && <Btn size="sm" icon={Plus} onClick={() => setOpen('create')}>Create appraisal cycle</Btn>}
      {canLink && <Btn size="sm" variant="secondary" icon={Link2} onClick={() => setOpen('link')}>Link existing appraisal cycle</Btn>}
      {canCreate && open === 'create' && <CreateAppraisal open cycle={cycle} area={area} onClose={() => setOpen(null)} />}
      {canLink && <LinkExisting open={open === 'link'} cycle={cycle} onClose={() => setOpen(null)} onLinked={onLinked} />}
    </div>
  );
}
