'use client';

import { Users } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { cx, text } from '@/theme/tokens';
import type { OtherLocation } from '../../types/otherLocations.model';
import { OtherLocationRowActions } from './OtherLocationRowActions';
import { TypeBadge } from './OtherLocationTable';

interface OtherLocationCardListProps {
  locations: OtherLocation[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (location: OtherLocation) => void;
  onDelete: (location: OtherLocation) => void;
  onToggleStatus: (location: OtherLocation) => void;
  togglingId?: number | null;
}

export function OtherLocationCardList({
  locations,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
  togglingId,
}: OtherLocationCardListProps) {
  return (
    <>
      {locations.map((location) => (
        <div key={location.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="truncate text-sm font-medium text-fg">{location.name}</div>
                <TypeBadge type={location.type} />
              </div>
              <div className={cx(text.caption, 'mt-0.5')}>
                {location.address ? <>{location.address} · </> : null}
                {location.radius}m radius
              </div>
            </div>
            <StatusPill label={location.status} tone={location.status} />
          </div>

          <div className={cx(text.caption, 'mt-2 flex items-center gap-1.5')}>
            <Users className="h-3.5 w-3.5 text-fg-subtle" />
            {location.assignedCount} assigned
          </div>

          <div className="mt-3 flex justify-end">
            <OtherLocationRowActions
              location={location}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
              isToggling={togglingId === location.id}
            />
          </div>
        </div>
      ))}
    </>
  );
}
