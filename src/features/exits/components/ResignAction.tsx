'use client';

import React from 'react';
import Link from 'next/link';
import { DoorOpen } from 'lucide-react';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { isOpen } from '../constants/exits.constants';
import * as api from '../api/exits.api';
import type { MyExit } from '../types/exits';
import { Card } from './parts';
import { ResignDialog } from './ResignDialog';

/**
 * "Resign" on My profile. Hidden while we do not know (or the organization has not switched exits on: the server
 * refuses); with an exit in progress it points at My exit instead. The server decides who may resign.
 */
export function ResignAction() {
  const [mine, setMine] = React.useState<MyExit | null>(null);
  const [open, setOpen] = React.useState(false);
  const load = React.useCallback(() => { api.getMine().then(setMine).catch(() => setMine(null)); }, []);
  React.useEffect(load, [load]);

  if (!mine) return null;
  const openCase = mine.case && isOpen(mine.case.status) ? mine.case : null;
  if (!openCase && !mine.eligible && !mine.blocked_reason) return null;

  return (
    <>
      <Card title="Leaving the company">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-fg-muted">
            {openCase ? 'You have an exit in progress.' : mine.eligible ? `Your notice period is ${mine.notice_days} days.` : mine.blocked_reason}
          </p>
          {openCase ? (
            <Link href="/employee/my-exit" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm">View my exit</Link>
          ) : mine.eligible ? (
            <Btn variant="danger" icon={<DoorOpen className="h-4 w-4" />} onClick={() => setOpen(true)}>Resign</Btn>
          ) : null}
        </div>
      </Card>
      <ResignDialog open={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />
    </>
  );
}
