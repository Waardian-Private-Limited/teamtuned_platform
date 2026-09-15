'use client';

import { X } from 'lucide-react';
import { cx, heading } from '@/theme/tokens';
import { useModalBehavior } from './useModalBehavior';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// Shares Dialog's overlay, focus-trap, and scroll-lock behaviour but slides
// in from the right; collapses to a full-screen sheet below the `sm` break.
export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const panelRef = useModalBehavior(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-[var(--tt-overlay)]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          'fixed inset-y-0 right-0 z-10 flex w-full flex-col bg-surface shadow-[var(--tt-shadow-lg)]',
          'sm:inset-y-2 sm:right-2 sm:w-full sm:max-w-md sm:rounded-[var(--tt-radius-lg)]',
          'tt-fade-in'
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6 sm:py-4">
          <h2 className={cx(heading.sm, 'text-sm sm:text-base font-bold')}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[var(--tt-radius-sm)] p-1.5 text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto tt-scroll-hidden px-4 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>
  );
}
