'use client';

import { useDraggable } from '@dnd-kit/core';
import { cx } from '@/theme/tokens';
import { FIELD_TYPES, GROUPS } from '../../constants/dc.constants';
import type { FieldType } from '../../types/dc.types';

function Item({ type, label, Icon, onAdd }: { type: FieldType; label: string; Icon: React.ComponentType<{ className?: string }>; onAdd: (t: FieldType) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${type}` });
  return (
    <button ref={setNodeRef} type="button" {...attributes} {...listeners} onClick={() => onAdd(type)}
      className={cx('flex h-10 w-full touch-none items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-left text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle', isDragging && 'opacity-40')}>
      <Icon className="h-4 w-4 shrink-0 text-fg-muted" /><span className="truncate">{label}</span>
    </button>
  );
}

/** Field types. Drag one onto the canvas, or click it to add after the selected field. */
export function Palette({ onAdd }: { onAdd: (t: FieldType) => void }) {
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => (
        <div key={g}>
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{g}</h3>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {FIELD_TYPES.filter((t) => t.group === g).map((t) => <Item key={t.type} type={t.type} label={t.label} Icon={t.icon} onAdd={onAdd} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
