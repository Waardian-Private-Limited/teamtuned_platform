'use client';

import { X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { useModalBehavior } from '@/components/ui/useModalBehavior';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function WideDrawer({ open, onClose, title, subtitle, children }: Props) {
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
          'sm:inset-y-2 sm:right-2 sm:max-w-[min(1040px,calc(100vw-1rem))] sm:rounded-[var(--tt-radius-lg)]',
          'tt-fade-in'
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-fg sm:text-base">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-[var(--tt-radius-sm)] p-1.5 text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
