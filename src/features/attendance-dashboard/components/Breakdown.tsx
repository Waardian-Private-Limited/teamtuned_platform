'use client';

import { useState } from 'react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { pctText } from '../constants/dashboard.constants';
import type { BreakdownRowDto } from '../types/dashboard.dto';
import { Card, Skeleton } from './Card';

type By = 'department' | 'site';

/** Attendance by department or by site, largest first, each with a rate meter. */
export function Breakdown({ byDepartment, bySite, loading }: { byDepartment: BreakdownRowDto[] | null; bySite: BreakdownRowDto[] | null; loading: boolean }) {
  const [by, setBy] = useState<By>('department');
  const rows = (by === 'department' ? byDepartment : bySite) ?? [];
  const unnamed = by === 'department' ? 'No department' : 'No site';
  return (
    <Card title="Breakdown" subtitle="Who came, by group" action={<SegmentedControl<By> options={[{ value: 'department', label: 'Department' }, { value: 'site', label: 'Site' }]} value={by} onChange={setBy} className="w-52" />}>
      {loading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-fg-muted">Nothing to break down for these filters.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                <th className="px-1 pb-2">{by === 'department' ? 'Department' : 'Site'}</th>
                <th className="px-1 pb-2 text-right">People</th>
                <th className="px-1 pb-2 text-right">Present</th>
                <th className="px-1 pb-2 text-right">Late</th>
                <th className="px-1 pb-2 text-right">Not in</th>
                <th className="w-40 px-1 pb-2">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.slice(0, 12).map((r) => (
                <tr key={r.id ?? 'none'}>
                  <td className="max-w-[14rem] truncate px-1 py-2.5 font-semibold text-fg">{r.name || unnamed}</td>
                  <td className="px-1 py-2.5 text-right tabular-nums text-fg-muted">{r.headcount}</td>
                  <td className="px-1 py-2.5 text-right tabular-nums text-fg">{r.present}</td>
                  <td className="px-1 py-2.5 text-right tabular-nums text-fg">{r.late}</td>
                  <td className="px-1 py-2.5 text-right tabular-nums text-fg">{r.absent}</td>
                  <td className="px-1 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-subtle"><div className="h-full rounded-full bg-[var(--tt-primary)]" style={{ width: `${Math.min(100, r.attendance_rate ?? 0)}%` }} /></div>
                      <span className="w-12 text-right text-xs font-bold tabular-nums text-fg">{pctText(r.attendance_rate)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 12 && <p className="mt-2 text-xs text-fg-muted">Showing the 12 largest of {rows.length}. Pick one in the filters to see it alone.</p>}
        </div>
      )}
    </Card>
  );
}
