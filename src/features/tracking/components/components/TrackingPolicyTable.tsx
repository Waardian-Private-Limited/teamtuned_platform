'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { cx, text } from '@/theme/tokens';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import type { TrackingPolicyDto } from '../../types/tracking.dto';
import { TrackingPolicyRowActions } from './TrackingPolicyRowActions';

interface TrackingPolicyTableProps {
  policies: TrackingPolicyDto[];
  canManage: boolean;
  onEdit: (policy: TrackingPolicyDto) => void;
  onClone: (policy: TrackingPolicyDto) => void;
  onDelete: (policy: TrackingPolicyDto) => void;
  onToggleStatus: (policy: TrackingPolicyDto) => void;
  togglingId?: number | null;
}

const cellHeaderClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';

export function TrackingPolicyTable({
  policies,
  canManage,
  onEdit,
  onClone,
  onDelete,
  onToggleStatus,
  togglingId,
}: TrackingPolicyTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[520px] md:min-w-0 border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(cellHeaderClass, 'first:rounded-tl-xl')}>Policy</th>
            <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-40')}>Default</th>
            <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-40')}>Employees</th>
            <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-40')}>Status</th>
            <th className={cx(cellHeaderClass, 'w-32 sm:w-36 lg:w-40 2xl:w-48 text-right last:rounded-tr-xl')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <span className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(policy)}
                    className="text-left text-xs sm:text-sm 2xl:text-base font-semibold text-fg hover:text-[var(--tt-primary)] hover:underline"
                  >
                    {policy.name}
                  </button>
                  <SubOrgBadge subOrgId={policy.sub_organization_id} />
                </span>
                {policy.description && (
                  <div className={cx(text.caption, 'mt-0.5 max-w-xs truncate sm:max-w-sm lg:max-w-md 2xl:max-w-xl 2xl:text-sm')}>
                    {policy.description}
                  </div>
                )}
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                {policy.is_default ? (
                  <span className="inline-flex items-center rounded-full border border-line bg-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
                    Default
                  </span>
                ) : (
                  <span className="text-fg-subtle">—</span>
                )}
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted">
                  {policy.assigned ?? 0}
                </span>
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <StatusPill
                  label={policy.status === 'active' ? 'Active' : 'Archived'}
                  tone={policy.status === 'active' ? 'active' : 'neutral'}
                />
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <TrackingPolicyRowActions
                  policy={policy}
                  canManage={canManage}
                  onEdit={onEdit}
                  onClone={onClone}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                  isToggling={togglingId === policy.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
