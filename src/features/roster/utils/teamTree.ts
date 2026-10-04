import type { RosterUnit } from '../types/roster.types';

export function descendantIdsOf(units: RosterUnit[], id: number): Set<number> {
  const out = new Set<number>();
  const walk = (parent: number) => {
    for (const u of units) {
      if (u.parent_unit_id === parent && !out.has(u.id)) {
        out.add(u.id);
        walk(u.id);
      }
    }
  };
  walk(id);
  return out;
}

export function parentChoices(units: RosterUnit[], subOrgId: number | null, selfId: number | null): { value: number; label: string }[] {
  const blocked = selfId ? descendantIdsOf(units, selfId) : new Set<number>();
  return units
    .filter((u) => u.id !== selfId && !blocked.has(u.id) && (u.sub_organization_id ?? null) === (subOrgId ?? null))
    .map((u) => ({ value: u.id, label: `${'— '.repeat(u.depth)}${u.name}` }));
}

import { APPROVAL_LEVEL_LABELS } from '../constants/roster.constants';
import type { ApprovalLevel } from '../types/roster.types';

export function describeChain(chain: ApprovalLevel[], nameOf?: (id: number) => string | undefined): string {
  if (!chain.length) return 'No approval needed';
  return chain
    .map((l) => (l.type === 'employee' && l.employeeId ? nameOf?.(l.employeeId) ?? 'A specific person' : APPROVAL_LEVEL_LABELS[l.type] ?? l.type))
    .join('  →  ');
}
