'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Pagination } from '@/components/ui/Pagination';
import { Card, Skeleton } from '@/features/data-collection/components/shared/Ui';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import * as api from '../../api/tm.api';
import { dueText } from '../../constants/tm.constants';
import type { Filters, Scope } from '../../types/tm.types';
import { PriorityMark, StatusPill, TaskRowItem } from '../TaskParts';

/** Paged table (rows on phones) for one scope. `status` may be a group (todo/doing/review/done) or a single status. */
export function ListView({ scope, filters, status, dueOn, onOpen, version }: { scope: Scope; filters: Filters; status?: string; dueOn?: string; onOpen: (id: number) => void; version: number }) {
  const [page, setPage] = useState(1);
  const key = JSON.stringify({ scope, filters, status, dueOn });
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) { setLastKey(key); setPage(1); }
  const { data, loading, error } = useAsync(() => api.listAll({ ...filters, status: status || filters.status }, page, scope === 'mine' ? 'priority' : 'due', scope, dueOn), [key, page, version]);
  const items = data?.items || [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const showAssignee = scope !== 'mine';
  return (
    <>
      {error && <p className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      <Card className="!p-0 overflow-hidden">
        {loading && !data ? (
          <div className="divide-y divide-line" aria-busy="true">{Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3"><Skeleton className="h-2 w-2 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div><Skeleton className="h-5 w-16" /></div>
          ))}</div>
        )
          : items.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <Image src="/vectors/review.svg" alt="" width={160} height={110} className="mb-3 h-auto max-h-28 w-auto opacity-80" />
              <p className="text-sm font-semibold text-fg">{dueOn ? 'Nothing due this day' : scope === 'review' ? 'Nothing to review' : scope === 'mine' ? 'You are all caught up' : 'No tasks match'}</p>
              <p className="mt-1 text-xs text-fg-muted">New tasks show up here as soon as they are assigned.</p>
            </div>
          ) : (
            <>
              <table className="hidden w-full text-left text-sm md:table">
                <thead className="border-b border-line bg-bg-subtle text-xs text-fg-muted">
                  <tr><th className="px-4 py-2.5 font-semibold">Task</th>{showAssignee && <th className="px-3 py-2.5 font-semibold">Assignee</th>}<th className="px-3 py-2.5 font-semibold">Site</th><th className="px-3 py-2.5 font-semibold">Due</th><th className="px-3 py-2.5 font-semibold">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((t) => (
                    <tr key={t.id} tabIndex={0} onClick={() => onOpen(t.id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(t.id); }} className="cursor-pointer hover:bg-bg-subtle">
                      <td className="max-w-sm px-4 py-3"><div className="flex items-center gap-2"><PriorityMark priority={t.priority} /><span className="truncate font-semibold text-fg">{t.title}</span></div></td>
                      {showAssignee && <td className="px-3 py-3 text-fg-muted">{t.assignee_name || '—'}</td>}
                      <td className="px-3 py-3 text-fg-muted">{t.site_name || '—'}</td>
                      <td className={t.overdue ? 'px-3 py-3 font-semibold text-[var(--tt-danger)]' : 'px-3 py-3 text-fg-muted'}>{t.overdue ? 'Overdue · ' : ''}{dueText(t.due_at)}</td>
                      <td className="px-3 py-3"><StatusPill status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-y divide-line md:hidden">{items.map((t) => <TaskRowItem key={t.id} task={t} showAssignee={showAssignee} onOpen={() => onOpen(t.id)} />)}</ul>
            </>
          )}
      </Card>
      {data && pages > 1 && <div className="mt-3"><Pagination currentPage={page} totalPages={pages} totalItems={data.total} pageSize={data.page_size} onPageChange={setPage} /></div>}
    </>
  );
}
