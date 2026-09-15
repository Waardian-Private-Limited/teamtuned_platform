import type { LucideIcon } from 'lucide-react';

/**
 * Visibility rule for a nav node. `feature` gates on an organization feature
 * code (exact match against `features`, mirroring the legacy `hasFeature`).
 * `perm`/`anyPerm` gate on the permission list (case-insensitive, mirroring
 * `hasPerm`/`hasAnyPerm`). `permPrefix` matches any permission that starts
 * with the given string — the one place the legacy sidebar used a wildcard
 * (Minutes of Meeting: any `MOM_*` permission).
 *
 * `orgAdminBypass` (default true) lets an org admin see the node regardless
 * of permissions, matching every `isOrgAdmin || hasPerm(...)` / `hasAnyPerm`
 * check in the legacy sidebars. An empty gate always passes.
 */
export interface NavGate {
  feature?: string;
  perm?: string;
  anyPerm?: string[];
  permPrefix?: string;
  orgAdminBypass?: boolean;
}

export interface NavLink {
  kind: 'link';
  label: string;
  href: string;
  icon: LucideIcon;
  /** 'exact' (default) matches pathname === href; 'prefix' matches startsWith. */
  match?: 'exact' | 'prefix';
  /**
   * Extra hrefs treated as this link's own route for active-state matching
   * only — navigation still goes to `href`. Used for the handful of legacy
   * items whose "active" check spans two routes (e.g. DPR Planning covers
   * both /dps/schedule and /dps/planned-schedules).
   */
  altHrefs?: string[];
  /**
   * Escape hatch for the one legacy item whose active state isn't a plain
   * prefix — "Attendance Logs" matches /employee/attendance and its
   * sub-routes but must exclude the sibling attendance-dashboard/-config/
   * -rules routes, which also start with "attendance". Overrides
   * `match`/`altHrefs` when present.
   */
  activeTest?: (pathname: string) => boolean;
  gate?: NavGate;
}

export interface NavGroup {
  kind: 'group';
  /** Stable key. Open/closed state is keyed on this, not on array position. */
  id: string;
  label: string;
  children: NavNode[];
  gate?: NavGate;
}

export type NavNode = NavLink | NavGroup;

/** What a gate is evaluated against, resolved once per render by the caller. */
export interface NavContext {
  isOrgAdmin: boolean;
  permissions: string[];
  features: string[] | undefined;
}
