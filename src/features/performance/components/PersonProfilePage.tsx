'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { formatDate, formatDateTime } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import * as api from '../api/perf.api';
import type { PersonProfile, ProfileKpi } from '../types/perf.types';
import { HELP } from '../constants/help';
import { Card, PageHead, Progress, Stat } from './ui';

const n1 = (v: number | null | undefined) => (v === null || v === undefined ? '—' : Math.round(v * 10) / 10);
const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${n1(v)}%`);
const money = (v: number | null) => (v === null ? '—' : `₹${Math.round(v).toLocaleString('en-IN')}`);
const SOURCE: Record<string, string> = { data_collection: 'App report', tasks: 'Tasks', attendance: 'Attendance', leave: 'Leave', recruitment: 'Recruitment', formula: 'Formula', manual: 'Typed in', import: 'Uploaded' };
const READY: Record<string, string> = { ready_now: 'Ready now', one_two_years: '1–2 years', three_plus: '3+ years' };
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, k: number) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + k); return t.toISOString().slice(0, 10); };
const WINDOWS = [
  { key: '90', label: 'Last 3 months', days: 90 },
  { key: '180', label: 'Last 6 months', days: 182 },
  { key: '365', label: 'Last 12 months', days: 364 },
] as const;

function unitValue(v: number | null, unit: string | null) {
  if (v === null || v === undefined) return '—';
  if (unit === 'currency') return money(v);
  if (unit === 'percent') return `${n1(v)}%`;
  if (unit === 'duration_minutes') return `${n1(v)} min`;
  return String(n1(v));
}

function Score({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-fg-muted">—</span>;
  const tone = value >= 85 ? 'text-fg' : value >= 70 ? 'text-fg' : 'text-[var(--tt-danger)]';
  return <span className={cx('font-bold tabular-nums', tone)}>{n1(value)}</span>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-fg-muted">{children}</p>;
}

function KpiTable({ kpis }: { kpis: ProfileKpi[] }) {
  const labels = kpis[0]?.breaks.map((b) => b.label) || [];
  return (
    <div className="overflow-x-auto tt-scroll-hidden">
      <table className="w-full min-w-[640px] text-xs">
        <thead>
          <tr className="text-left text-[11px] text-fg-muted">
            <th className="py-1.5 pr-2 font-semibold">KPI</th>
            <th className="py-1.5 pr-2 font-semibold">From</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Weight</th>
            {labels.map((l) => <th key={l} className="py-1.5 pr-2 text-right font-semibold">{l}</th>)}
            <th className="py-1.5 pr-2 text-right font-semibold">Year so far</th>
            <th className="py-1.5 text-right font-semibold">Score</th>
          </tr>
        </thead>
        <tbody>
          {kpis.map((k) => (
            <tr key={k.name} className="border-t border-line/60 align-top">
              <td className="py-2 pr-2"><span className="font-semibold text-fg">{k.name}</span><span className="block text-[11px] text-fg-muted">{k.kra}</span></td>
              <td className="py-2 pr-2 text-fg-muted">{SOURCE[k.source || ''] || k.source || '—'}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{k.weight}%</td>
              {k.breaks.map((b) => (
                <td key={b.label} className="py-2 pr-2 text-right tabular-nums">
                  {unitValue(b.actual, k.unit)}
                  <span className="block text-[10px] text-fg-muted">of {unitValue(b.target, k.unit)}</span>
                </td>
              ))}
              <td className="py-2 pr-2 text-right tabular-nums">{unitValue(k.actual, k.unit)}<span className="block text-[10px] text-fg-muted">of {unitValue(k.target, k.unit)}</span></td>
              <td className="py-2 text-right"><Score value={k.score} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One person's whole picture for a 1:1, an increment round or a director's review: ratings over the years, this cycle's
 * live scores per break, and what the rest of TeamTuned recorded about their work in the chosen window. Sections appear
 * only when the organization uses them; pay only for people with compensation access.
 */
export function PersonProfilePage({ id, basePath }: { id: number; basePath: string }) {
  const [win, setWin] = React.useState<(typeof WINDOWS)[number]['key']>('365');
  const [data, setData] = React.useState<PersonProfile | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const to = today();
    const days = WINDOWS.find((w) => w.key === win)!.days;
    setError('');
    api.personProfile(id, { from: addDays(to, -days), to }).then(setData).catch((e) => setError(messageOf(e)));
  }, [id, win]);

  if (error) return <p role="alert" className="p-4 text-sm text-[var(--tt-danger)]">{error}</p>;
  if (!data) return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-bg-subtle" />)}</div>;

  const p = data.person;
  const live = data.performance.live;
  const released = data.performance.history.filter((h) => h.released);
  const last = released[0];
  const reportsFilled = (data.reports || []).reduce((s, r) => s + r.submitted, 0);
  const reportsLate = (data.reports || []).reduce((s, r) => s + r.late, 0);

  return (
    <div className="flex flex-col gap-3 pb-6">
      <PageHead
        title={
          <span className="flex items-center gap-3">
            {p.photo_url
              // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link
              ? <img src={p.photo_url} alt="" className="h-10 w-10 rounded-full border border-line object-cover" />
              : <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-bg-subtle text-sm font-bold text-fg-muted">{p.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join('')}</span>}
            <span>{p.name}</span>
          </span>
        }
        subtitle={[p.employee_code, p.designation || p.role, p.department, p.site, p.manager ? `reports to ${p.manager}` : null, p.joined_on ? `joined ${formatDate(p.joined_on)}` : null].filter(Boolean).join(' · ')}
        help={HELP.person}
        actions={
          <select value={win} onChange={(e) => setWin(e.target.value as typeof win)} aria-label="Period" className="h-9 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg">
            {WINDOWS.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
          </select>
        } />

      {/* the numbers at a glance */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label={live ? `${live.cycle} so far` : 'Current cycle'} value={live && live.score !== null ? <Score value={live.score} /> : '—'} note={live ? (live.score === null ? 'Shown after release' : `${live.band || ''}${live.partial ? ' · partial' : ''}`) : 'No running cycle'} />
        <Stat label="Last released rating" value={last ? last.band ?? '—' : '—'} note={last ? `${last.cycle} · score ${n1(last.score)}` : 'None yet'} />
        <Stat label="Attendance" value={pct(data.attendance.attendance_rate)} note={`Punctuality ${pct(data.attendance.punctuality_rate)}`} />
        {data.tasks && <Stat label="Tasks on time" value={pct(data.tasks.on_time_rate)} note={`${data.tasks.done} done · ${data.tasks.overdue} overdue`} />}
        {data.reports && <Stat label="App reports" value={reportsFilled} note={reportsFilled ? `${Math.round(((reportsFilled - reportsLate) / reportsFilled) * 100)}% on time` : 'None sent'} />}
        {data.meetings && <Stat label="Meeting actions" value={`${data.meetings.actions_done}/${data.meetings.actions_done + data.meetings.actions_open}`} note={`${data.meetings.actions_overdue} overdue`} />}
        <Stat label="Kudos" value={data.kudos.count} note="in this period" />
      </div>

      {/* this cycle */}
      <Card title={live ? `${live.cycle}: goals and scores` : 'This cycle'} note={live ? (live.basis === 'whole_cycle' ? 'scored on the whole cycle' : 'each quarter scored on its own target') : undefined}
        right={live ? <Link href={`${basePath}/sheets/${live.sheet_id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-fg hover:underline">Goal sheet <ArrowUpRight className="h-3.5 w-3.5" /></Link> : undefined}>
        {!live && <Empty>No running cycle with approved goals.</Empty>}
        {live && (
          <>
            <div className="flex flex-wrap gap-2">
              {live.breaks.map((b) => (
                <span key={b.label} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs">
                  <span className="font-semibold text-fg">{b.label}</span>
                  {data.viewer.self && !b.closed ? <span className="text-fg-muted">in progress</span> : <Score value={b.score} />}
                  {b.closed && <CheckCircle2 className="h-3 w-3 text-fg-muted" aria-label="closed" />}
                </span>
              ))}
            </div>
            <KpiTable kpis={live.kpis} />
          </>
        )}
      </Card>

      <div className="grid gap-3 xl:grid-cols-2">
        {/* history */}
        <Card title="Ratings over the years">
          {data.performance.history.length === 0 && <Empty>No cycles yet.</Empty>}
          <ul className="divide-y divide-line/60">
            {data.performance.history.map((h) => (
              <li key={h.sheet_id} className="flex items-center justify-between gap-2 py-2 text-xs">
                <span className="min-w-0">
                  <Link href={`${basePath}/sheets/${h.sheet_id}`} className="font-semibold text-fg hover:underline">{h.cycle}</Link>
                  <span className="block text-[11px] text-fg-muted">{formatDate(h.period_start)} – {formatDate(h.period_end)}{h.reviewer ? ` · reviewed by ${h.reviewer}` : ''}</span>
                </span>
                <span className="shrink-0 text-right">
                  {h.released ? <><span className="font-bold text-fg">Rating {h.band}</span><span className="block text-[11px] text-fg-muted">score {n1(h.score)}{h.potential ? ` · potential ${h.potential}` : ''}{h.acknowledged === 'disputed' ? ' · disputed' : ''}</span></>
                    : <span className="text-fg-muted">{h.cycle_status.replace('_', ' ')}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* attendance and leave */}
        <Card title="Attendance and leave" note={`${formatDate(data.window.from)} – ${formatDate(data.window.to)}`}>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><p className="text-fg-muted">Present</p><p className="font-bold text-fg">{n1(data.attendance.present_days)} days</p></div>
            <div><p className="text-fg-muted">Absent</p><p className="font-bold text-fg">{data.attendance.absent_days} days</p></div>
            <div><p className="text-fg-muted">Late</p><p className="font-bold text-fg">{data.attendance.late_days} days</p></div>
            <div><p className="text-fg-muted">Consistency</p><p className="font-bold text-fg">{n1(data.attendance.consistency)}</p></div>
            <div><p className="text-fg-muted">Hours worked</p><p className="font-bold text-fg">{n1(data.attendance.worked_hours)}</p></div>
            <div><p className="text-fg-muted">Overtime</p><p className="font-bold text-fg">{n1(data.attendance.overtime_hours)} h</p></div>
          </div>
          {data.leave.length > 0 && (
            <ul className="space-y-1 border-t border-line/60 pt-2 text-xs">
              {data.leave.map((l) => <li key={l.type} className="flex justify-between"><span className="text-fg">{l.type}</span><span className="text-fg-muted">{n1(l.days)} days{l.unplanned_days ? ` · ${l.unplanned_days} unplanned` : ''}{l.lop_days ? ` · ${l.lop_days} LOP` : ''}</span></li>)}
            </ul>
          )}
        </Card>

        {data.reports && (
          <Card title="App reports" note="forms they fill on the app">
            {data.reports.length === 0 && <Empty>No forms assigned or sent in this period.</Empty>}
            <ul className="space-y-2">
              {data.reports.map((r) => (
                <li key={r.form} className="text-xs">
                  <div className="flex justify-between gap-2"><span className="font-semibold text-fg">{r.form}</span><span className="text-fg-muted">{r.submitted} sent · {r.late} late{r.missed ? ` · ${r.missed} missed` : ''}</span></div>
                  <div className="mt-1 flex items-center gap-2"><Progress value={r.submitted - r.late} total={Math.max(r.submitted, 1)} /><span className="w-12 shrink-0 text-right text-[11px] text-fg-muted">{pct(r.on_time_rate)}</span></div>
                  {r.last_on && <p className="mt-0.5 text-[11px] text-fg-muted">Last sent {formatDate(r.last_on)}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {data.tasks && (
          <Card title="Tasks" note={`${data.tasks.done} done · ${data.tasks.on_time} on time · ${data.tasks.late} late${data.tasks.avg_review_rating ? ` · rated ${data.tasks.avg_review_rating}/5` : ''}`}>
            {data.tasks.open_list.length === 0 && data.tasks.recent.length === 0 && <Empty>No tasks in this period.</Empty>}
            {data.tasks.open_list.length > 0 && (
              <ul className="space-y-1 text-xs">
                <li className="text-[11px] font-semibold text-fg-muted">Open ({data.tasks.open})</li>
                {data.tasks.open_list.map((t, i) => (
                  <li key={i} className="flex justify-between gap-2"><span className="truncate text-fg">{t.title}</span>
                    <span className={cx('shrink-0', t.overdue ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted')}>{t.overdue && <AlertTriangle className="mr-1 inline h-3 w-3" />}{t.due_on ? `due ${formatDate(t.due_on)}` : 'no due date'}</span></li>
                ))}
              </ul>
            )}
            {data.tasks.recent.length > 0 && (
              <ul className="space-y-1 border-t border-line/60 pt-2 text-xs">
                <li className="text-[11px] font-semibold text-fg-muted">Recently finished</li>
                {data.tasks.recent.map((t, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate text-fg">{t.title}</span><span className="shrink-0 text-fg-muted">{formatDate(t.done_on)}{t.on_time === false ? ' · late' : ''}</span></li>)}
              </ul>
            )}
          </Card>
        )}

        {data.meetings && (
          <Card title="Meeting actions (MOM)" note={`attended ${data.meetings.meetings_attended} of ${data.meetings.meetings_invited} meetings`}>
            <p className="text-xs text-fg-muted">{data.meetings.actions_done} actions done ({data.meetings.actions_done_on_time} on time) · {data.meetings.actions_open} open · {data.meetings.actions_overdue} overdue</p>
            {data.meetings.open_list.length > 0 && (
              <ul className="space-y-1 text-xs">
                {data.meetings.open_list.map((a, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate text-fg">{a.text}<span className="text-fg-muted"> · {a.meeting}</span></span><span className={cx('shrink-0', a.overdue ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted')}>{a.due_on ? formatDate(a.due_on) : '—'}</span></li>)}
              </ul>
            )}
          </Card>
        )}

        <Card title="OKRs">
          {data.okrs.length === 0 && <Empty>No personal objectives right now.</Empty>}
          {data.okrs.map((o) => (
            <div key={o.title} className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-2"><span className="font-semibold text-fg">{o.title}</span><span className="text-fg-muted">{pct(o.progress)}</span></div>
              <Progress value={o.progress || 0} total={100} />
              <ul className="space-y-0.5 pl-2">
                {o.key_results.map((k) => <li key={k.title} className="flex justify-between gap-2 text-[11px]"><span className="text-fg">{k.title}{k.source === 'goal_item' ? ' (from goal sheet)' : ''}</span><span className="text-fg-muted">{n1(k.current)} / {n1(k.target)}</span></li>)}
              </ul>
            </div>
          ))}
        </Card>

        {!data.viewer.self && (
          <Card title="One-on-ones" note="meetings you were part of">
            {data.one_on_ones.length === 0 && <Empty>None in this period.</Empty>}
            <ul className="divide-y divide-line/60">
              {data.one_on_ones.map((m) => (
                <li key={m.id} className="py-2 text-xs">
                  <div className="flex justify-between gap-2"><Link href={`${basePath}/one-on-ones/${m.id}`} className="font-semibold text-fg hover:underline">{formatDateTime(m.scheduled_at)}</Link><span className="text-fg-muted">{m.status}{m.open_actions ? ` · ${m.open_actions} open actions` : ''}</span></div>
                  {m.shared_notes && <p className="mt-0.5 line-clamp-2 text-fg-muted">{m.shared_notes}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Kudos" note={`${data.kudos.count} in this period`}>
          {data.kudos.latest.length === 0 && <Empty>None in this period.</Empty>}
          <ul className="space-y-2 text-xs">
            {data.kudos.latest.map((k, i) => <li key={i}><p className="text-fg">“{k.message}”</p><p className="text-[11px] text-fg-muted">{k.from_name || 'Someone'} · {formatDate(k.on_date)}{k.competency ? ` · ${k.competency}` : ''}</p></li>)}
          </ul>
        </Card>

        {(data.improvement_plans.length > 0 || data.talent) && (
          <Card title="Plans and potential">
            {data.improvement_plans.map((pl) => (
              <div key={pl.id} className="flex justify-between gap-2 text-xs">
                <Link href={`${basePath}/improvement-plans/${pl.id}`} className="font-semibold text-fg hover:underline">{pl.title}</Link>
                <span className="text-fg-muted">{pl.outcome || pl.status.replace('_', ' ')} · {pl.met}/{pl.objectives} met · {formatDate(pl.start_date)} – {formatDate(pl.end_date)}</span>
              </div>
            ))}
            {data.talent && (
              <p className="text-xs text-fg-muted">
                Potential: <span className="font-semibold text-fg">{data.talent.potential || 'not rated'}</span>
                {data.talent.successor_for.length > 0 && <> · Successor for {data.talent.successor_for.map((s) => `${s.title} (${READY[s.readiness] || s.readiness})`).join(', ')}</>}
              </p>
            )}
          </Card>
        )}

        {data.learning && (
          <Card title="Learning plan">
            {data.learning.length === 0 && <Empty>Nothing on the plan.</Empty>}
            <ul className="space-y-1 text-xs">
              {data.learning.map((l, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate text-fg">{l.title}{l.competency ? <span className="text-fg-muted"> · {l.competency}</span> : null}</span><span className="shrink-0 text-fg-muted">{l.status.replace('_', ' ')}{l.due_date && !l.completed_on ? ` · due ${formatDate(l.due_date)}` : ''}</span></li>)}
            </ul>
          </Card>
        )}

        {data.pay && (
          <Card title="Pay history" note="only people with compensation access see this">
            {data.pay.length === 0 && <Empty>No revisions recorded.</Empty>}
            <ul className="divide-y divide-line/60 text-xs">
              {data.pay.map((r, i) => (
                <li key={i} className="flex justify-between gap-2 py-1.5">
                  <span><span className="font-semibold capitalize text-fg">{r.revision_type.replace('_', ' ')}</span><span className="block text-[11px] text-fg-muted">{formatDate(r.effective_from)}{r.new_designation && r.new_designation !== r.previous_designation ? ` · ${r.previous_designation || '—'} → ${r.new_designation}` : ''}{r.status !== 'applied' ? ` · ${r.status}` : ''}</span></span>
                  <span className="text-right"><span className="font-semibold text-fg">{money(r.new_ctc)}</span><span className="block text-[11px] text-fg-muted">{r.change_percent !== null ? `${r.change_percent > 0 ? '+' : ''}${n1(r.change_percent)}%` : ''}{r.performance_rating || r.rating ? ` · rating ${r.performance_rating || r.rating}` : ''}</span></span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <p className="flex items-center gap-1 text-[11px] text-fg-muted"><Clock className="h-3 w-3" /> App reports, tasks and attendance update the goal scores every 6 hours.</p>
    </div>
  );
}
