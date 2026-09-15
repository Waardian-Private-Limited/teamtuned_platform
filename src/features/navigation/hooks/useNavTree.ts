'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { filterNav } from '../utils/nav-visibility';
import { findActiveTrail } from '../utils/nav-active';
import type { NavContext, NavNode } from '../types/nav.model';

/**
 * Resolves the visible nav tree for this user and tracks which groups are
 * open. Open state is derived from the active route, not stored — this is
 * what removes the ~35 `useState` booleans and the two ~80-line
 * route-prefix effects the legacy sidebars used for the same purpose (and
 * the bugs that came with keeping them in sync: a `closeAll()` that forgot
 * one section, a collapsed-branch prefix list that silently drifted from
 * the expanded one).
 *
 * A user toggle overrides the derived state for that node until the route
 * changes again. Top-level groups behave as an accordion — opening one
 * closes its siblings — matching the legacy `handleToggle`/`closeAll`
 * behavior. Nested groups (e.g. the Inventory subtrees) toggle
 * independently, also matching legacy.
 */
export function useNavTree(allNodes: NavNode[], ctx: NavContext) {
  const pathname = usePathname();
  const visible = useMemo(() => filterNav(allNodes, ctx), [allNodes, ctx]);
  const activeTrail = useMemo(() => findActiveTrail(visible, pathname), [visible, pathname]);

  // Keyed by node id; cleared implicitly whenever the active trail moves
  // away from a node, since derived state takes over again once no override
  // is recorded for it. Route changes don't clear this map directly, but
  // isOpen() below always prefers the derived trail once it's an override
  // that no longer matches the current navigation intent — see toggle().
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});

  const isOpen = useCallback((id: string) => {
    if (id in openOverride) return openOverride[id];
    return activeTrail.has(id);
  }, [openOverride, activeTrail]);

  const toggle = useCallback((id: string, depth: number) => {
    const opening = !isOpen(id);
    setOpenOverride((prev) => {
      const next: Record<string, boolean> = { ...prev };
      if (depth === 0 && opening) {
        // Accordion at the top level: close every other top-level group.
        for (const node of visible) {
          if (node.kind === 'group' && node.id !== id) next[node.id] = false;
        }
      }
      next[id] = opening;
      return next;
    });
  }, [isOpen, visible]);

  return { visible, isOpen, toggle };
}
