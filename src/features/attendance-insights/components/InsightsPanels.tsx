'use client';

import { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlarmClock, CalendarCheck2, Clock4, Moon, Sun, UserCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cx } from '@/theme/tokens';
import { Avatar } from '@/features/attendance-dashboard/components/Avatar';
import { Card, Skeleton } from '@/features/attendance-dashboard/components/Card';
import { BOARD_META, BOARD_ORDER, boardValueText, bucketLabel, bucketTitle, hoursText, numText, pctText, scoreText } from '../constants/insights.constants';
import type { BoardDto, BucketUnit, FiguresDto, InsightsDto, PerHeadDto, TrendBucketDto } from '../types/insights.dto';

function Tile({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)]">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg"><Icon className="h-4 w-4" /></span>
        <span className="truncate text-xs font-semibold text-fg-muted">{label}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-extrabold leading-none text-fg tabular-nums">{value}</div>
        {note && <div className="mt-1.5 truncate text-xs text-fg-muted">{note}</div>}
      </div>
    </div>
  );
}

/** Consistency as the one big figure, then the rates and hours behind it. */
export function InsightKpis({ totals, headcount, formula, loading }: { totals: (FiguresDto & PerHeadDto) | null; headcount: number; formula: InsightsDto['formula'] | null; loading: boolean }) {
  if (loading || !totals) {
    return (
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
        <Skeleton className="h-[164px] rounded-xl" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}</div>
      </div>
    );
  }
  const t = totals;
  const w = formula?.consistency_weights;
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
      <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-[var(--tt-shadow-sm)]">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Consistency score
            {w && (
              <span title={`${Math.round(w.attendance * 100)}% attendance rate + ${Math.round(w.punctuality * 100)}% punctuality, out of 100. People with fewer than ${formula!.min_expected_days} working days expected get no score.`}
                className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-line text-[10px] font-bold normal-case text-fg-muted">i</span>
            )}
          </p>
          <p className="mt-2 text-5xl font-extrabold leading-none text-fg tabular-nums">{scoreText(t.consistency)}<span className="text-xl text-fg-muted">{t.consistency === null ? '' : ' / 100'}</span></p>
          <p className="mt-2 text-sm text-fg-muted">{w ? `${Math.round(w.attendance * 100)}% attendance + ${Math.round(w.punctuality * 100)}% punctuality` : ''}</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg-subtle" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={t.consistency ?? 0} aria-label="Consistency score">
          <div className="h-full rounded-full bg-[var(--tt-primary)] transition-[width] duration-500" style={{ width: `${Math.min(100, t.consistency ?? 0)}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tile icon={UserCheck} label="Attendance rate" value={pctText(t.attendance_rate)} note={`${numText(t.present_working_units)} of ${t.expected_days} working days`} />
        <Tile icon={AlarmClock} label="Punctuality" value={pctText(t.punctuality_rate)} note={`${t.late_days} late ${t.late_days === 1 ? 'day' : 'days'} · ${t.absent_days} absent`} />
        <Tile icon={Clock4} label="Overtime" value={hoursText(t.overtime_minutes)} note={headcount ? `${hoursText(t.overtime_minutes_per_head)} per person` : undefined} />
        <Tile icon={Moon} label="Night overtime" value={hoursText(t.night_ot_minutes)} note={`${t.night_ot_days} ${t.night_ot_days === 1 ? 'night' : 'nights'}`} />
        <Tile icon={CalendarCheck2} label="Days off worked" value={numText(t.off_day_days)} note={`${hoursText(t.off_day_minutes)} on week offs and holidays`} />
        <Tile icon={Sun} label="Hours worked" value={hoursText(t.worked_minutes)} note={`${numText(t.leave_days)} leave days`} />
      </div>
    </div>
  );
}

type TrendMetric = 'consistency' | 'attendance_rate' | 'overtime' | 'night_ot' | 'off_day' | 'late';
const TREND: Record<TrendMetric, { label: string; title: string; kind: 'rate' | 'bar'; value: (b: TrendBucketDto) => number | null; text: (v: number | null) => string }> = {
  consistency: { label: 'Consistency', title: 'Consistency score', kind: 'rate', value: (b) => b.consistency, text: scoreText },
  attendance_rate: { label: 'Attendance', title: 'Attendance rate', kind: 'rate', value: (b) => b.attendance_rate, text: pctText },
  overtime: { label: 'Overtime', title: 'Overtime hours', kind: 'bar', value: (b) => Math.round((b.overtime_minutes / 60) * 10) / 10, text: (v) => (v === null ? '—' : `${v}h`) },
  night_ot: { label: 'Night OT', title: 'Night overtime hours', kind: 'bar', value: (b) => Math.round((b.night_ot_minutes / 60) * 10) / 10, text: (v) => (v === null ? '—' : `${v}h`) },
  off_day: { label: 'Days off', title: 'Week offs and holidays worked', kind: 'bar', value: (b) => b.off_day_days, text: numText },
  late: { label: 'Late', title: 'Late days', kind: 'bar', value: (b) => b.late_days, text: numText },
};
const TREND_OPTIONS = (Object.keys(TREND) as TrendMetric[]).map((k) => ({ value: k, label: TREND[k].label }));

/** One figure across the period's buckets (days, weeks or months); one series, so the title names it. */
export function TrendPanel({ trend, unit, loading }: { trend: TrendBucketDto[] | null; unit: BucketUnit | null; loading: boolean }) {
  const [metric, setMetric] = useState<TrendMetric>('consistency');
  const m = TREND[metric];
  const data = (trend ?? []).map((b) => ({ ...b, v: m.value(b) }));
  const empty = !loading && data.every((p) => !p.v);
  const per = unit === 'month' ? 'month' : unit === 'week' ? 'week' : 'day';
  return (
    <Card title={`${m.title}, by ${per}`} subtitle="Pick what to follow across the period"
      action={<div className="w-full max-w-full overflow-x-auto sm:w-auto"><SegmentedControl fitText options={TREND_OPTIONS} value={metric} onChange={setMetric} /></div>}>
      {loading || !unit ? <Skeleton className="h-64 w-full" /> : empty ? (
        <p className="flex h-64 items-center justify-center text-sm text-fg-muted">Nothing recorded for this in the period.</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke="var(--tt-border)" />
              <XAxis dataKey="key" tickFormatter={(k: string) => bucketLabel(unit, k)} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
              <YAxis domain={m.kind === 'rate' ? [0, 100] : [0, 'auto']} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} width={44} allowDecimals={m.kind !== 'bar' || metric === 'overtime' || metric === 'night_ot'} />
              <Tooltip cursor={{ fill: 'var(--tt-bg-subtle)' }} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as TrendBucketDto & { v: number | null };
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--tt-shadow-md)]">
                    <p className="font-bold text-fg">{bucketTitle(unit, p.from, p.to)}</p>
                    <p className="mt-1 text-fg"><strong className="text-sm">{m.text(p.v)}</strong> {m.label.toLowerCase()}</p>
                    <p className="mt-1 tabular-nums text-fg-muted">{pctText(p.attendance_rate)} attendance · {p.absent_days} absent · {p.late_days} late</p>
                  </div>
                );
              }} />
              {m.kind === 'rate'
                ? <Line type="monotone" dataKey="v" stroke="var(--tt-primary)" strokeWidth={2} dot={data.length <= 14 ? { r: 3, fill: 'var(--tt-primary)' } : false} connectNulls isAnimationActive={false} />
                : <Bar dataKey="v" fill="var(--tt-primary)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/** The boards: top five each, a row opens that person. */
export function InsightBoards({ boards, loading, onOpen }: { boards: BoardDto[] | null; loading: boolean; onOpen: (employeeId: number) => void }) {
  const byKey = new Map((boards ?? []).map((b) => [b.key, b]));
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {BOARD_ORDER.map((key) => {
        const meta = BOARD_META[key];
        const b = byKey.get(key);
        return (
          <section key={key} className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-4 shadow-[var(--tt-shadow-sm)]">
            <header className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className={cx('text-sm font-bold', meta.risk ? 'text-[var(--tt-danger)]' : 'text-fg')}>{meta.title}</h3>
                <p className="text-xs text-fg-muted">{meta.measure}</p>
              </div>
              {b && <span className="shrink-0 rounded-md border border-line bg-bg-subtle px-1.5 py-0.5 text-[11px] font-semibold text-fg-muted tabular-nums">{b.total}</span>}
            </header>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : !b || !b.entries.length ? (
              <p className="py-6 text-center text-xs text-fg-muted">Nobody in this period.</p>
            ) : (
              <ol className="flex flex-col gap-1">
                {b.entries.map((e) => (
                  <li key={e.employee_id}>
                    <button type="button" onClick={() => onOpen(e.employee_id)} className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-bg-subtle">
                      <span className="w-4 shrink-0 text-xs font-bold text-fg-muted tabular-nums">{e.rank}</span>
                      <Avatar src={e.photo_url ?? null} size={8} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-fg">{e.name}</span>
                        <span className="block truncate text-xs text-fg-muted">{[e.department, e.site].filter(Boolean).join(' · ') || e.employee_code || ''}</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-fg tabular-nums">{boardValueText(e.unit, e.value)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
