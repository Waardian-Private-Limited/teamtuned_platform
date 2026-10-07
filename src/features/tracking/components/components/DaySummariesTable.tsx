'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { kmText, minutesText } from '../../constants/tracking.constants';
import type { DayRowDto } from '../../types/tracking.dto';

interface DaySummariesTableProps {
  rows: DayRowDto[];
  date: string;
}

const th =
  'px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted whitespace-nowrap';

export function DaySummariesTable({ rows, date }: DaySummariesTableProps) {
  return (
    <div className="h-full overflow-auto tt-scrollbar">
      <table className="w-full min-w-[1050px] border-collapse text-xs sm:text-sm">
        <thead className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur-xs">
          <tr>
            <th className={th}>Employee</th>
            <th className={th}>Distance</th>
            <th className={th}>At site</th>
            <th className={th}>Away</th>
            <th className={th} title="Inside site boundary between check-in and check-out">
              At site after check-in
            </th>
            <th className={th} title="Outside site boundary between check-in and check-out">
              Away after check-in
            </th>
            <th className={th}>Moving</th>
            <th className={th}>Standing</th>
            <th className={th}>No signal / off</th>
            <th className={th}>Flags</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {rows.map((r) => {
            const hasFlags = r.flags && r.flags.length > 0;
            return (
              <tr
                key={r.employee_id}
                className="transition-colors hover:bg-bg-subtle/70"
              >
                {/* Employee Name & Code */}
                <td className="px-3.5 py-2.5">
                  <Link
                    href={`/org-admin/tracking/timeline?employee=${r.employee_id}&date=${date}`}
                    className="group inline-flex items-center gap-1.5 font-semibold text-fg hover:text-[var(--tt-primary)]"
                  >
                    <span>{r.name}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 text-fg-muted" />
                  </Link>
                  {r.employee_code && (
                    <div className="text-[11px] text-fg-muted font-mono">{r.employee_code}</div>
                  )}
                </td>

                {/* Total Distance */}
                <td className="px-3.5 py-2.5 font-medium text-fg whitespace-nowrap">
                  {kmText(r.distance_m)}
                </td>

                {/* At Site */}
                <td className="px-3.5 py-2.5 text-fg whitespace-nowrap">
                  {minutesText(r.site_minutes)}
                </td>

                {/* Away */}
                <td className="px-3.5 py-2.5 text-fg whitespace-nowrap">
                  {minutesText(r.outside_minutes)}
                </td>

                {/* At Site after check-in */}
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  <span className="font-semibold text-fg">
                    {minutesText(r.checked_in_site_minutes ?? 0)}
                  </span>
                </td>

                {/* Away after check-in */}
                <td className="px-3.5 py-2.5 text-fg whitespace-nowrap">
                  {minutesText(r.checked_in_outside_minutes ?? 0)}
                </td>

                {/* Moving */}
                <td className="px-3.5 py-2.5 text-fg-muted whitespace-nowrap">
                  {minutesText(r.moving_minutes)}
                </td>

                {/* Standing */}
                <td className="px-3.5 py-2.5 text-fg-muted whitespace-nowrap">
                  {minutesText(r.stationary_minutes)}
                </td>

                {/* No Signal / Off */}
                <td className="px-3.5 py-2.5 text-fg-muted whitespace-nowrap">
                  {minutesText(r.gap_minutes + r.gps_off_minutes)}
                </td>

                {/* Flags */}
                <td className="px-3.5 py-2.5">
                  {hasFlags ? (
                    <div className="flex flex-wrap gap-1">
                      {r.flags.map((f) => (
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
