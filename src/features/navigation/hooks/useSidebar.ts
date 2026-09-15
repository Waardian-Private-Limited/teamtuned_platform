'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HOVER_PEEK_DELAY_MS, STORAGE_KEYS } from '../constants/navigation.constants';
import { useHoverCapable, useViewport } from './useViewport';

// Resting default is collapsed (icon rail) — matches the legacy hover
// behavior: rests small, hover peeks it open, leaving collapses it again.
// Only an explicit toggle ('0' = pinned open) overrides that default; '1'
// and "never set" both mean collapsed.
function readPersistedCollapsed(role: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEYS.collapsed(role)) !== '0';
  } catch {
    return true;
  }
}

/**
 * Owns every piece of sidebar chrome state — expand/collapse, the mobile
 * drawer, and a non-persisting hover peek — so the three area layouts
 * (org-admin, org, employee) don't each reimplement it.
 *
 * On desktop/wide this restores the legacy feel — rests as an icon rail,
 * hover peeks it open, leaving re-collapses it after a delay — but fixes
 * the legacy bug: that behavior was a raw 2000ms timer with no touch
 * fallback, so on a touch device it fired once on mount and then could
 * never reverse (no hover event ever arrives to re-expand it). Here the
 * peek is registered only on pointer:fine devices, and an explicit toggle
 * can pin the sidebar open, persisted, independent of hover.
 */
export function useSidebar(role: string) {
  const pathname = usePathname();
  const mode = useViewport();
  const hoverCapable = useHoverCapable();

  // Persisted per role, desktop/wide only. Tablet always starts as an icon
  // rail and its toggle is session-only, so expanding on a tablet never
  // overwrites a desktop preference synced from the same account.
  const [desktopCollapsed, setDesktopCollapsedState] = useState(() => readPersistedCollapsed(role));
  const [tabletExpanded, setTabletExpanded] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setDesktopCollapsed = useCallback((value: boolean) => {
    setDesktopCollapsedState(value);
    try {
      window.localStorage.setItem(STORAGE_KEYS.collapsed(role), value ? '1' : '0');
    } catch {
      // Private mode / storage disabled — the choice just won't survive reload.
    }
  }, [role]);

  const isCollapsed = mode === 'tablet'
    ? !tabletExpanded && !peeking
    : desktopCollapsed && !peeking;

  const toggleCollapsed = useCallback(() => {
    if (mode === 'tablet') setTabletExpanded((v) => !v);
    else setDesktopCollapsed(!desktopCollapsed);
  }, [mode, desktopCollapsed, setDesktopCollapsed]);

  // Hover peek: expands a collapsed rail without touching the persisted
  // choice. Registered only on pointer:fine devices, so it can't fire from
  // a touch tap and can't fight the explicit toggle on tablet/phone.
  const onPointerEnter = useCallback(() => {
    if (!hoverCapable || mode === 'phone') return;
    if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
    setPeeking(true);
  }, [hoverCapable, mode]);

  const onPointerLeave = useCallback(() => {
    if (!hoverCapable || mode === 'phone') return;
    peekTimeoutRef.current = setTimeout(() => setPeeking(false), HOVER_PEEK_DELAY_MS);
  }, [hoverCapable, mode]);

  useEffect(() => () => {
    if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
  }, []);

  // Drawer closes on every route change.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Drawer closes on Escape; body scroll locks while it's open.
  useEffect(() => {
    if (mode !== 'phone' || !drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mode, drawerOpen]);

  return {
    mode,
    isPhone: mode === 'phone',
    isCollapsed,
    toggleCollapsed,
    drawerOpen,
    openDrawer: useCallback(() => setDrawerOpen(true), []),
    closeDrawer: useCallback(() => setDrawerOpen(false), []),
    onPointerEnter,
    onPointerLeave,
  };
}
