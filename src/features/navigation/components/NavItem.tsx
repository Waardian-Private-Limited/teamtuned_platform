'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx, nav } from '@/theme/tokens';
import { isLinkActive } from '../utils/nav-active';
import type { NavLink } from '../types/nav.model';

export function NavItem({
  link,
  collapsed,
  indent = 0,
  onNavigate,
}: {
  link: NavLink;
  collapsed: boolean;
  /** Nesting depth inside a group, for the left indent on sub-items. */
  indent?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isLinkActive(link, pathname);
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      title={collapsed ? link.label : undefined}
      style={indent > 0 && !collapsed ? { paddingLeft: `${12 + indent * 16}px` } : undefined}
      className={cx(nav.item, active ? nav.itemActive : nav.itemIdle, collapsed && 'justify-center')}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{link.label}</span>}
    </Link>
  );
}
