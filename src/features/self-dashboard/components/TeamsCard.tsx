'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UsersRound } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import * as teams from '@/features/teams/api/teams.api';
import { BUCKETS, CountsBar, Face, StatusTag } from '@/features/teams/components/parts';
import { DashCard, EmptyLine } from './DashCard';

const SHOWN_BUCKETS = BUCKETS.filter((b) => b.key !== 'off');

/** My team today: how many are in, and who is away first. One team at a time; chips switch when I am in several. */
export function TeamsCard() {
  const { data, loading, error, refetch } = useAsync(() => teams.mine(), []);
  const [picked, setPicked] = useState<string | null>(null);
  const items = data?.items || [];
  const team = items.find((t) => t.key === picked) || items[0];

  return (
    <DashCard
      title="My team"
      subtitle={team ? `${team.counts.present} of ${team.counts.total} in today` : null}
      icon={UsersRound}
      href={team ? `/employee/teams/${team.key}` : '/employee/teams'}
      hrefLabel={team ? 'Open team' : 'Teams'}
      loading={loading && !data}
      error={!data ? error : ''}
      onRetry={() => void refetch()}
      className="h-full"
    >
      {data && !team && <EmptyLine icon={UsersRound} title="You are not in a team yet" hint="Your manager or HR can add you to one." />}
      {team && (
        <div className="flex flex-col gap-4">
          {items.length > 1 && (
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Your teams">
              {items.map((t) => (
                <button key={t.key} type="button" role="tab" aria-selected={t.key === team.key} onClick={() => setPicked(t.key)}
                  className={cx('h-7 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors', t.key === team.key ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg hover:border-line-strong')}>
                  {t.name}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <CountsBar counts={team.counts} />
            <div className="grid grid-cols-4 gap-2">
              {SHOWN_BUCKETS.map((b) => (
                <div key={b.key} className="min-w-0 rounded-lg border border-line px-2 py-2 text-center">
                  <p className={cx('text-lg font-extrabold leading-none tabular-nums', b.key === 'absent' && team.counts.absent > 0 ? 'text-[var(--tt-danger)]' : 'text-fg')}>{team.counts[b.key]}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-fg-muted">{b.label}</p>
                </div>
              ))}
            </div>
          </div>
          {team.preview.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {team.preview.map((p) => (
                <li key={p.employee_id} className="flex items-center gap-2.5 px-3 py-2">
                  <Face name={p.name} photo={p.photo_url} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{p.name}</span>
                  <StatusTag status={p.status} />
                </li>
              ))}
            </ul>
          )}
          {team.counts.total > team.preview.length + 1 && (
            <Link href={`/employee/teams/${team.key}`} className="text-xs font-semibold text-fg-muted hover:text-fg">See all {team.counts.total} people</Link>
          )}
        </div>
      )}
    </DashCard>
  );
}
