'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, ListChecks } from 'lucide-react';
import * as tm from '@/features/task-management/api/tm.api';
import { TaskRowItem } from '@/features/task-management/components/TaskParts';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { DashCard, EmptyLine, Stat } from './DashCard';

const SHOWN = 5;

/** My open tasks at a glance and the ones due today (organization date). */
export function TasksCard({ today }: { today: string }) {
  const router = useRouter();
  const counts = useAsync(() => tm.counts('mine'), []);
  const due = useAsync(() => tm.listAll({ status: 'open' }, 1, 'due', 'mine', today), [today]);
  const c = counts.data;
  const items = due.data?.items || [];
  const retry = () => { void counts.refetch(); void due.refetch(); };

  return (
    <DashCard
      title="My tasks"
      subtitle={c ? `${c.todo + c.doing} open` : null}
      icon={ListChecks}
      href="/employee/tasks"
      loading={counts.loading && !c}
      error={!c ? counts.error : ''}
      onRetry={retry}
    >
      {c && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="To do" value={c.todo} href="/employee/tasks" />
            <Stat label="In progress" value={c.doing} href="/employee/tasks" />
            <Stat label="To review" value={c.review} href="/employee/tasks?scope=review" />
            <Stat label="Overdue" value={c.overdue} tone={c.overdue > 0 ? 'bad' : undefined} href="/employee/tasks" />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">
              Due today{due.data ? ` · ${due.data.total}` : ''}
            </p>
            {due.error ? (
              <p className="text-sm text-[var(--tt-danger)]">{due.error}</p>
            ) : due.loading && !due.data ? (
              <div className="h-24 animate-pulse rounded-xl bg-bg-subtle" aria-hidden />
            ) : items.length === 0 ? (
              <EmptyLine icon={CheckCircle2} title="Nothing due today" hint={c.overdue > 0 ? `${c.overdue} overdue still waiting` : 'You are all caught up'} />
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {items.slice(0, SHOWN).map((t) => (
                  <TaskRowItem key={t.id} task={t} showAssignee={false} onOpen={() => router.push(`/employee/tasks?task=${t.id}`)} />
                ))}
              </ul>
            )}
            {items.length > SHOWN && <p className="mt-2 text-xs text-fg-muted">+ {due.data!.total - SHOWN} more in My tasks</p>}
          </div>
        </div>
      )}
    </DashCard>
  );
}
