'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, User, Bell, Settings, LogOut } from 'lucide-react';
import { getPageTitle } from '@/lib/pageTitles';
import { cx } from '@/theme/tokens';

/**
 * The shell's top bar. Sits as the first row inside AppShell's rounded card
 * (not sticky, not floating above it like the legacy GlobalHeader) — a
 * single bottom border is the only separator from the scrollable content
 * below, so the card reads as one surface instead of a bar-plus-card stack.
 */
export function TopBar({
  role,
  firstName,
  lastName,
  userRole,
  onLogout,
  onMenuClick,
  menuButtonRef,
}: {
  role: 'employee' | 'org-admin';
  firstName?: string | null;
  lastName?: string | null;
  userRole?: string | null;
  onLogout?: () => void;
  /** Present only on phone width — opens the nav drawer. */
  onMenuClick?: () => void;
  menuButtonRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const pathname = usePathname();
  const { title, description } = getPageTitle(pathname, role);
  const [menuOpen, setMenuOpen] = useState(false);

  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User';
  const hasUser = Boolean(firstName || lastName);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            ref={menuButtonRef}
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="-ml-2 shrink-0 rounded-full p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight text-fg sm:text-lg">{title}</h1>
          {description && <p className="truncate text-xs text-fg-muted">{description}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {hasUser && (
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-full p-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full border border-surface bg-[var(--tt-danger)]" />
          </button>
        )}

        {hasUser && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full py-1 pl-2 pr-1 transition-colors hover:bg-bg-subtle"
            >
              <div className="hidden flex-col items-end leading-none md:flex">
                <span className="text-sm font-semibold text-fg">{fullName}</span>
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
                  {userRole || role}
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--tt-primary)] text-[var(--tt-on-primary)]">
                <User size={16} />
              </div>
            </button>

            {menuOpen && (
              <div
                className={cx(
                  'absolute right-0 z-10 mt-2 w-56 rounded-[var(--tt-radius-md)] border border-line bg-surface p-1',
                  'shadow-[var(--tt-shadow-md)]'
                )}
              >
                <div className="border-b border-line px-3 py-2">
                  <p className="truncate text-sm font-semibold text-fg">{fullName}</p>
                  <p className="truncate text-xs text-fg-muted">{userRole || role}</p>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-[var(--tt-radius-sm)] px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                >
                  <User size={16} /> Profile
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-[var(--tt-radius-sm)] px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                >
                  <Settings size={16} /> Settings
                </button>
                <div className="mt-1 border-t border-line pt-1">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onLogout?.(); }}
                    className="flex w-full items-center gap-2 rounded-[var(--tt-radius-sm)] px-3 py-2 text-sm font-medium text-[var(--tt-danger)] transition-colors hover:bg-[var(--tt-danger-soft)]"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
