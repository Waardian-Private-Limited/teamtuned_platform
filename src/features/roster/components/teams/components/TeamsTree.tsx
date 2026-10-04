'use client';

import { CornerDownRight } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import type { RosterUnit } from '../../../types/roster.types';
import { TeamRowActions } from './TeamRowActions';

interface Props {
  units: RosterUnit[];
  canEdit: boolean;
  canDelete: boolean;
  busyId: number | null;
  onEdit: (u: RosterUnit) => void;
  onToggle: (u: RosterUnit) => void;
  onDelete: (u: RosterUnit) => void;
}

function membersLabel(u: RosterUnit) {
  const chosen = u.include_count ?? 0;
  return chosen > 0 ? `${chosen} chosen` : 'By filters';
}

function subTeams(u: RosterUnit) {
  const n = u.child_count ?? 0;
  return n === 0 ? '—' : n === 1 ? '1 sub-team' : `${n} sub-teams`;
}

export function TeamsTree({ units, canEdit, canDelete, busyId, onEdit, onToggle, onDelete }: Props) {
  const actions = (u: RosterUnit) => (
    <TeamRowActions unit={u} canEdit={canEdit} canDelete={canDelete} busy={busyId === u.id} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
  );
  const status = (u: RosterUnit) => <StatusPill label={u.status} tone={u.status === 'active' ? 'active' : 'inactive'} />;

  return (
    <>
      <div className="hidden min-h-0 flex-1 overflow-y-auto md:block">
        <div className="sticky top-0 z-[1] grid grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_110px_120px] gap-3 border-b border-line bg-bg-subtle px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          <span>Team</span><span>Sub-organization</span><span>People</span><span>Sub-teams</span><span>Status</span><span />
        </div>
        <ul className="divide-y divide-line/70">
          {units.map((u) => (
            <li key={u.id} className="grid grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_110px_120px] items-center gap-3 px-5 py-3 transition-colors hover:bg-bg-subtle/60">
              <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${Math.min(u.depth, 6) * 22}px` }}>
                {u.depth > 0 && <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />}
                <div className="min-w-0">
                  <button type="button" onClick={() => canEdit && onEdit(u)} className="block max-w-full truncate text-left text-sm font-semibold text-fg hover:underline">
                    {u.name}
                  </button>
                  {u.description && <p className="truncate text-[11px] text-fg-muted">{u.description}</p>}
                </div>
              </div>
              <div><SubOrgBadge subOrgId={u.sub_organization_id} /></div>
              <span className="text-sm text-fg">{membersLabel(u)}</span>
              <span className="text-sm text-fg-muted">{subTeams(u)}</span>
              <div>{status(u)}</div>
              {actions(u)}
            </li>
          ))}
        </ul>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto md:hidden">
        {units.map((u) => (
          <li key={u.id} className="px-4 py-3" style={{ paddingLeft: `${16 + Math.min(u.depth, 4) * 14}px` }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                  {u.depth > 0 && <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />}
                  <span className="truncate">{u.name}</span>
                </p>
                <p className="mt-0.5 text-xs text-fg-muted">{membersLabel(u)} · {subTeams(u)}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {status(u)}
                  <SubOrgBadge subOrgId={u.sub_organization_id} />
                </div>
              </div>
              {actions(u)}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
