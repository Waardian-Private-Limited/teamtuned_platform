'use client';

import { LogOut } from 'lucide-react';
import { cx, nav, scroll } from '@/theme/tokens';
import { NavItem } from './NavItem';
import { NavGroup } from './NavGroup';
import { SidebarHeader } from './SidebarHeader';
import { useNavTree } from '../hooks/useNavTree';
import type { NavContext, NavNode } from '../types/nav.model';

/**
 * The sidebar itself — header, filtered nav tree, logout. Used both inline
 * (desktop/tablet rail) and inside SidebarDrawer (phone), so it owns no
 * positioning of its own; the caller decides where it sits.
 */
export function Sidebar({
  nodes,
  ctx,
  orgName,
  orgLogoUrl,
  subtitle,
  collapsed,
  onLogout,
  onNavigate,
  onPointerEnter,
  onPointerLeave,
  className,
}: {
  nodes: NavNode[];
  ctx: NavContext;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  subtitle: string;
  collapsed: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  className?: string;
}) {
  const { visible, isOpen, toggle } = useNavTree(nodes, ctx);

  return (
    <div onMouseEnter={onPointerEnter} onMouseLeave={onPointerLeave} className={cx(nav.shell, className)}>
      <SidebarHeader orgName={orgName} orgLogoUrl={orgLogoUrl} collapsed={collapsed} subtitle={subtitle} />

      <nav className={cx('min-h-0 flex-1 space-y-1 p-3', scroll.hidden)} aria-label="Main">
        {visible.map((node) =>
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

      <div className="p-4">
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Logout' : undefined}
          className={cx(
            'flex w-full items-center gap-3 rounded-[var(--tt-radius-control)] px-3 py-2.5 transition-all',
            'bg-[var(--tt-danger)] text-[var(--tt-on-primary)] shadow-[var(--tt-shadow-sm)] hover:opacity-90',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}
