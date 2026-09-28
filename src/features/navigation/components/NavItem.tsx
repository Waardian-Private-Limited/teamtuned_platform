'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/theme/tokens';
import { isLinkActive } from '../utils/nav-active';
import type { NavLink } from '../types/nav.model';

/**
 * Hover tooltip portalled to document.body so it renders above all page
 * content — never clipped by the sidebar's overflow or z-index.
 */
function CollapsedTooltip({ label, anchorRect }: { label: string; anchorRect: DOMRect | null }) {
  if (!anchorRect) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchorRect.top + anchorRect.height / 2,
    left: anchorRect.right + 12,
    transform: 'translateY(-50%)',
    zIndex: 9999,
  };

  return createPortal(
    <div style={style} className="animate-[tt-fade-in_100ms_ease-out] pointer-events-none">
      <div className="whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg shadow-[var(--tt-shadow-md)]">
        {label}
      </div>
    </div>,
    document.body
  );
}

export function NavItem({
  link,
  collapsed,
  indent = 0,
  onNavigate,
}: {
  link: NavLink;
  collapsed: boolean;
  indent?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isLinkActive(link, pathname);
  const Icon = link.icon;
  const [hovering, setHovering] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const onEnter = useCallback(() => {
    if (!collapsed) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setAnchorRect(elRef.current?.getBoundingClientRect() ?? null);
    setHovering(true);
  }, [collapsed]);

  const onLeave = useCallback(() => {
    if (!collapsed) return;
    timeoutRef.current = setTimeout(() => setHovering(false), 150);
  }, [collapsed]);

  return (
    <div ref={elRef} className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <Link
        href={link.href}
        onClick={onNavigate}
        className={cx(
          'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium',
          'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-ring)]',
          indent > 0 && 'ml-4',
          active
            ? 'bg-bg-subtle text-fg font-semibold'
            : 'text-fg-muted hover:bg-bg-subtle hover:text-fg',
          collapsed && 'justify-center rounded-xl p-2.5',
          collapsed && active && 'bg-bg-subtle text-fg',
          collapsed && !active && 'hover:bg-bg-subtle'
        )}
      >
        <Icon size={18} className={cx('shrink-0', active ? 'text-fg' : 'text-fg-muted group-hover:text-fg')} />
        {!collapsed && <span className="truncate">{link.label}</span>}
      </Link>

      {/* Collapsed hover tooltip — portalled above all pages */}
      {collapsed && hovering && <CollapsedTooltip label={link.label} anchorRect={anchorRect} />}
    </div>
  );
}
