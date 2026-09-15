import type { NavContext, NavGate, NavNode } from '../types/nav.model';

function hasPerm(ctx: NavContext, code: string): boolean {
  const target = code.toUpperCase();
  return ctx.permissions.some((p) => (p || '').toUpperCase() === target);
}

function hasAnyPerm(ctx: NavContext, codes: string[]): boolean {
  return codes.some((c) => hasPerm(ctx, c));
}

function hasPermPrefix(ctx: NavContext, prefix: string): boolean {
  const target = prefix.toUpperCase();
  return ctx.permissions.some((p) => (p || '').toUpperCase().startsWith(target));
}

function hasFeature(ctx: NavContext, code: string): boolean {
  if (!ctx.features) return false;
  return ctx.features.includes(code);
}

/**
 * Evaluates one gate. An absent gate always passes — most links have none
 * and simply inherit whatever their parent group already decided.
 */
export function passesGate(ctx: NavContext, gate: NavGate | undefined): boolean {
  if (!gate) return true;
  if (gate.feature && !hasFeature(ctx, gate.feature)) return false;

  const bypass = gate.orgAdminBypass !== false && ctx.isOrgAdmin;
  if (bypass) return true;

  if (gate.perm && !hasPerm(ctx, gate.perm)) return false;
  if (gate.anyPerm && !hasAnyPerm(ctx, gate.anyPerm)) return false;
  if (gate.permPrefix && !hasPermPrefix(ctx, gate.permPrefix)) return false;
  return true;
}

/**
 * Filters a nav tree for one user. A group survives only if its own gate
 * passes AND at least one child survives — so a permission grant that opens
 * no items in a section no longer leaves a dead, empty header behind (the
 * legacy sidebars could show an empty "Main" section header in exactly this
 * situation; see org.nav.ts / employee.nav.ts for the gates this replaces).
 */
export function filterNav(nodes: NavNode[], ctx: NavContext): NavNode[] {
  const result: NavNode[] = [];
  for (const node of nodes) {
    if (!passesGate(ctx, node.gate)) continue;
    if (node.kind === 'link') {
      result.push(node);
      continue;
    }
    const children = filterNav(node.children, ctx);
    if (children.length === 0) continue;
    result.push({ ...node, children });
  }
  return result;
}
