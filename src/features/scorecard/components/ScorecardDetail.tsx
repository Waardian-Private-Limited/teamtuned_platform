'use client';

import { CalendarCheck, CalendarX, Clock, ListChecks, NotebookPen } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Avatar } from '@/features/attendance-dashboard/components/Avatar';
import { Skeleton } from '@/features/attendance-dashboard/components/Card';
import { bucketLabel, hoursText, numText, pctText, scoreText } from '@/features/attendance-insights/constants/insights.constants';
import { band, SECTION_LABELS } from '../constants/scorecard.constants';
import type { AverageCardDto, ScorecardPersonDto } from '../types/scorecard.dto';

type Fig = { label: string; value: number | null | undefined; text: (v: number | null) => string; avg?: number | null; higherIsBetter?: boolean };

/** Score out of 100 with its band; low scores are the only thing in red. */
export function ScoreBadge({ score, large }: { score: number | null | undefined; large?: boolean }) {
  const b = band(score ?? null);
  return (
    <span className={cx('inline-flex items-baseline gap-1.5 tabular-nums', b.risk ? 'text-[var(--tt-danger)]' : 'text-fg')}>
      <span className={cx('font-extrabold', large ? 'text-4xl' : 'text-sm')}>{scoreText(score ?? null)}</span>
      {large && <span className="text-sm font-semibold text-fg-muted">/ 100 · {b.label}</span>}
    </span>
  );
}

function Section({ icon: Icon, title, score, weight, figures, note }: {
  icon: typeof Clock; title: string; score?: number | null; weight?: number; figures: Fig[]; note?: string;
}) {
  return (
    <section className="rounded-xl border border-line p-3 sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg"><Icon className="h-4 w-4" /></span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-fg">{title}</h3>
            <p className="text-[11px] text-fg-muted">{weight !== undefined ? `${weight}% of the score` : 'Shown, not scored'}</p>
          </div>
        </div>
        {score !== undefined && <div className="text-right"><ScoreBadge score={score} /><p className="text-[11px] text-fg-muted">{score === null ? 'Too little to judge' : 'Section score'}</p></div>}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
        {figures.map((f) => {
          const v = f.value ?? null;
          const worse = f.higherIsBetter !== undefined && v !== null && f.avg !== null && f.avg !== undefined && v !== f.avg && (v > f.avg) !== f.higherIsBetter;
          return (
            <div key={f.label} className="min-w-0">
              <dt className="truncate text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{f.label}</dt>
              <dd className={cx('text-sm font-bold tabular-nums', worse ? 'text-[var(--tt-danger)]' : 'text-fg')}>
                {f.text(v)}
                {f.avg !== undefined && <span className="ml-1 text-[11px] font-medium text-fg-muted">avg {f.text(f.avg ?? null)}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
      {note && <p className="mt-3 text-[11px] text-fg-muted">{note}</p>}
    </section>
  );
}

const days = (v: number | null) => (v === null ? '—' : `${numText(v)}d`);
const count = (v: number | null) => numText(v);

/** One person's scorecard: score, each section with the average of their reach beside it, and the attendance trend. */
export function ScorecardDetail({ data, error }: { data: ScorecardPersonDto | null; error: string | null }) {
  if (error) return <p className="text-sm text-[var(--tt-danger)]">{error}</p>;
  if (!data) return <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;
  const c = data.card;
  const avg: AverageCardDto | null = data.compare?.department ?? data.compare?.everyone ?? null;
  const avgLabel = data.compare?.department ? 'department' : 'everyone in view';
  const a = c.attendance;
  const aa = avg?.attendance ?? null;
  const at = (v: number | null | undefined) => (avg ? v ?? null : undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar src={data.employee.photo_url ?? null} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-fg">{data.employee.name}</p>
          <p className="truncate text-xs text-fg-muted">{[data.employee.employee_code, data.employee.department, data.employee.site, data.employee.role].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Overall score</p>
          <ScoreBadge score={c.score} large />
          <p className="mt-1 text-xs text-fg-muted">
            {Object.entries(data.weights).map(([k, w]) => `${SECTION_LABELS[k as keyof typeof SECTION_LABELS]} ${w}%`).join(' · ')}
          </p>
        </div>
        {data.percentile && (
          <p className="text-sm text-fg-muted">{data.percentile.score === null ? 'No rank yet' : <>Above <strong className="text-fg">{data.percentile.score}%</strong> of {data.percentile.in_scope} people</>}</p>
        )}
      </div>
      {avg && <p className="-mt-2 text-[11px] text-fg-muted">Grey figures are the {avgLabel} average; red means worse than it.</p>}

      <Section icon={CalendarCheck} title="Attendance" score={a.score} weight={data.weights.attendance}
        note="Score: 70% attendance rate + 30% punctuality, once there are 3 working days."
        figures={[
          { label: 'Attendance', value: a.attendance_rate, text: pctText, avg: at(aa?.attendance_rate), higherIsBetter: true },
          { label: 'Punctuality', value: a.punctuality_rate, text: pctText, avg: at(aa?.punctuality_rate), higherIsBetter: true },
          { label: 'Present / expected', value: a.present_days, text: (v) => `${numText(v)} / ${a.expected_days}` },
          { label: 'Absent', value: a.absent_days, text: days, avg: at(aa?.absent_days), higherIsBetter: false },
          { label: 'Late', value: a.late_days, text: days, avg: at(aa?.late_days), higherIsBetter: false },
          { label: 'Late time', value: a.late_minutes, text: hoursText },
          { label: 'Hours worked', value: a.worked_minutes, text: hoursText, avg: at(aa?.worked_minutes) },
          { label: 'Overtime', value: a.overtime_minutes, text: hoursText, avg: at(aa?.overtime_minutes) },
          { label: 'Night OT', value: a.night_ot_minutes, text: hoursText },
          { label: 'Days off worked', value: a.off_day_days, text: days },
        ]} />

      {c.tasks && (
        <Section icon={ListChecks} title="Tasks" score={c.tasks.score} weight={data.weights.tasks}
          note={`Score: tasks finished on time ÷ (finished + overdue still open), once there are ${data.min_items}. Tasks raised from meetings count here.`}
          figures={[
            { label: 'Finished', value: c.tasks.done, text: count, avg: at(avg?.tasks?.done), higherIsBetter: true },
            { label: 'On time', value: c.tasks.on_time_rate, text: pctText, avg: at(avg?.tasks?.on_time_rate), higherIsBetter: true },
            { label: 'Finished late', value: c.tasks.done_late, text: count },
            { label: 'Overdue', value: c.tasks.overdue, text: count, avg: at(avg?.tasks?.overdue), higherIsBetter: false },
            { label: 'Open now', value: c.tasks.open, text: count },
            { label: 'Review rating', value: c.tasks.avg_rating, text: numText },
          ]} />
      )}

      {c.meetings && (
        <Section icon={NotebookPen} title="Meetings (MOM)" score={c.meetings.score} weight={data.weights.meetings}
          note="Score: 60% actions closed on time + 40% meetings attended."
          figures={[
            { label: 'Actions closed', value: c.meetings.actions_done, text: count },
            { label: 'Closed on time', value: c.meetings.action_on_time_rate, text: pctText, avg: at(avg?.meetings?.action_on_time_rate), higherIsBetter: true },
            { label: 'Overdue', value: c.meetings.actions_overdue, text: count, higherIsBetter: false, avg: at(avg?.meetings?.actions_overdue) },
            { label: 'Open now', value: c.meetings.actions_open, text: count },
            { label: 'Attended', value: c.meetings.meetings_attended, text: (v) => `${numText(v)} / ${c.meetings!.meetings_invited}` },
            { label: 'Attendance', value: c.meetings.attendance_rate, text: pctText, avg: at(avg?.meetings?.attendance_rate), higherIsBetter: true },
          ]} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Section icon={Clock} title="Comp-off" figures={[
          { label: 'Earned', value: c.comp_off.earned_days, text: days, avg: at(avg?.comp_off?.earned_days) },
          { label: 'Paid instead', value: c.comp_off.paid_days, text: days },
          { label: 'Pending', value: c.comp_off.pending_days, text: days },
        ]} />
        <Section icon={CalendarX} title="Leave" figures={[
          { label: 'Leave taken', value: c.leave.leave_days, text: days, avg: at(avg?.leave?.leave_days) },
          { label: 'Unplanned', value: c.leave.unplanned_days, text: days },
          { label: 'Loss of pay', value: c.leave.lop_days, text: days },
        ]} />
      </div>

      {data.trend.length > 1 && (
        <section className="rounded-xl border border-line p-3 sm:p-4">
          <h3 className="mb-3 text-sm font-bold text-fg">Attendance score over the period</h3>
          <div className="flex h-28 items-end gap-1" aria-label="Attendance score by period part">
            {data.trend.map((b) => (
              <div key={b.key} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${bucketLabel(data.unit, b.key)} · ${scoreText(b.consistency)}`}>
                <div className="flex h-20 w-full items-end justify-center">
                  <span className="w-full max-w-[14px] rounded-t bg-[var(--tt-primary)]" style={{ height: `${b.consistency ?? 0}%` }} />
                </div>
                <span className="truncate text-[10px] text-fg-muted">{bucketLabel(data.unit, b.key)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
