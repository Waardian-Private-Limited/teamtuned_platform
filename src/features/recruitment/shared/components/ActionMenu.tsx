'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/theme/tokens';

export type ActionMenuEntry =
  | {
      key: string;
      label: string;
      icon?: LucideIcon;
      onSelect: () => void;
      disabled?: boolean;
      danger?: boolean;
      checked?: boolean;
      hint?: string;
    }
  | { key: string; heading: string }
  | { key: string; divider: true };

interface ActionMenuProps {
  /** Accessible name of the trigger. */
  label: string;
  items: ActionMenuEntry[];
  /** Trigger content (icon and/or text). */
  children: React.ReactNode;
  triggerClassName?: string;
  align?: 'start' | 'end';
  disabled?: boolean;
}

const MENU_W = 220;

/**
 * Small menu-button. Rendered in a portal with fixed positioning so it is not
 * clipped by scrolling Kanban columns or drawers. Keyboard: Enter/Space/Arrow
 * opens, arrows move, Home/End jump, Escape/Tab close (Escape never reaches a
 * surrounding Drawer).
 */
export function ActionMenu({ label, items, children, triggerClassName, align = 'end', disabled }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const actionable = items.filter((i): i is Extract<ActionMenuEntry, { onSelect: () => void }> => 'onSelect' in i);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setPos(null);
    if (refocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const place = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const h = menuRef.current?.offsetHeight ?? 200;
      const left = align === 'end' ? r.right - MENU_W : r.left;
      let top = r.bottom + 4;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 4);
      setPos({ top, left: Math.min(Math.max(8, left), window.innerWidth - MENU_W - 8) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close(false);
    };
    document.addEventListener('mousedown', onDown);
    const node = menuRef.current;
    // Native listener on the menu itself so Escape stops before a Drawer's document listener sees it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(true); }
    };
    node?.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => {
      node?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    });
    return () => {
      document.removeEventListener('mousedown', onDown);
      node?.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  }, [open, close]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const at = nodes.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); nodes[(at + 1) % nodes.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nodes[(at - 1 + nodes.length) % nodes.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); nodes[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); nodes[nodes.length - 1]?.focus(); }
    else if (e.key === 'Tab') { e.preventDefault(); close(true); }
  };

  if (!actionable.length) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setOpen(true); }
        }}
        className={triggerClassName}
      >
        {children}
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: MENU_W, zIndex: 70 }}
          className="rounded-lg border border-line bg-surface p-1 shadow-[var(--tt-shadow-md)]"
        >
          {items.map((item) => {
            if ('divider' in item) return <div key={item.key} role="separator" className="my-1 border-t border-line" />;
            if ('heading' in item) {
              return <div key={item.key} className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-fg-subtle">{item.heading}</div>;
            }
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                tabIndex={-1}
                onClick={() => { close(true); item.onSelect(); }}
                className={cx(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium outline-none transition-colors sm:text-[13px]',
                  'hover:bg-bg-subtle focus:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40',
                  item.danger ? 'text-[var(--tt-danger)]' : 'text-fg'
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="shrink-0 text-[10px] text-fg-subtle">{item.hint}</span>}
                {item.checked && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
