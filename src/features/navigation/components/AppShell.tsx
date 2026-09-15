'use client';

import { useRef } from 'react';
import GlobalFooter from '@/components/shared/GlobalFooter';
import { cx, scroll } from '@/theme/tokens';
import { Sidebar } from './Sidebar';
import { SidebarDrawer } from './SidebarDrawer';
import { TopBar } from './TopBar';
import { useSidebar } from '../hooks/useSidebar';
import type { NavContext, NavNode } from '../types/nav.model';

/**
 * The app shell shared by org-admin, org and employee layouts: sidebar (or
 * drawer, on phone) + top bar + scrollable content, all as one rounded
 * card, plus a thin footer strip below it. Replaces the near-identical
 * markup block each of those three layout files repeated on its own.
 *
 * The top bar used to float above the content as a separate sticky
 * element, with the content in its own rounded box underneath — two
 * surfaces stacked with a visible gap. Here they're one surface: the top
 * bar is the card's first row, a single border separates it from the
 * scrollable body, and the card fills the frame with a minimal 8px gutter
 * on every side instead of the header eating its own top strip first.
 *
 * Responsive strategy (see the plan for the full breakpoint table):
 *  - < 768: sidebar becomes an off-canvas drawer, opened from a hamburger
 *    hosted in the top bar.
 *  - 768–1023: inline icon rail by default, toggle expands (session-only).
 *  - >= 1024: rests as an icon rail, hover peeks it open, explicit toggle
 *    pins it open (persisted).
 */
export function AppShell({
  storageRole,
  headerRole,
  nodes,
  ctx,
  orgName,
  orgLogoUrl,
  subtitle,
  firstName,
  lastName,
  userRole,
  onLogout,
  children,
}: {
  /** Key used for the persisted collapse preference — distinct per area. */
  storageRole: string;
  headerRole: 'org-admin' | 'employee';
  nodes: NavNode[];
  ctx: NavContext;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  subtitle: string;
  firstName?: string | null;
  lastName?: string | null;
  userRole?: string | null;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const sidebar = useSidebar(storageRole);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex h-[100dvh] gap-2 bg-bg-subtle p-2 text-fg">
      {!sidebar.isPhone && (
        <Sidebar
          nodes={nodes}
          ctx={ctx}
          orgName={orgName}
          orgLogoUrl={orgLogoUrl}
          subtitle={subtitle}
          collapsed={sidebar.isCollapsed}
          onLogout={onLogout}
          onPointerEnter={sidebar.onPointerEnter}
          onPointerLeave={sidebar.onPointerLeave}
          className={cx(
            'shrink-0 overflow-hidden rounded-3xl transition-[width] duration-200',
            sidebar.isCollapsed ? 'w-20' : 'w-64'
          )}
        />
      )}

      {sidebar.isPhone && (
        <SidebarDrawer open={sidebar.drawerOpen} onClose={sidebar.closeDrawer} triggerRef={hamburgerRef}>
          <Sidebar
            nodes={nodes}
            ctx={ctx}
            orgName={orgName}
            orgLogoUrl={orgLogoUrl}
            subtitle={subtitle}
            collapsed={false}
            onLogout={onLogout}
            onNavigate={sidebar.closeDrawer}
            className="h-full"
          />
        </SidebarDrawer>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-surface shadow-[var(--tt-shadow-sm)]">
          <TopBar
            role={headerRole}
            firstName={firstName}
            lastName={lastName}
            userRole={userRole}
            onLogout={onLogout}
            onMenuClick={sidebar.isPhone ? sidebar.openDrawer : undefined}
            menuButtonRef={hamburgerRef}
          />
          <main className={cx('min-h-0 flex-1 p-4 sm:p-6', scroll.hidden)}>{children}</main>
        </div>
        <GlobalFooter orgName={orgName} />
      </div>
    </div>
  );
}
