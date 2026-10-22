'use client';

import { X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Card, Skeleton } from '@/features/attendance-dashboard/components/Card';
import { Field, Tag, td, th } from './parts';
import { durationText, shortDate } from '../utils/format';
import type { PendingItemDto, PendingNarrow, PendingPageDto } from '../types/audit.dto';

const waitingText = (r: PendingItemDto) => (r.waiting_on.length ? r.waiting_on.map((w) => w.name || '—').join(', ') : '—');
const stepText = (r: PendingItemDto) => (r.step_number ? `${r.step_number} of ${r.step_count}${r.step_name ? ` · ${r.step_name}` : ''}` : '—');
const whatText = (r: PendingItemDto) => {
  const s = r.summary;
  if (!s) return null;
  const dates = s.start ? (s.end && s.end !== s.start ? `${shortDate(s.start)} – ${shortDate(s.end)}` : shortDate(s.start)) : '';
  return [s.title && s.title !== r.type_label ? s.title : null, dates || null].filter(Boolean).join(' · ') || null;
};

/**
 * The requests behind the backlog, oldest first: what, who raised it, where, which step, who
 * it waits on and for how long. A row opens the request (for those who may see every request).
 */
export function PendingList({ data, loading, error, narrow, onClearNarrow, page, pageSize, onPage, onPageSize, onOpen }: {
  data: PendingPageDto | null;
  loading: boolean;
  error: string | null;
  narrow: PendingNarrow | null;
  onClearNarrow: () => void;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
  onOpen: (id: number) => void;
}) {
  const canOpen = !!data?.access.open_requests;
  const chip = narrow && (
    <button type="button" onClick={onClearNarrow} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[var(--tt-primary)] px-2 text-xs font-semibold text-fg hover:bg-bg-subtle">
      {narrow.label}<X aria-label="Show all pending" className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <Card title={`Pending requests${data ? ` · ${data.total}` : ''}`} subtitle="Oldest first · current step and who it waits on" action={chip || undefined}>
      {error && <p className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {loading && !data ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          illustration={{ src: '/vectors/approvals.svg', width: 200, height: 160, alt: '' }}
          title={narrow ? 'Nothing pending here' : 'No pending requests'}
          description={narrow ? 'No pending request matches this selection.' : 'Every request in this view has been decided.'}
          action={narrow ? { label: 'Show all pending', onClick: onClearNarrow, variant: 'link' } : undefined}
          compact={!!narrow}
        />
      ) : (
        <div className={cx('transition-opacity duration-200', loading ? 'opacity-60' : 'opacity-100')}>
          <div className="-mx-4 hidden overflow-x-auto sm:-mx-5 md:block">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="border-y border-line bg-bg-subtle">
                <tr>
                  <th className={cx(th, 'pl-5')}>Request</th>
                  <th className={th}>Requester</th>
                  <th className={th}>Site · Department</th>
                  <th className={th}>Step</th>
                  <th className={th}>Waiting on</th>
                  <th className={cx(th, 'pr-5 text-right')}>Waiting for</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} onClick={canOpen ? () => onOpen(r.id) : undefined} className={cx('border-b border-line last:border-b-0', canOpen && 'cursor-pointer hover:bg-bg-subtle')}>
                    <td className={cx(td, 'max-w-[240px] pl-5')}>
                      <div className="truncate font-semibold">{r.type_label}</div>
                      {whatText(r) && <div className="truncate text-xs text-fg-muted">{whatText(r)}</div>}
                    </td>
                    <td className={cx(td, 'max-w-[200px]')}>
                      <div className="truncate font-semibold">{r.requester?.name || '—'}</div>
                      {r.requester?.code && <div className="text-xs text-fg-muted">{r.requester.code}</div>}
                    </td>
                    <td className={cx(td, 'max-w-[200px]')}>
                      <div className="truncate">{r.site?.name || 'No site'}</div>
                      <div className="truncate text-xs text-fg-muted">{r.department?.name || 'No department'}</div>
                    </td>
                    <td className={cx(td, 'max-w-[180px] truncate text-fg-muted')}>{stepText(r)}</td>
                    <td className={cx(td, 'max-w-[220px] truncate')}>{waitingText(r)}</td>
                    <td className={cx(td, 'pr-5 text-right')}>
                      <span className="inline-flex items-center gap-1.5">{r.overdue && <Tag solid>Past due</Tag>}<span className="font-bold">{durationText(r.age_minutes)}</span></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {data.items.map((r) => (
              <li key={r.id}>
                <button type="button" disabled={!canOpen} onClick={() => onOpen(r.id)} className="w-full rounded-lg border border-line p-3 text-left transition-colors hover:border-line-strong disabled:cursor-default">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-fg">{r.type_label}</div>
                      <div className="truncate text-xs text-fg-muted">{r.requester?.name || '—'}{whatText(r) ? ` · ${whatText(r)}` : ''}</div>
                    </div>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-extrabold tabular-nums text-fg">{durationText(r.age_minutes)}</span>
                      {r.overdue && <Tag solid>Past due</Tag>}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Field label="Step">{stepText(r)}</Field>
                    <Field label="Waiting on">{waitingText(r)}</Field>
                    <Field label="Site">{r.site?.name || 'No site'}</Field>
                    <Field label="Department">{r.department?.name || 'No department'}</Field>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-line pt-3">
            <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(data.total / pageSize))} totalItems={data.total} pageSize={pageSize} onPageChange={onPage} onPageSizeChange={onPageSize} pageSizeOptions={[10, 25, 50, 100]} />
          </div>
        </div>
      )}
    </Card>
  );
}
