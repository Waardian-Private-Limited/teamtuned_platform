export type ViewportMode = 'phone' | 'tablet' | 'desktop' | 'wide';

// Matches the stock Tailwind v4 breakpoints already in effect platform-wide —
// no tailwind.config.* exists, and globals.css sets no --breakpoint-*
// override, so md=768/lg=1024/2xl=1536 are the real values everywhere else.
export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
  wide: 1536,
} as const;

// Unified collapsed width. The legacy sidebars disagreed — w-20 (org) vs
// w-16 (employee) — and 64px is a tight tap target on touch; 80px matches
// the org value and is used for both roles now.
export const SIDEBAR_WIDTH = {
  collapsed: 80,
  expanded: 256,
} as const;

// How long the pointer must be gone before a hover-peeked rail collapses
// again. Matches the legacy auto-collapse delay; unlike the legacy version
// this never fires from a touch tap (see hooks/useSidebar.ts).
export const HOVER_PEEK_DELAY_MS = 2000;

export const STORAGE_KEYS = {
  collapsed: (role: string) => `tt_nav_collapsed:${role}`,
} as const;
