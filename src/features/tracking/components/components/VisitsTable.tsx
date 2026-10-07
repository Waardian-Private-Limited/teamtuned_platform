'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import type { TripDto, TripStatus } from '../../types/tracking.dto';

interface VisitsTableProps {
  rows: TripDto[];
  onRowClick: (trip: TripDto) => void;
}

const th =
  'px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted whitespace-nowrap';

const TONE: Record<TripStatus, 'active' | 'inactive' | 'neutral'> = {
  approved: 'active',
  rejected: 'inactive',
  submitted: 'neutral',
  ended: 'neutral',
  active: 'neutral',
  auto_closed: 'neutral',
};

const km = (t: TripDto) =>
  t.approved_km ?? t.adjusted_km ?? t.claimed_km ?? t.gps_distance_m / 1000;

export function VisitsTable({ rows, onRowClick }: VisitsTableProps) {
  return (
    <div className="h-full overflow-auto tt-scrollbar">
      <table className="w-full min-w-[860px] border-collapse text-xs sm:text-sm">
        <thead className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur-xs">
          <tr>
            <th className={th}>Date</th>
            <th className={th}>Employee</th>
            <th className={th}>Vehicle</th>
            <th className={th}>Distance</th>
            <th className={th}>Amount</th>
            <th className={th}>Status</th>
            <th className={th}>Flags</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {rows.map((t) => {
            const hasFlags = t.flags && t.flags.length > 0;
            return (
              <tr
                key={t.id}
                onClick={() => onRowClick(t)}
                className="cursor-pointer transition-colors hover:bg-bg-subtle/70"
              >
                {/* Date */}
                <td className="px-3.5 py-2.5 font-medium text-fg whitespace-nowrap">
                  {t.work_date}
                </td>

                {/* Employee Name & Code */}
                <td className="px-3.5 py-2.5">
                  <div className="font-semibold text-fg">{t.employee_name}</div>
                  {t.employee_code && (
                    <div className="text-[11px] text-fg-muted font-mono">{t.employee_code}</div>
                  )}
                </td>

                {/* Vehicle */}
                <td className="px-3.5 py-2.5 text-fg whitespace-nowrap">
                  <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-medium text-fg">
                    {t.vehicle_label || 'Default'}
                  </span>
                </td>

                {/* Distance */}
                <td className="px-3.5 py-2.5 font-medium text-fg whitespace-nowrap">
                  {km(t).toFixed(1)} km
                  {t.claimed_km && t.claimed_km !== km(t) && (
                    <span className="ml-1 text-[11px] text-fg-muted">
                      (claimed: {t.claimed_km} km)
                    </span>
                  )}
                </td>

                {/* Amount */}
                <td className="px-3.5 py-2.5 font-semibold text-fg whitespace-nowrap">
                  {t.amount === null ? '-' : `₹${t.amount.toFixed(2)}`}
                </td>

                {/* Status */}
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  <StatusPill
                    label={t.status.replace('_', ' ')}
                    tone={TONE[t.status] || 'neutral'}
                  />
                </td>

                {/* Flags */}
                <td className="px-3.5 py-2.5">
                  {hasFlags ? (
                    <div className="flex flex-wrap gap-1">
                      {t.flags.map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                        >
                          {f.replaceAll('_', ' ')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-fg-muted">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
