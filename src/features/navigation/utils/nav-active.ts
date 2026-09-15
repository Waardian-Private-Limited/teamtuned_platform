import type { NavLink, NavNode } from '../types/nav.model';

function matchesOne(href: string, mode: 'exact' | 'prefix', pathname: string): boolean {
  return mode === 'prefix' ? pathname.startsWith(href) : pathname === href;
}

export function isLinkActive(link: NavLink, pathname: string | null): boolean {
  if (!pathname) return false;
  if (link.activeTest) return link.activeTest(pathname);
  const mode = link.match ?? 'exact';
  if (matchesOne(link.href, mode, pathname)) return true;
  return (link.altHrefs ?? []).some((href) => matchesOne(href, mode, pathname));
}

/** Ids of every group that contains the active link, at any depth. */
export function findActiveTrail(nodes: NavNode[], pathname: string | null): Set<string> {
  const trail = new Set<string>();

  function walk(list: NavNode[]): boolean {
    let found = false;
    for (const node of list) {
      if (node.kind === 'link') {
        if (isLinkActive(node, pathname)) found = true;
        continue;
      }
      if (walk(node.children)) {
        found = true;
        trail.add(node.id);
      }
    }
    return found;
  }

  walk(nodes);
  return trail;
}
