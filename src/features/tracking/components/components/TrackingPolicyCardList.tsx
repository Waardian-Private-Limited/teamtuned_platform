'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { cx, text } from '@/theme/tokens';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import type { TrackingPolicyDto } from '../../types/tracking.dto';
import { TrackingPolicyRowActions } from './TrackingPolicyRowActions';

interface TrackingPolicyCardListProps {
  policies: TrackingPolicyDto[];
  canManage: boolean;
  onEdit: (policy: TrackingPolicyDto) => void;
  onClone: (policy: TrackingPolicyDto) => void;
  onDelete: (policy: TrackingPolicyDto) => void;
  onToggleStatus: (policy: TrackingPolicyDto) => void;
  togglingId?: number | null;
}

export function TrackingPolicyCardList({
  policies,
  canManage,
  onEdit,
  onClone,
  onDelete,
  onToggleStatus,
  togglingId,
}: TrackingPolicyCardListProps) {
  return (
    <>
      {policies.map((policy) => (
        <div key={policy.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={() => onEdit(policy)} className="min-w-0 text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="truncate text-sm font-medium text-fg">{policy.name}</span>
                <SubOrgBadge subOrgId={policy.sub_organization_id} />
                {policy.is_default && (
                  <span className="rounded-full border border-line bg-bg-subtle px-2 py-0.2 text-[10px] font-semibold text-fg-muted">
                    Default
                  </span>
                )}
              </div>
              {policy.description && (
                <div className={cx(text.caption, 'mt-1 line-clamp-2 text-fg-muted')}>
                  {policy.description}
                </div>
              )}
              <div className="mt-1 text-xs text-fg-muted">
                {policy.assigned ?? 0} employee{(policy.assigned ?? 0) === 1 ? '' : 's'} assigned
              </div>
            </button>
            <StatusPill
              label={policy.status === 'active' ? 'Active' : 'Archived'}
              tone={policy.status === 'active' ? 'active' : 'neutral'}
            />
          </div>

          <div className="mt-3 flex justify-end">
            <TrackingPolicyRowActions
              policy={policy}
              canManage={canManage}
              onEdit={onEdit}
              onClone={onClone}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
              isToggling={togglingId === policy.id}
            />
          </div>
        </div>
      ))}
    </>
  );
}
