'use client';

import { ChevronRight } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import type { TripDto, TripStatus } from '../../types/tracking.dto';

interface VisitCardListProps {
  rows: TripDto[];
  onRowClick: (trip: TripDto) => void;
}

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

export function VisitCardList({ rows, onRowClick }: VisitCardListProps) {
  return (
    <div className="divide-y divide-line/70">
      {rows.map((t) => {
        const hasFlags = t.flags && t.flags.length > 0;
        return (
          <div
            key={t.id}
            onClick={() => onRowClick(t)}
            className="p-3.5 space-y-2 cursor-pointer transition-colors hover:bg-bg-subtle/50 active:bg-bg-subtle"
          >
            {/* Top row: Employee Name & Date */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm text-fg flex items-center gap-1">
                  <span>{t.employee_name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-fg-muted" />
                </div>
                <div className="text-[11px] text-fg-muted">
                  {t.work_date} {t.employee_code && `· ${t.employee_code}`}
                </div>
              </div>
              <StatusPill
                label={t.status.replace('_', ' ')}
                tone={TONE[t.status] || 'neutral'}
              />
            </div>

            {/* Metrics row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="inline-flex items-center rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-fg">
                {t.vehicle_label || 'Vehicle'} · {km(t).toFixed(1)} km
              </span>
              <span className="font-bold text-fg text-sm">
                {t.amount === null ? '-' : `₹${t.amount.toFixed(2)}`}
              </span>
            </div>

            {/* Flags */}
            {hasFlags && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {t.flags.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                  >
                    {f.replaceAll('_', ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
