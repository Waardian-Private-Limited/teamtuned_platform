'use client';

import { Dialog } from '@/components/ui/Dialog';
import { text } from '@/theme/tokens';
import type { Mapping } from '../../types/siteSubOrgMapper.model';

interface MappingDeleteDialogProps {
  open: boolean;
  mapping: Mapping | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function MappingDeleteDialog({ open, mapping, isDeleting, onClose, onConfirm }: MappingDeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete Mapping"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-danger)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-danger)]/90 active:scale-[0.98] disabled:opacity-50 sm:text-sm"
          >
            {isDeleting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            <span>Delete</span>
          </button>
        </>
      }
    >
      <p className={text.body}>
        Remove the link between <span className="font-semibold text-fg">{mapping?.siteName}</span> and{' '}
        <span className="font-semibold text-fg">{mapping?.subOrgName}</span>? If this was the site&apos;s only
        sub-organization, the site becomes shared across the organization.
      </p>
    </Dialog>
  );
}
