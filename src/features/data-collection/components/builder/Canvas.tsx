'use client';

import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Copy, GripVertical, Lock, Trash2 } from 'lucide-react';
import { SYSTEM_FIELDS } from '../renderer/SystemFields';
import { cx } from '@/theme/tokens';
import { TYPE_INFO } from '../../constants/dc.constants';
import type { FieldDef } from '../../types/dc.types';

interface Handlers { selected: string | null; bad: Set<string>; onSelect: (id: string) => void; onMove: (id: string, d: -1 | 1) => void; onRemove: (id: string) => void; onCopy: (id: string) => void }

function Card({ field, h, children }: { field: FieldDef; h: Handlers; children?: React.ReactNode }) {
  const id = field.uid as string;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const info = TYPE_INFO[field.type];
  const Icon = info.icon;
  const on = h.selected === id;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx(isDragging && 'opacity-40')}>
      <div role="button" tabIndex={0} onClick={() => h.onSelect(id)} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) h.onSelect(id); }}
        className={cx('group flex items-start gap-2 rounded-lg border bg-surface p-2.5 transition-colors', on ? 'border-fg ring-1 ring-fg' : h.bad.has(id) ? 'border-[var(--tt-danger)]' : 'border-line hover:border-line-strong')}>
        <button type="button" aria-label={`Drag ${field.label}`} {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-1 text-fg-subtle hover:bg-bg-subtle active:cursor-grabbing"><GripVertical className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5"><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-muted" /><span className="min-w-0 whitespace-pre-wrap break-words text-sm font-semibold text-fg">{field.label || 'Untitled'}</span>{field.required && <span className="text-[var(--tt-danger)]">*</span>}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-fg-muted"><span>{info.label}</span>{field.metric && <span className="font-semibold text-fg">Tracked: {field.metric.agg}</span>}{field.showWhen && <span>Conditional</span>}{h.bad.has(id) && <span className="font-semibold text-[var(--tt-danger)]">Needs attention</span>}</div>
        </div>
        <div className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {[
            { l: 'Move up', i: ArrowUp, f: () => h.onMove(id, -1) }, { l: 'Move down', i: ArrowDown, f: () => h.onMove(id, 1) },
            { l: 'Duplicate', i: Copy, f: () => h.onCopy(id) }, { l: 'Delete', i: Trash2, f: () => h.onRemove(id) },
          ].map(({ l, i: I, f }) => (
            <button key={l} type="button" aria-label={l} title={l} onClick={(e) => { e.stopPropagation(); f(); }} className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"><I className="h-3.5 w-3.5" /></button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

/** The whole inside of a subform is one drop target: drop anywhere in it (not only on a strip) to add the field to it. */
function GroupBody({ field, h }: { field: FieldDef; h: Handlers }) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${field.uid}` });
  const kids = field.fields || [];
  return (
    <div ref={setNodeRef} className={cx('ml-6 mt-2 min-h-[5.5rem] space-y-2 rounded-lg border-2 border-dashed p-2.5 transition-colors', isOver ? 'border-fg bg-bg-subtle' : 'border-line')}>
      <p className="text-[11px] font-semibold text-fg-muted">Fields in each entry</p>
      <SortableContext items={kids.map((k) => k.uid as string)} strategy={verticalListSortingStrategy}>
        {kids.map((k) => <Card key={k.uid} field={k} h={h} />)}
      </SortableContext>
      <p className={cx('rounded-md py-3 text-center text-xs', isOver ? 'text-fg' : 'text-fg-muted')}>
        {kids.length ? 'Drop here to add another field' : 'Drag fields here, or select the subform and click a field on the left'}
      </p>
    </div>
  );
}

function Zone({ id, label }: { id: string; label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={cx('rounded-lg border border-dashed p-3 text-center text-xs transition-colors', isOver ? 'border-fg bg-bg-subtle text-fg' : 'border-line text-fg-muted')}>{label}</div>;
}

export function Canvas({ fields, ...h }: { fields: FieldDef[] } & Handlers) {
  return (
    <SortableContext items={fields.map((f) => f.uid as string)} strategy={verticalListSortingStrategy}>
      <div className="space-y-2">
        <div className="rounded-lg border border-dashed border-line bg-bg-subtle p-2.5" title="Every form has these. They are filled in automatically and cannot be removed.">
          <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted"><Lock className="h-3 w-3" />System fields · on every form, filled automatically</p>
          <div className="flex flex-wrap gap-1.5">{SYSTEM_FIELDS.map(({ key, label, icon: I }) => <span key={key} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs font-semibold text-fg"><I className="h-3 w-3 text-fg-muted" />{label}</span>)}</div>
        </div>
        {fields.map((f) => (
          <Card key={f.uid} field={f} h={h}>
            {f.type === 'group' && <GroupBody field={f} h={h} />}
          </Card>
        ))}
        <Zone id="canvas-end" label={fields.length ? 'Drop here to add at the end' : 'Drag a field here, or click one on the left'} />
      </div>
    </SortableContext>
  );
}
