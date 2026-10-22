'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Award, CalendarRange } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { cx } from '@/theme/tokens';
import { Avatar } from '@/features/attendance-dashboard/components/Avatar';
import { Skeleton } from '@/features/attendance-dashboard/components/Card';
import { bucketLabel, hoursText, numText, pctText, periodTitle, rangeText, scoreText } from '../constants/insights.constants';
import type { AverageDto, EmployeeInsightsDto, InsightDayDto } from '../types/insights.dto';

type Key = 'consistency' | 'attendance_rate' | 'punctuality_rate' | 'absent_days' | 'late_days' | 'overtime_minutes' | 'night_ot_minutes' | 'off_day_days';
const ROWS: Array<{ key: Key; label: string; text: (v: number | null) => string; higherIsBetter: boolean }> = [
  { key: 'consistency', label: 'Consistency', text: scoreText, higherIsBetter: true },
  { key: 'attendance_rate', label: 'Attendance', text: pctText, higherIsBetter: true },
  { key: 'punctuality_rate', label: 'Punctuality', text: pctText, higherIsBetter: true },
  { key: 'absent_days', label: 'Absent days', text: numText, higherIsBetter: false },
  { key: 'late_days', label: 'Late days', text: numText, higherIsBetter: false },
  { key: 'overtime_minutes', label: 'Overtime', text: hoursText, higherIsBetter: true },
  { key: 'night_ot_minutes', label: 'Night OT', text: hoursText, higherIsBetter: true },
  { key: 'off_day_days', label: 'Days off worked', text: numText, higherIsBetter: true },
];

/** How one stored day reads in the strip: shade, label. Absence is the only colour. */
function dayLook(d: InsightDayDto): { cls: string; label: string } {
  if (d.off_day_work) return { cls: 'bg-[var(--tt-primary)] ring-2 ring-offset-1 ring-[var(--tt-border-strong)] ring-offset-[var(--tt-surface)]', label: 'Worked on a day off' };
  if (d.status === 'Present') return { cls: 'bg-[var(--tt-primary)]', label: d.late ? 'Present, late' : 'Present' };
  if (d.status === 'Half-Day') return { cls: 'bg-[color-mix(in_srgb,var(--tt-primary)_45%,var(--tt-surface))]', label: 'Half day' };
  if (d.status === 'Absent') return { cls: 'bg-[var(--tt-danger)]', label: 'Absent' };
  if (d.status === 'Leave') return { cls: 'bg-[var(--tt-border-strong)]', label: 'Leave' };
  if (d.status === 'Holiday' || d.status === 'Weekend') return { cls: 'border border-line bg-bg-subtle', label: d.status === 'Holiday' ? 'Holiday' : 'Week off' };
  return { cls: 'border border-dashed border-line', label: d.status === 'In-Progress' ? 'In progress' : 'Not scheduled' };
}

function Strip({ days }: { days: InsightDayDto[] }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {days.map((d) => {
          const look = dayLook(d);
          return (
            <span key={d.date} title={`${rangeText(d.date, d.date)} · ${look.label}${d.late ? ` · ${d.late_minutes}m late` : ''}${d.worked_minutes ? ` · ${hoursText(d.worked_minutes)} worked` : ''}${d.night_ot_minutes ? ` · ${hoursText(d.night_ot_minutes)} night OT` : ''}`}
              className={cx('relative h-5 w-5 rounded', look.cls)}>
              {d.late && d.status !== 'Absent' && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[var(--tt-surface)] bg-[var(--tt-warning)]" />}
            </span>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-fg-muted">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--tt-primary)]" /> Present</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[color-mix(in_srgb,var(--tt-primary)_45%,var(--tt-surface))]" /> Half day</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--tt-danger)]" /> Absent</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--tt-border-strong)]" /> Leave</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-line bg-bg-subtle" /> Off</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--tt-warning)]" /> Late</span>
      </div>
    </div>
  );
}

function Compare({ data }: { data: EmployeeInsightsDto }) {
  const cols: Array<{ title: string; avg: AverageDto | null }> = [
    { title: data.compare.department ? 'Dept avg' : 'Dept', avg: data.compare.department },
    { title: data.compare.site ? 'Site avg' : 'Site', avg: data.compare.site },
    { title: 'All avg', avg: data.compare.everyone },
  ];
  const mine = data.figures as unknown as Record<Key, number | null>;
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead className="bg-bg-subtle">
          <tr>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted"> </th>
            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-fg">This person</th>
            {cols.map((c) => <th key={c.title} className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const v = mine[r.key];
            const ref = data.compare.department?.[r.key] ?? null;
            const better = v !== null && ref !== null && v !== ref ? (v > ref) === r.higherIsBetter : null;
            return (
              <tr key={r.key} className="border-t border-line">
                <td className="px-3 py-2 text-fg-muted">{r.label}</td>
                <td className={cx('px-3 py-2 text-right font-bold tabular-nums', better === false ? 'text-[var(--tt-danger)]' : 'text-fg')}>{r.text(v)}</td>
                {cols.map((c) => <td key={c.title} className="px-3 py-2 text-right tabular-nums text-fg-muted">{c.avg ? r.text(c.avg[r.key]) : '—'}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MiniTrend({ data }: { data: EmployeeInsightsDto }) {
  const max = Math.max(1, ...data.trend.map((b) => b.overtime_minutes + b.night_ot_minutes));
  return (
    <div className="flex h-28 items-end gap-1" aria-label="Consistency and overtime by bucket">
      {data.trend.map((b) => {
        const ot = b.overtime_minutes + b.night_ot_minutes;
        return (
          <div key={b.key} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${bucketLabel(data.unit, b.key)} · consistency ${scoreText(b.consistency)} · ${hoursText(ot)} overtime incl. night`}>
            <div className="flex h-20 w-full items-end justify-center gap-0.5">
              <span className="w-1/2 max-w-[10px] rounded-t bg-[var(--tt-primary)]" style={{ height: `${b.consistency ?? 0}%` }} />
              <span className="w-1/2 max-w-[10px] rounded-t bg-[var(--tt-border-strong)]" style={{ height: `${(ot / max) * 100}%` }} />
            </div>
            <span className="truncate text-[10px] text-fg-muted">{bucketLabel(data.unit, b.key)}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * One person's review sheet for the period: figures, how they compare, where they rank, their
 * days, and the latest released performance rating. Opens their detailed attendance month.
 */
export function PersonDrawer({ open, onClose, data, error }: { open: boolean; onClose: () => void; data: EmployeeInsightsDto | null; error: string | null }) {
  const pathname = usePathname();
  const area = pathname.startsWith('/org-admin') ? '/org-admin/attendance/employee' : '/employee/attendance';
  const monthOf = data ? (data.to.slice(0, 7)) : '';
  return (
    <Drawer open={open} onClose={onClose} title="Employee insights" maxWidthClassName="sm:max-w-2xl">
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {error ? <p className="text-sm text-[var(--tt-danger)]">{error}</p> : !data ? (
          <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-28" /><Skeleton className="h-56" /></div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Avatar src={data.employee.photo_url ?? null} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-fg">{data.employee.name}</p>
                <p className="truncate text-xs text-fg-muted">{[data.employee.employee_code, data.employee.department, data.employee.site, data.employee.role].filter(Boolean).join(' · ')}</p>
              </div>
              <Link href={`${area}/${data.employee.employee_id}?month=${monthOf}`} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-bold text-fg transition-colors hover:bg-bg-subtle">
                <CalendarRange className="h-4 w-4" /> <span className="hidden sm:inline">Attendance</span>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Consistency', value: scoreText(data.figures.consistency), pct: data.percentile.consistency },
                { label: 'Attendance', value: pctText(data.figures.attendance_rate), pct: data.percentile.attendance_rate },
                { label: 'Overtime', value: hoursText(data.figures.overtime_minutes), pct: data.percentile.overtime_minutes },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-line p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{k.label}</p>
                  <p className="mt-1 text-2xl font-extrabold text-fg tabular-nums">{k.value}</p>
                  <p className="mt-0.5 text-[11px] text-fg-muted">{k.pct === null ? 'No rank yet' : `Above ${k.pct}% of ${data.percentile.in_scope}`}</p>
                </div>
              ))}
            </div>

            {data.performance !== undefined && (
              <div className="flex items-start gap-3 rounded-xl border border-line p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg"><Award className="h-4 w-4" /></span>
                <div className="min-w-0 text-sm">
                  {data.performance.latest ? (
                    <>
                      <p className="font-bold text-fg">Rating {data.performance.latest.band}{data.performance.latest.score !== null && <span className="font-semibold text-fg-muted"> · score {Math.round(data.performance.latest.score)}</span>}</p>
                      <p className="text-xs text-fg-muted">Latest released rating · {data.performance.latest.cycle_name}</p>
                    </>
                  ) : <p className="text-fg-muted">No performance rating released yet.</p>}
                  <p className="mt-1 text-xs text-fg-muted">Attendance KPIs (consistency, punctuality, overtime, night OT, days off worked) can feed this rating, and ratings feed increments.</p>
                </div>
              </div>
            )}

            <section>
              <h3 className="mb-2 text-sm font-bold text-fg">Compared with</h3>
              <Compare data={data} />
            </section>

            <section>
              <h3 className="mb-1 text-sm font-bold text-fg">{periodTitle(data.period, data.period_from, data.period_to, data.year_start)}</h3>
              <p className="mb-3 text-xs text-fg-muted">Dark bars: consistency. Grey bars: overtime incl. night OT.</p>
              <MiniTrend data={data} />
            </section>

            {data.days && data.days.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-bold text-fg">Days</h3>
                <Strip days={data.days} />
              </section>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
