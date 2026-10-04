'use client';

import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Lock } from 'lucide-react';
import { cx } from '@/theme/tokens';

export const DND_CELL = 'roster-cell';

export interface GridCellProps {
  cellId: string;
  employeeId: number;
  date: string;
  kind: string;
  code: string;
  tone: string;
  second: string;
  locked: boolean;
  ot: boolean;
  comp: boolean;
  errored: boolean;
  selected: boolean;
  pulse: boolean;
  weekend: boolean;
  title: string;
  canEdit: boolean;
  onMove: (fromKey: string, toKey: string) => void;
}

const KIND_STYLE: Record<string, string> = {
  off: 'border border-dashed border-line text-fg-subtle',
  leave: 'border border-line-strong text-fg-muted tt-hatch',
  holiday: 'border border-dotted border-fg-muted text-fg-muted',
  comp_off: 'border border-dashed border-line-strong text-fg-muted',
  unavailable: 'border border-line text-fg-subtle tt-strike',
};

const KIND_TEXT: Record<string, string> = { off: 'OFF', leave: 'L', holiday: 'H', comp_off: 'CO', unavailable: 'N/A' };

function GridCellImpl(p: GridCellProps) {
  const draggable = p.canEdit && p.kind === 'shift';
  const [{ dragging }, dragRef] = useDrag(
    () => ({
      type: DND_CELL,
      item: { id: p.cellId },
      canDrag: draggable,
      collect: (m) => ({ dragging: m.isDragging() }),
    }),
    [p.cellId, draggable]
  );
  const [{ over }, dropRef] = useDrop(
    () => ({
      accept: DND_CELL,
      canDrop: () => p.canEdit,
      drop: (item: { id: string }) => p.onMove(item.id, p.cellId),
      collect: (m) => ({ over: m.isOver() && m.canDrop() }),
    }),
    [p.cellId, p.canEdit, p.onMove]
  );

  const setRef = (el: HTMLDivElement | null) => {
    dropRef(el);
    dragRef(el);
  };

  const chipClass = p.kind === 'shift' ? p.tone : KIND_STYLE[p.kind] || '';
  const text = p.kind === 'shift' ? p.code : KIND_TEXT[p.kind] || '';

  return (
    <div
      ref={setRef}
      data-cell=""
      data-id={p.cellId}
      title={p.title}
      className={cx('relative flex shrink-0 items-center justify-center p-[3px]', p.weekend && 'bg-bg-subtle', over && 'bg-fg/15', dragging && 'opacity-40')}
      style={{ width: 46, height: 36 }}
    >
      {p.kind ? (
        <div
          className={cx(
            'relative flex h-full w-full select-none items-center justify-center rounded-md text-[11px] font-bold leading-none',
            chipClass,
            p.selected && 'ring-2 ring-fg ring-offset-1 ring-offset-surface',
            p.pulse && 'animate-pulse'
          )}
          style={p.errored ? { outline: '2px solid var(--tt-danger)', outlineOffset: '-1px' } : undefined}
        >
          <span className="truncate px-0.5">{text}</span>
          {p.second && <span className="absolute bottom-0 right-0.5 text-[8px] font-bold opacity-80">+{p.second}</span>}
          {p.locked && <Lock className="absolute left-0.5 top-0.5 h-2 w-2 opacity-70" strokeWidth={3} />}
          {p.ot && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-current opacity-80 ring-1 ring-surface" />}
          {p.comp && <span className="absolute bottom-0.5 left-0.5 h-1.5 w-1.5 rounded-full border border-current" />}
        </div>
      ) : (
        <div
          className={cx('h-full w-full rounded-md', p.selected && 'ring-2 ring-fg ring-offset-1 ring-offset-surface', p.pulse && 'animate-pulse')}
          style={p.errored ? { outline: '2px solid var(--tt-danger)', outlineOffset: '-1px' } : undefined}
        />
      )}
    </div>
  );
}

export const GridCell = React.memo(GridCellImpl);
