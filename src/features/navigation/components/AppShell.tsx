'use client';

import { useRef } from 'react';
import GlobalFooter from '@/components/shared/GlobalFooter';
import { cx, scroll } from '@/theme/tokens';
import { Sidebar } from './Sidebar';
import { SidebarDrawer } from './SidebarDrawer';
import { TopBar } from './TopBar';
import { useSidebar } from '../hooks/useSidebar';
import type { NavContext, NavNode } from '../types/nav.model';
import { DownloadCenterProvider } from '@/features/downloads/context/DownloadCenterContext';
import { DownloadCenter } from '@/features/downloads/components/DownloadCenter';

/**
 * The app shell shared by org-admin, org and employee layouts: sidebar (or
 * drawer, on phone) + top bar + scrollable content, all as one rounded
 * card, plus a thin footer strip below it.
 *
 * Responsive strategy:
 *  - < 768: sidebar becomes an off-canvas drawer (hamburger in top bar).
 *  - 768–1023: inline icon rail, manual toggle arrow to expand.
 *  - >= 1024: icon rail by default, manual toggle arrow to pin open.
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
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined;

  return (
    <DownloadCenterProvider>
      <DownloadCenter />
      <div className="flex h-[100dvh] gap-2 bg-bg-subtle p-2 text-fg">
        {/* Desktop/tablet sidebar — overflow-visible lets the toggle arrow
          and collapsed popovers extend beyond the sidebar edge. */}
        {!sidebar.isPhone && (
          <div
            className={cx(
              'relative shrink-0 transition-[width] duration-200',
              sidebar.isCollapsed ? 'w-20' : 'w-64'
            )}
          >
            <Sidebar
              nodes={nodes}
              ctx={ctx}
              orgName={orgName}
              orgLogoUrl={orgLogoUrl}
              subtitle={subtitle}
              collapsed={sidebar.isCollapsed}
              userName={fullName}
              userRole={userRole}
              onLogout={onLogout}
              onToggleCollapse={sidebar.toggleCollapsed}
              className="h-full overflow-visible rounded-3xl"
            />
          </div>
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
              userName={fullName}
              userRole={userRole}
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
    </DownloadCenterProvider>
  );
}
