'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Folder, type LucideIcon } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { isLinkActive } from '../utils/nav-active';
import type { NavGroup as NavGroupNode, NavLink } from '../types/nav.model';

function representativeIcon(group: NavGroupNode): LucideIcon | undefined {
  if (group.icon) return group.icon;
  for (const child of group.children) {
    if (child.kind === 'link') return child.icon;
    const icon = representativeIcon(child);
    if (icon) return icon;
  }
  return undefined;
}

/**
 * Branch tree connector component.
 * Renders the vertical tree stem with a smooth curve branching to the right
 * towards the sub-item, matching the tree/branching design in both expanded
 * and collapsed popup views.
 */
export function BranchConnector({
  isLast,
  isFirst = false,
  className,
}: {
  isLast: boolean;
  isFirst?: boolean;
  className?: string;
}) {
  return (
    <div className={cx('relative h-9 w-6 shrink-0', className)} aria-hidden="true">
      <svg
        viewBox="0 0 24 36"
        fill="none"
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        {/* Continuous vertical line if not the last item */}
        {!isLast && (
          <line
            x1="9"
            y1="0"
            x2="9"
            y2="36"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-line-strong"
          />
        )}
        {/* Curved branch to the right (curves at y=18 to x=24) */}
        {isLast ? (
          <path
            d="M 9 0 L 9 9 Q 9 18 17 18 L 24 18"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-line-strong"
          />
        ) : (
          <path
            d="M 9 9 Q 9 18 17 18 L 24 18"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-line-strong"
          />
        )}
      </svg>
    </div>
  );
}

/**
 * Sub-item in the expanded tree navigation with branching connector.
 */
function NavSubItem({
  link,
  isFirst,
  isLast,
  onNavigate,
}: {
  link: NavLink;
  isFirst: boolean;
  isLast: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isLinkActive(link, pathname);

  return (
    <div className="relative flex h-9 items-center">
      <BranchConnector isLast={isLast} isFirst={isFirst} />
      <Link
        href={link.href}
        onClick={onNavigate}
        className={cx(
          'flex-1 truncate rounded-xl px-2.5 py-1.5 text-[13px] transition-colors',
          active
            ? 'bg-bg-subtle font-semibold text-fg'
            : 'text-fg-muted hover:bg-bg-subtle/60 hover:text-fg'
        )}
      >
        {link.label}
      </Link>
    </div>
  );
}

/**
 * Sub-item in the collapsed popover with branching connector.
 */
function PopoverSubItem({
  link,
  isFirst,
  isLast,
  onNavigate,
}: {
  link: NavLink;
  isFirst: boolean;
  isLast: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isLinkActive(link, pathname);

  return (
    <div className="relative flex h-9 items-center">
      <BranchConnector isLast={isLast} isFirst={isFirst} />
      <Link
        href={link.href}
        onClick={onNavigate}
        className={cx(
          'flex-1 truncate rounded-xl px-2.5 py-1.5 text-[13px] transition-colors',
          active
            ? 'bg-bg-subtle font-semibold text-fg'
            : 'text-fg-muted hover:bg-bg-subtle/60 hover:text-fg'
        )}
      >
        {link.label}
      </Link>
    </div>
  );
}

/**
 * Floating popover portalled to document.body so it renders above all page
 * content. Shows the sub-items connected with branching tree connectors.
 */
function CollapsedPopover({
  group,
  anchorRect,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
}: {
  group: NavGroupNode;
  anchorRect: DOMRect | null;
  onNavigate?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  if (!anchorRect) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchorRect.top,
    left: anchorRect.right,
    paddingLeft: 8,
    zIndex: 9999,
  };

  return createPortal(
    <div
      style={style}
      className="animate-[tt-fade-in_100ms_ease-out]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="min-w-[170px] rounded-2xl border border-line bg-surface p-2 shadow-[var(--tt-shadow-md)]">
        {group.children.map((child, idx) =>
          child.kind === 'link' ? (
            <PopoverSubItem
              key={child.href}
              link={child}
              isFirst={idx === 0}
              isLast={idx === group.children.length - 1}
              onNavigate={onNavigate}
            />
          ) : null
        )}
      </div>
    </div>,
    document.body
  );
}

export function NavGroup({
  group,
  depth,
  collapsed,
  isOpen,
  onToggle,
  onNavigate,
}: {
  group: NavGroupNode;
  depth: number;
  collapsed: boolean;
  isOpen: (id: string) => boolean;
  onToggle: (id: string, depth: number) => void;
  onNavigate?: () => void;
}) {
  const open = isOpen(group.id);
  const Icon = representativeIcon(group) ?? Folder;
  const [hovering, setHovering] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const startHover = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setAnchorRect(elRef.current?.getBoundingClientRect() ?? null);
    setHovering(true);
  }, []);

  const endHover = useCallback(() => {
    timeoutRef.current = setTimeout(() => setHovering(false), 200);
  }, []);

  /* Collapsed rail: show icon, floating popover on hover */
  if (collapsed) {
    return (
      <div
        ref={elRef}
        className="relative"
        onMouseEnter={startHover}
        onMouseLeave={endHover}
      >
        <button
          type="button"
          className={cx(
            'flex w-full items-center justify-center rounded-xl p-2.5 transition-colors',
            hovering || open
              ? 'bg-bg-subtle text-fg'
              : 'text-fg-muted hover:bg-bg-subtle hover:text-fg'
          )}
        >
          <Icon size={18} className="shrink-0" />
        </button>
        {hovering && (
          <CollapsedPopover
            group={group}
            anchorRect={anchorRect}
            onNavigate={onNavigate}
            onMouseEnter={startHover}
            onMouseLeave={endHover}
          />
        )}
      </div>
    );
  }

  /* Expanded sidebar */
  return (
    <div className={depth > 0 ? 'mt-0.5' : 'mt-1'}>
      <button
        type="button"
        onClick={() => onToggle(group.id, depth)}
        className={cx(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
          'text-fg-muted hover:bg-bg-subtle hover:text-fg',
          open && 'bg-bg-subtle text-fg font-medium'
        )}
      >
        <Icon size={18} className="shrink-0" />
        <span className="flex-1 text-left text-[13px] font-medium truncate">{group.label}</span>
        <ChevronDown
          size={14}
          className={cx(
            'shrink-0 text-fg-subtle transition-transform duration-200',
            !open && '-rotate-90'
          )}
        />
      </button>

      {/* Sub-items with smooth height animation and branching tree connectors */}
      <div
        className={cx(
          'overflow-hidden transition-all duration-200',
          open ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="pl-3 py-0.5">
          {group.children.map((child, idx) => {
            const isLast = idx === group.children.length - 1;
            const isFirst = idx === 0;
            if (child.kind === 'link') {
              return (
                <NavSubItem
                  key={child.href}
                  link={child}
                  isFirst={isFirst}
                  isLast={isLast}
                  onNavigate={onNavigate}
                />
              );
            }
            return (
              <div key={child.id} className="relative flex items-start">
                <BranchConnector isLast={isLast} isFirst={isFirst} />
                <div className="flex-1">
                  <NavGroup
                    group={child}
                    depth={depth + 1}
                    collapsed={false}
                    isOpen={isOpen}
                    onToggle={onToggle}
                    onNavigate={onNavigate}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
