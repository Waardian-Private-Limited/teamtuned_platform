'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { nav } from '@/theme/tokens';

/**
 * Off-canvas nav for phone width. Traps focus while open, restores it to
 * the hamburger on close, closes on Escape/backdrop (body scroll lock and
 * Escape handling live in useSidebar so they apply regardless of how the
 * drawer is closed).
 */
export function SidebarDrawer({
  open,
  onClose,
  triggerRef,
  children,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    } else {
      triggerRef?.current?.focus();
    }
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className={nav.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col rounded-r-3xl bg-surface shadow-[var(--tt-shadow-lg)]"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </>
  );
}
