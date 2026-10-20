'use client';

import { useRouter } from 'next/navigation';
import { ClipboardCheck, ClipboardList } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { formatTime } from '@/lib/datetime';
import * as dc from '@/features/data-collection/api/dc.api';
import { RUN_LABEL } from '@/features/data-collection/constants/dc.constants';
import { Btn, Pill, statusTone } from '@/features/data-collection/components/shared/Ui';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import type { MyRun } from '@/features/data-collection/types/dc.types';
import { DashCard, EmptyLine, Stat } from './DashCard';

const BASE = '/employee/data-collection';
const SHOWN = 5;
const FILLABLE = new Set(['open', 'overdue', 'in_progress', 'returned']);

/** Overdue first, then today's; a run can be in both lists only across a refresh, so ids are kept once. */
function merge(overdue: MyRun[], today: MyRun[]) {
  const seen = new Set<number>();
  return [...overdue, ...today].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

export function FormsCard() {
  const router = useRouter();
  const summary = useAsync(() => dc.mySummary(), []);
  const runs = useAsync(async () => {
    const [overdue, today] = await Promise.all([dc.myRuns('overdue'), dc.myRuns('today')]);
    return merge(overdue.items, today.items);
  }, []);
  const s = summary.data;
  const items = runs.data || [];
  const retry = () => { void summary.refetch(); void runs.refetch(); };

  return (
    <DashCard
      title="My forms"
      subtitle={s ? `${s.today + s.overdue} to fill` : null}
      icon={ClipboardList}
      href={`${BASE}/my`}
      loading={summary.loading && !s}
      error={!s ? summary.error : ''}
      onRetry={retry}
    >
      {s && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Due today" value={s.today} href={`${BASE}/my`} />
            <Stat label="Overdue" value={s.overdue} tone={s.overdue > 0 ? 'bad' : undefined} href={`${BASE}/my`} />
            <Stat label="Sent back" value={s.returned} tone={s.returned > 0 ? 'bad' : undefined} href={`${BASE}/my`} />
            <Stat label="Always open" value={s.open_forms} sub="Fill any time" href={`${BASE}/my`} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">To fill now</p>
            {runs.error ? (
              <p className="text-sm text-[var(--tt-danger)]">{runs.error}</p>
            ) : runs.loading && !runs.data ? (
              <div className="h-24 animate-pulse rounded-xl bg-bg-subtle" aria-hidden />
            ) : items.length === 0 ? (
              <EmptyLine icon={ClipboardCheck} title="No forms due" hint={s.upcoming > 0 ? `${s.upcoming} coming up` : 'Nothing scheduled for you'} />
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {items.slice(0, SHOWN).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{r.title}</p>
                      <p className={cx('truncate text-xs', r.display === 'overdue' ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted')}>
                        {[`Due ${formatTime(r.due_at)}`, r.site_name, r.form_name !== r.title ? r.form_name : null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className="hidden sm:inline-flex"><Pill label={RUN_LABEL[r.display]} tone={statusTone(r.display)} /></span>
                    {FILLABLE.has(r.display) && (
                      <Btn variant="primary" onClick={() => router.push(`${BASE}/my/fill/${r.id}`)}>{r.display === 'returned' ? 'Fix' : 'Fill'}</Btn>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {items.length > SHOWN && <p className="mt-2 text-xs text-fg-muted">+ {items.length - SHOWN} more in My forms</p>}
          </div>
        </div>
      )}
    </DashCard>
  );
}
