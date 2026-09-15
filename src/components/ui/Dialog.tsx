'use client';

import { X } from 'lucide-react';
import { cx, heading } from '@/theme/tokens';
import { useModalBehavior } from './useModalBehavior';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClassName?: string;
}

export function Dialog({ open, onClose, title, children, footer, maxWidthClassName = 'max-w-lg' }: DialogProps) {
  const panelRef = useModalBehavior(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[var(--tt-overlay)]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cx(
          'relative z-10 flex max-h-[85vh] w-full flex-col rounded-[var(--tt-radius-lg)]',
          'bg-surface shadow-[var(--tt-shadow-lg)] tt-fade-in',
          maxWidthClassName
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6 sm:py-4">
            {typeof title === 'string' ? <h2 className={heading.sm}>{title}</h2> : title}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-[var(--tt-radius-sm)] p-1.5 text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto tt-scroll-hidden px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 sm:gap-3 border-t border-line px-4 py-3 sm:px-6 sm:py-4">{footer}</div>}
      </div>
    </div>
  );
}
