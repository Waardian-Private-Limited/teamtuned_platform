'use client';

import Link from 'next/link';
import { formatDate, orgToday } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { PositionStatusPill, PublishedBadge } from '../../shared/components/PositionStatusPill';
import type { Position } from '../../shared/types/recruitment.model';
import { openingsText, positionLocation } from '../../shared/utils/format';
import type { PositionStatusAction } from '../hooks/usePositionStatusActions';
import { MiniPipeline, MiniPipelineLegend } from './MiniPipeline';
import { PositionRowActions } from './PositionRowActions';

const th = 'px-3.5 py-2.5 sm:px-4 lg:px-5 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle whitespace-nowrap';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 lg:px-5 lg:py-3 align-middle';

interface Props {
  positions: Position[];
  base: string;
  canManage: boolean;
  busyId: number | null;
  onStatus: (p: Position, a: PositionStatusAction) => void;
}

export function PositionTable({ positions, base, canManage, busyId, onStatus }: Props) {
  const today = orgToday();
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[960px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={th}>Position</th>
            <th className={th}>Status</th>
            <th className={th}>Filled</th>
            <th className={th}><span className="sr-only">Pipeline: </span><MiniPipelineLegend /></th>
            <th className={th}>Hiring manager</th>
            <th className={th}>Closes</th>
            <th className={cx(th, 'text-right')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const overdue = Boolean(p.closesOn && p.closesOn < today && (p.status === 'open' || p.status === 'paused'));
            return (
              <tr key={p.id} className="transition-colors hover:bg-bg-subtle/50">
                <td className={td}>
                  <Link href={`${base}/positions/${p.id}`} className="text-sm font-semibold text-fg hover:underline">{p.title}</Link>
                  <div className="mt-0.5 max-w-sm truncate text-xs text-fg-muted">
                    {[p.department?.name, positionLocation(p)].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td className={td}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PositionStatusPill status={p.status} />
                    <PublishedBadge published={p.published} />
                  </div>
                </td>
                <td className={cx(td, 'text-sm font-semibold tabular-nums text-fg')}>{p.openings > 0 ? `${p.hiredCount}/${p.openings}` : `${p.hiredCount} · no limit`}</td>
                <td className={td}><MiniPipeline counts={p.counts} /></td>
                <td className={cx(td, 'text-sm text-fg-muted')}>{p.hiringManager?.name || '—'}</td>
                <td className={cx(td, 'whitespace-nowrap text-sm', overdue ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted')}>
                  {p.closesOn ? formatDate(p.closesOn) : '—'}
                </td>
                <td className={td}>
                  <PositionRowActions position={p} base={base} canManage={canManage} busy={busyId === p.id} onStatus={onStatus} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PositionCardList({ positions, base, canManage, busyId, onStatus }: Props) {
  return (
    <>
      {positions.map((p) => (
        <div key={p.id} className="space-y-2.5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`${base}/positions/${p.id}`} className="block truncate text-sm font-semibold text-fg">{p.title}</Link>
              <p className="mt-0.5 truncate text-xs text-fg-muted">{[p.department?.name, positionLocation(p)].filter(Boolean).join(' · ')}</p>
            </div>
            <PositionStatusPill status={p.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            <span className="font-semibold tabular-nums text-fg">{openingsText(p.hiredCount, p.openings)}</span>
            {p.hiringManager && <span>HM {p.hiringManager.name}</span>}
            {p.closesOn && <span>Closes {formatDate(p.closesOn, 'short')}</span>}
            <PublishedBadge published={p.published} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <MiniPipeline counts={p.counts} />
            <PositionRowActions position={p} base={base} canManage={canManage} busy={busyId === p.id} onStatus={onStatus} />
          </div>
        </div>
      ))}
    </>
  );
}

export function PositionTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="h-full animate-pulse overflow-hidden">
      <div className="divide-y divide-line/60 md:hidden">
        {Array.from({ length: 4 }).map((_, r) => (
          <div key={r} className="space-y-3 p-4">
            <div className="h-4 w-40 rounded bg-bg-subtle" />
            <div className="h-3 w-56 rounded bg-bg-subtle/70" />
            <div className="h-6 w-36 rounded bg-bg-subtle/60" />
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <div className="h-10 border-b border-line bg-bg-subtle/95" />
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex h-16 items-center gap-6 border-b border-line/60 px-5">
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 rounded bg-bg-subtle" style={{ width: `${140 + (r % 3) * 40}px` }} />
              <div className="h-2.5 w-48 rounded bg-bg-subtle/70" />
            </div>
            <div className="h-6 w-16 rounded bg-bg-subtle" />
            <div className="h-4 w-8 rounded bg-bg-subtle" />
            <div className="h-6 w-36 rounded bg-bg-subtle/70" />
            <div className="h-3 w-24 rounded bg-bg-subtle" />
            <div className="h-3 w-20 rounded bg-bg-subtle" />
            <div className="h-7 w-20 rounded bg-bg-subtle" />
          </div>
        ))}
      </div>
    </div>
  );
}
