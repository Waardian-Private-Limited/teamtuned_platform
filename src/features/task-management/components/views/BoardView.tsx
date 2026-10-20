'use client';

import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { Skeleton } from '@/features/data-collection/components/shared/Ui';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import * as api from '../../api/tm.api';
import { COLUMNS, actionToColumn } from '../../constants/tm.constants';
import type { ColumnKey, Filters, Scope, TaskRow } from '../../types/tm.types';
import { ApproveDialog, ReturnDialog } from '../TaskDialogs';
import { TaskCard } from '../TaskParts';

/** The move a card may make to a column: it must be a real transition AND one this person is allowed to do. */
const moveFor = (t: TaskRow, to: ColumnKey) => {
  const a = actionToColumn(t.status, to, t.requires_review);
  return a && t.allowed_actions.includes(a) ? a : null;
};

function Card({ task, onOpen }: { task: TaskRow; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: String(task.id), data: { task } });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cx('touch-none', isDragging && 'opacity-40')}>
      <TaskCard task={task} onOpen={onOpen} />
    </div>
  );
}

function Column({ col, total, items, active, onOpen }: { col: (typeof COLUMNS)[number]; total: number; items: TaskRow[]; active: TaskRow | null; onOpen: (id: number) => void }) {
  const allowed = active ? moveFor(active, col.key) !== null : false;
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <section ref={setNodeRef} aria-label={col.label} className={cx('flex min-h-[18rem] min-w-[16rem] flex-1 flex-col rounded-xl border bg-bg-subtle p-2.5 transition-colors', active ? (allowed ? (isOver ? 'border-fg bg-surface' : 'border-dashed border-fg') : 'opacity-50 border-line') : 'border-line')}>
      <header className="mb-2.5 flex items-baseline justify-between px-1">
        <h2 className="text-sm font-bold text-fg">{col.label}</h2>
        <span className="text-xs font-semibold tabular-nums text-fg-muted">{total}</span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {items.map((t) => <Card key={t.id} task={t} onOpen={() => onOpen(t.id)} />)}
        {items.length === 0 && <p className="px-1 py-6 text-center text-xs text-fg-muted">{col.hint}</p>}
        {total > items.length && <p className="px-1 text-center text-xs text-fg-muted">+{total - items.length} more in the list view.</p>}
      </div>
    </section>
  );
}

/** Kanban for one scope. A card can only be dropped where the state machine and the person's role allow. */
export function BoardView({ scope, filters, onOpen, version, onChanged }: { scope: Scope; filters: Filters; onOpen: (id: number) => void; version: number; onChanged: () => void }) {
  const [active, setActive] = useState<TaskRow | null>(null);
  const [returning, setReturning] = useState<TaskRow | null>(null);
  const [approving, setApproving] = useState<TaskRow | null>(null);
  const { data, loading, error, refetch } = useAsync(() => api.board(filters, scope), [scope, JSON.stringify(filters), version]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const cols = useMemo(() => new Map((data?.columns || []).map((c) => [c.key, c])), [data]);
  const done = () => { void refetch(); onChanged(); };

  const start = (e: DragStartEvent) => setActive((e.active.data.current?.task as TaskRow) || null);
  const end = async (e: DragEndEvent) => {
    const task = e.active.data.current?.task as TaskRow | undefined;
    setActive(null);
    const to = e.over?.id as ColumnKey | undefined;
    if (!task || !to) return;
    const action = moveFor(task, to);
    if (!action) return;
    if (action === 'return') { setReturning(task); return; }
    if (action === 'approve') { setApproving(task); return; }
    if (action === 'submit' && task.form_id) { showError('Open the task to fill the required data first'); onOpen(task.id); return; }
    try { await api.act(task.id, action); showSuccess('Moved'); done(); } catch (err) { showError(messageOf(err)); }
  };

  return (
    <>
      {error && <p className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {loading && !data ? <div className="grid gap-3 md:grid-cols-4"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /></div> : (
        <DndContext sensors={sensors} onDragStart={start} onDragEnd={(e) => void end(e)} onDragCancel={() => setActive(null)}>
          <div className="flex gap-3 overflow-x-auto pb-3">
            {COLUMNS.map((c) => <Column key={c.key} col={c} total={cols.get(c.key)?.total ?? 0} items={cols.get(c.key)?.items ?? []} active={active} onOpen={onOpen} />)}
          </div>
          <DragOverlay>{active ? <div className="w-64"><TaskCard task={active} onOpen={() => undefined} dragging /></div> : null}</DragOverlay>
        </DndContext>
      )}
      <ReturnDialog open={Boolean(returning)} onClose={() => setReturning(null)} onSend={async (note) => { if (!returning) return; try { await api.act(returning.id, 'return', { note }); showSuccess('Sent back'); done(); } catch (err) { showError(messageOf(err)); throw err; } }} />
      <ApproveDialog open={Boolean(approving)} onClose={() => setApproving(null)} onApprove={async (rating) => { if (!approving) return; try { await api.act(approving.id, 'approve', rating ? { rating } : {}); showSuccess('Approved'); done(); } catch (err) { showError(messageOf(err)); throw err; } }} />
    </>
  );
}
