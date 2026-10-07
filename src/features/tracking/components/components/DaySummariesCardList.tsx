'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { kmText, minutesText } from '../../constants/tracking.constants';
import type { DayRowDto } from '../../types/tracking.dto';

interface DaySummariesCardListProps {
  rows: DayRowDto[];
  date: string;
}

export function DaySummariesCardList({ rows, date }: DaySummariesCardListProps) {
  return (
    <div className="divide-y divide-line/70">
      {rows.map((r) => {
        const hasFlags = r.flags && r.flags.length > 0;
        return (
          <div key={r.employee_id} className="p-3.5 space-y-2.5 transition-colors hover:bg-bg-subtle/50">
            {/* Top row: Name & Timeline link */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/org-admin/tracking/timeline?employee=${r.employee_id}&date=${date}`}
                  className="font-semibold text-sm text-fg hover:text-[var(--tt-primary)] flex items-center gap-1"
                >
                  <span>{r.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-fg-muted" />
                </Link>
                {r.employee_code && (
                  <span className="text-[11px] font-mono text-fg-muted">{r.employee_code}</span>
                )}
              </div>
              <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg">
                {kmText(r.distance_m)}
              </span>
            </div>

            {/* Key stats row */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-line/60 bg-surface/50 p-2">
                <div className="text-[11px] text-fg-muted">At Site</div>
                <div className="font-semibold text-fg mt-0.5">{minutesText(r.site_minutes)}</div>
                <div className="text-[10px] text-fg-subtle mt-0.5">
                  Checked-in: {minutesText(r.checked_in_site_minutes ?? 0)}
                </div>
              </div>

              <div className="rounded-lg border border-line/60 bg-surface/50 p-2">
                <div className="text-[11px] text-fg-muted">Away</div>
                <div className="font-semibold text-fg mt-0.5">{minutesText(r.outside_minutes)}</div>
                <div className="text-[10px] text-fg-subtle mt-0.5">
                  Checked-in: {minutesText(r.checked_in_outside_minutes ?? 0)}
                </div>
              </div>
            </div>

            {/* Sub stats row */}
            <div className="flex items-center justify-between text-[11px] text-fg-muted pt-0.5 px-0.5">
              <span>Moving: <strong className="text-fg">{minutesText(r.moving_minutes)}</strong></span>
              <span>Standing: <strong className="text-fg">{minutesText(r.stationary_minutes)}</strong></span>
              <span>No signal: <strong className="text-fg">{minutesText(r.gap_minutes + r.gps_off_minutes)}</strong></span>
            </div>

            {/* Flags */}
            {hasFlags && (
              <div className="flex flex-wrap gap-1 pt-1">
                {r.flags.map((f) => (
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
