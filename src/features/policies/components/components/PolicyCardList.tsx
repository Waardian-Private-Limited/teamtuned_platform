'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { cx, text } from '@/theme/tokens';
import type { Policy } from '../../types/policies.model';
import { PolicyRowActions } from './PolicyRowActions';

interface PolicyCardListProps {
  policies: Policy[];
  canEdit: boolean;
  canAdd: boolean;
  canDelete: boolean;
  onEdit: (policy: Policy) => void;
  onClone: (policy: Policy) => void;
  onDelete: (policy: Policy) => void;
  onToggleStatus: (policy: Policy) => void;
  togglingId?: number | null;
}

export function PolicyCardList({ policies, canEdit, canAdd, canDelete, onEdit, onClone, onDelete, onToggleStatus, togglingId }: PolicyCardListProps) {
  return (
    <>
      {policies.map((policy) => (
        <div key={policy.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={() => onEdit(policy)} className="min-w-0 text-left">
              <div className="truncate text-sm font-medium text-fg">{policy.name}</div>
              <div className={cx(text.caption, 'mt-0.5')}>
                <code>{policy.code}</code>
              </div>
            </button>
            <StatusPill label={policy.status} tone={policy.status === 'active' ? 'active' : 'inactive'} />
          </div>

          <div className="mt-3 flex justify-end">
            <PolicyRowActions
              policy={policy}
              canEdit={canEdit}
              canAdd={canAdd}
              canDelete={canDelete}
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
