'use client';

import { Users } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { cx, text } from '@/theme/tokens';
import type { OtherLocation } from '../../types/otherLocations.model';
import { OTHER_LOCATION_TYPE_LABELS } from '../../constants/otherLocations.constants';
import { OtherLocationRowActions } from './OtherLocationRowActions';

interface OtherLocationTableProps {
  locations: OtherLocation[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (location: OtherLocation) => void;
  onDelete: (location: OtherLocation) => void;
  onToggleStatus: (location: OtherLocation) => void;
  togglingId?: number | null;
}

const cellHeaderClass =
  'px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 2xl:px-6 text-left text-[11px] sm:text-xs 2xl:text-sm font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle';

export function TypeBadge({ type }: { type: OtherLocation['type'] }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-1.5 py-0.5 text-[10px] 2xl:text-xs font-semibold uppercase tracking-wide text-fg-muted">
      {OTHER_LOCATION_TYPE_LABELS[type]}
    </span>
  );
}

export function OtherLocationTable({
  locations,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
  togglingId,
}: OtherLocationTableProps) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[680px] lg:min-w-0 border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-bg-subtle">
          <tr>
            <th className={cx(cellHeaderClass, 'first:rounded-tl-xl')}>Location</th>
            <th className={cellHeaderClass}>Geofence</th>
            <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-40 2xl:w-48')}>Assigned</th>
            <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-44')}>Status</th>
            <th className={cx(cellHeaderClass, 'w-28 sm:w-32 lg:w-36 2xl:w-44 text-right last:rounded-tr-xl')}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((location) => (
            <tr key={location.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <div className="flex items-center gap-2">
                  <div className="text-xs sm:text-sm 2xl:text-base font-semibold text-fg">{location.name}</div>
                  <TypeBadge type={location.type} />
                </div>
                {location.address && <div className={cx(text.caption, 'mt-0.5 line-clamp-1')}>{location.address}</div>}
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <div className="text-xs sm:text-sm 2xl:text-base text-fg">
                  {location.latitude !== null && location.longitude !== null
                    ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                    : '—'}
                </div>
                <div className={cx(text.caption, 'mt-0.5')}>{location.radius}m radius</div>
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm 2xl:text-base text-fg">
                  <Users className="h-3.5 w-3.5 text-fg-subtle" />
                  {location.assignedCount}
                </span>
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <StatusPill label={location.status} tone={location.status} />
              </td>
              <td className="border-b border-line/60 px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 2xl:px-6 2xl:py-4">
                <OtherLocationRowActions
                  location={location}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                  isToggling={togglingId === location.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
