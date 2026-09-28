'use client';

import { Search, LogOut, User, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cx, scroll } from '@/theme/tokens';
import { NavItem } from './NavItem';
import { NavGroup } from './NavGroup';
import { SidebarHeader } from './SidebarHeader';
import { useNavTree } from '../hooks/useNavTree';
import type { NavContext, NavNode } from '../types/nav.model';

/**
 * The sidebar itself — header, search, filtered nav tree, user profile.
 *
 * Key behaviors matching the reference design:
 *  - Manual expand/collapse via a toggle arrow at the sidebar edge
 *  - NO auto-expand on hover — only the arrow controls it
 *  - Collapsed state: icon rail with popover tooltips on hover
 *  - Search bar below the logo
 *  - Section labels ("MAIN") in small caps
 *  - User profile card at bottom with avatar + dropdown
 */
export function Sidebar({
  nodes,
  ctx,
  orgName,
  orgLogoUrl,
  subtitle,
  collapsed,
  userName,
  userRole,
  onLogout,
  onNavigate,
  onToggleCollapse,
  className,
}: {
  nodes: NavNode[];
  ctx: NavContext;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  subtitle: string;
  collapsed: boolean;
  userName?: string | null;
  userRole?: string | null;
  onLogout: () => void;
  onNavigate?: () => void;
  /** Manual toggle — the arrow button calls this. */
  onToggleCollapse?: () => void;
  className?: string;
}) {
  const { visible, isOpen, toggle } = useNavTree(nodes, ctx);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* Close user dropdown on outside click */
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  /* Filter nav items by search query */
  const filteredVisible = searchQuery.trim()
    ? visible.filter((node) => {
        const q = searchQuery.toLowerCase();
        if (node.kind === 'link') return node.label.toLowerCase().includes(q);
        if (node.label.toLowerCase().includes(q)) return true;
        return node.children.some(
          (c) => c.kind === 'link' && c.label.toLowerCase().includes(q)
        );
      })
    : visible;

  const displayName = userName || 'User';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={cx(
        'relative flex h-full flex-col bg-surface shadow-[var(--tt-shadow-sm)]',
        className
      )}
    >
      {/* ── Toggle arrow button (edge of sidebar) ── */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cx(
            'absolute -right-3 top-7 z-30 flex h-6 w-6 items-center justify-center',
            'rounded-full border border-line bg-surface text-fg-muted shadow-[var(--tt-shadow-sm)]',
            'transition-all duration-200 hover:bg-bg-subtle hover:text-fg hover:shadow-[var(--tt-shadow-md)]'
          )}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      )}

      {/* Header: logo + org name */}
      <SidebarHeader orgName={orgName} orgLogoUrl={orgLogoUrl} collapsed={collapsed} subtitle={subtitle} />

      {/* Search bar */}
      {!collapsed ? (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-bg-subtle px-3 py-2 transition-colors focus-within:border-line-strong focus-within:bg-surface">
            <Search size={14} className="shrink-0 text-fg-subtle" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none"
            />
            <kbd className="hidden rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-subtle shadow-[var(--tt-shadow-sm)] sm:block">
              ⌘K
            </kbd>
          </div>
        </div>
      ) : (
        <div className="flex justify-center px-3 pb-2">
          <button
            type="button"
            title="Search"
            className="rounded-xl p-2.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
          >
            <Search size={18} />
          </button>
        </div>
      )}

      {/* Section label */}
      {!collapsed && (
        <div className="px-6 pb-1 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-subtle">Main</span>
        </div>
      )}

      {/* Navigation tree */}
      <nav className={cx('min-h-0 flex-1 space-y-0.5 px-3', scroll.hidden)} aria-label="Main">
        {filteredVisible.map((node) =>
          node.kind === 'link' ? (
            <NavItem key={node.href} link={node} collapsed={collapsed} onNavigate={onNavigate} />
          ) : (
            <NavGroup
              key={node.id}
              group={node}
              depth={0}
              collapsed={collapsed}
              isOpen={isOpen}
              onToggle={toggle}
              onNavigate={onNavigate}
            />
          )
        )}
      </nav>

      {/* Spacer */}
      <div className="flex-shrink-0" />

      {/* User profile footer */}
      <div className="border-t border-line p-3" ref={userMenuRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            title={collapsed ? displayName : undefined}
            className={cx(
              'flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-bg-subtle',
              collapsed && 'justify-center'
            )}
          >
            {/* Avatar */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--tt-primary)] text-[var(--tt-on-primary)] shadow-[var(--tt-shadow-sm)]">
              <span className="text-xs font-bold">{initials}</span>
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[13px] font-semibold text-fg">{displayName}</p>
                  <p className="truncate text-[10px] font-medium uppercase tracking-wide text-fg-muted">
                    {userRole || 'Member'}
                  </p>
                </div>
                <ChevronDown
                  size={14}
                  className={cx(
                    'shrink-0 text-fg-subtle transition-transform duration-200',
                    userMenuOpen && 'rotate-180'
                  )}
                />
              </>
            )}
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-2 animate-[tt-fade-in_120ms_ease-out] rounded-xl border border-line bg-surface p-1.5 shadow-[var(--tt-shadow-md)]">
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
              >
                <User size={15} />
                <span>Profile</span>
              </button>
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--tt-danger)] transition-colors hover:bg-[var(--tt-danger-soft)]"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
