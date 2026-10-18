'use client';

import { ArrowUpRight, MoreHorizontal, SquarePen } from 'lucide-react';
import Link from 'next/link';
import { Tooltip } from '@/components/ui/Tooltip';
import { ActionMenu, type ActionMenuEntry } from '../../shared/components/ActionMenu';
import type { Position } from '../../shared/types/recruitment.model';
import { availableStatusActions, STATUS_ACTION_LABELS, type PositionStatusAction } from '../hooks/usePositionStatusActions';

const iconBtn = 'inline-flex rounded-[var(--tt-radius-sm)] p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:opacity-40';

export function PositionRowActions({ position, base, canManage, busy, onStatus }: {
  position: Position;
  base: string;
  canManage: boolean;
  busy: boolean;
  onStatus: (p: Position, action: PositionStatusAction) => void;
}) {
  const items: ActionMenuEntry[] = availableStatusActions(position).map((a) => ({
    key: a,
    label: STATUS_ACTION_LABELS[a],
    danger: a === 'close',
    onSelect: () => onStatus(position, a),
  }));
  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip content="Open pipeline">
        <Link href={`${base}/positions/${position.id}`} aria-label={`Open ${position.title}`} className={iconBtn}>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Tooltip>
      {canManage && (
        <>
          <Tooltip content="Edit">
            <Link href={`${base}/positions/${position.id}?tab=details&edit=1`} aria-label={`Edit ${position.title}`} className={iconBtn}>
              <SquarePen className="h-4 w-4" />
            </Link>
          </Tooltip>
          <ActionMenu label={`More actions for ${position.title}`} items={items} triggerClassName={iconBtn} disabled={busy}>
            {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <MoreHorizontal className="h-4 w-4" />}
          </ActionMenu>
        </>
      )}
    </div>
  );
}
