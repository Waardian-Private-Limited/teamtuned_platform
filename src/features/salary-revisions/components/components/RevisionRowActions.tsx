'use client';

import { Check, FileText, History, Send, SquarePen, X, Ban } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Tooltip } from '@/components/ui/Tooltip';
import type { RevisionDto } from '@/features/compensation/types/compensation.dto';

export interface RevisionPerms {
  add: boolean;
  edit: boolean;
  approve: boolean;
  remove: boolean;
}

export interface RevisionActionHandlers {
  onHistory: (r: RevisionDto) => void;
  onLetter: (r: RevisionDto) => void;
  onEdit: (r: RevisionDto) => void;
  onSubmit: (r: RevisionDto) => void;
  onDecide: (r: RevisionDto, decision: 'approve' | 'reject') => void;
  onCancel: (r: RevisionDto) => void;
}

const btn = 'rounded-[var(--tt-radius-sm)] p-1.5 2xl:p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';
const icon = 'h-4 w-4 2xl:h-4.5 2xl:w-4.5';

function Action({ tip, onClick, busy, danger, children }: { tip: string; onClick: () => void; busy?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip content={tip} align="end">
      <button type="button" aria-label={tip} disabled={busy} onClick={onClick} className={cx(btn, danger && 'hover:text-[var(--tt-danger)]')}>
        {children}
      </button>
    </Tooltip>
  );
}

export function RevisionRowActions({ revision: r, perms, busy, handlers }: { revision: RevisionDto; perms: RevisionPerms; busy: boolean; handlers: RevisionActionHandlers }) {
  const open = ['draft', 'pending', 'rejected'].includes(r.status);
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Action tip="Salary history" onClick={() => handlers.onHistory(r)}><History className={icon} /></Action>
      {['approved', 'applied'].includes(r.status) && <Action tip="Letter" onClick={() => handlers.onLetter(r)}><FileText className={icon} /></Action>}
      {perms.edit && open && !r.appraisal_cycle_id && <Action tip="Edit" onClick={() => handlers.onEdit(r)}><SquarePen className={icon} /></Action>}
      {perms.add && r.status === 'draft' && <Action tip="Submit" busy={busy} onClick={() => handlers.onSubmit(r)}><Send className={icon} /></Action>}
      {perms.approve && r.status === 'pending' && (
        <>
          <Action tip="Approve" busy={busy} onClick={() => handlers.onDecide(r, 'approve')}><Check className={icon} /></Action>
          <Action tip="Reject" busy={busy} danger onClick={() => handlers.onDecide(r, 'reject')}><X className={icon} /></Action>
        </>
      )}
      {perms.remove && (open || r.status === 'approved') && <Action tip="Cancel" busy={busy} danger onClick={() => handlers.onCancel(r)}><Ban className={icon} /></Action>}
    </div>
  );
}
