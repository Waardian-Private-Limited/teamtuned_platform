'use client';

import Image from 'next/image';
import { Area, AreaChart, Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, FileText, Hourglass, ListChecks, Timer, Users } from 'lucide-react';
import type { AssignmentInsights, FieldInsight, InsightGroup, RunCounts, SubmissionCounts } from '../../../types/dc.types';
import { Bar, Card, Pill, Skeleton, Tile, statusTone } from '../../shared/Ui';

const AGG_LABEL: Record<string, string> = { sum: 'Total', avg: 'Average', min: 'Lowest', max: 'Highest', count: 'Count' };
const isRuns = (g: InsightGroup | AssignmentInsights['tiles']): g is InsightGroup & RunCounts => 'expected' in g;
const num = (n: number | null | undefined, decimals?: number | null) =>
  n === null || n === undefined ? '–' : n.toLocaleString(undefined, { maximumFractionDigits: decimals ?? 2 });
const pct = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)}%` : '–');

export function OverviewTab({ data, loading, onPerson }: { data: AssignmentInsights | null; loading: boolean; onPerson: (id: number) => void }) {
  if (!data) return <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  const scheduled = data.assignment.mode === 'scheduled';
  const t = data.tiles;
  return (
    <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {isRuns(t) ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
          <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-[var(--tt-shadow-sm)]">
            <div><div className="text-xs font-semibold text-fg-muted">Compliance</div>
              <div className="mt-1 text-5xl font-extrabold leading-none text-fg">{t.compliance === null ? '–' : `${t.compliance}%`}</div>
              <p className="mt-2 text-xs text-fg-muted">{t.done} of {t.expected} due forms were filled</p></div>
            <div className="mt-4"><Bar value={t.done} total={t.expected} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile icon={ListChecks} label="Due" value={t.total} />
            <Tile icon={CheckCircle2} label="Filled" value={t.done} note={t.late ? `${t.late} late` : undefined} />
            <Tile icon={AlertTriangle} label="Overdue" value={t.overdue} note="Still open, past due" />
            <Tile icon={FileText} label="Missed" value={t.missed} note="Closed unfilled" />
            <Tile icon={Hourglass} label="In review" value={t.in_review} />
            <Tile icon={Clock} label="Still to come" value={t.pending} />
            <Tile icon={Users} label="People who filled" value={'people' in t ? t.people : 0} />
            <Tile icon={Timer} label="Filled late" value={t.late} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile icon={FileText} label="Submissions" value={(t as SubmissionCounts).submissions} />
          <Tile icon={Users} label="People who filled" value={(t as SubmissionCounts).people} />
          <Tile icon={Timer} label="Filled late" value={(t as SubmissionCounts).late} />
          <Tile icon={Hourglass} label="In review" value={(t as SubmissionCounts).in_review ?? 0} />
        </div>
      )}

      <Card title="Daily trend" subtitle={scheduled ? 'Forms due and filled each day' : 'Submissions each day'} className="mt-4">
        {data.trend.length > 0 ? (
          <div className="h-56"><ResponsiveContainer width="100%" height="100%">
            {scheduled ? (
              <AreaChart data={data.trend} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--tt-line)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip /><Area type="monotone" dataKey="expected" name="Due" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.15} />
                <Area type="monotone" dataKey="done" name="Filled" stroke="var(--tt-fg, #000)" fill="var(--tt-fg, #000)" fillOpacity={0.12} />
                <Area type="monotone" dataKey="missed" name="Missed" stroke="var(--tt-danger)" fill="var(--tt-danger)" fillOpacity={0.08} />
              </AreaChart>
            ) : (
              <BarChart data={data.trend} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--tt-line)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip /><RBar dataKey="submissions" name="Submissions" fill="var(--tt-fg, #000)" radius={[3, 3, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer></div>
        ) : <Empty text={scheduled ? 'Nothing was due in this period' : 'Nothing was submitted in this period'} />}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Groups title="By site" rows={data.by_site} empty="No site data" fallback="No site" />
        <Groups title="By department" rows={data.by_department} empty="No department data" fallback="No department" />
        <Groups title={scheduled ? 'People behind' : 'By person'} subtitle="Click a person to see only their data" rows={data.by_person} empty="No one yet" fallback="Shared site form" onPick={onPerson} />
      </div>

      {scheduled && (
        <Card title="Not filled" subtitle="Missed, or still open after the due time. Newest first." className="mt-4">
          {data.pending.length ? (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-surface text-xs text-fg-muted"><tr><th className="py-2 pr-3 font-semibold">Date</th><th className="py-2 pr-3 font-semibold">Person</th><th className="hidden py-2 pr-3 font-semibold sm:table-cell">Department</th><th className="py-2 pr-3 font-semibold">Site</th><th className="py-2 font-semibold">Status</th></tr></thead>
                <tbody className="divide-y divide-line">{data.pending.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3 text-xs tabular-nums text-fg-muted">{p.work_date}</td>
                    <td className="py-2 pr-3 text-xs font-semibold text-fg">{p.employee_name || 'Shared site form'}{p.employee_code ? <span className="font-normal text-fg-muted"> ({p.employee_code})</span> : null}</td>
                    <td className="hidden py-2 pr-3 text-xs text-fg-muted sm:table-cell">{p.department_name || '–'}</td>
                    <td className="py-2 pr-3 text-xs text-fg-muted">{p.site_name || '–'}</td>
                    <td className="py-2"><Pill label={p.status === 'missed' ? 'Missed' : 'Overdue'} tone={statusTone(p.status)} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <Empty text="Everything due was filled" />}
        </Card>
      )}

      <div className="mt-6">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-fg">Answers</h2>
          {data.fields_capped && <span className="text-xs text-fg-muted">Based on the latest {data.fields_capped.toLocaleString()} submissions</span>}
        </div>
        {data.fields.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.fields.map((f) => <FieldCard key={f.key} f={f} />)}</div>
        ) : <Card><Empty text="This form has no answer fields" /></Card>}
      </div>
    </div>
  );
}

function Groups({ title, subtitle, rows, empty, fallback, onPick }: { title: string; subtitle?: string; rows: InsightGroup[]; empty: string; fallback: string; onPick?: (id: number) => void }) {
  return (
    <Card title={title} subtitle={subtitle}>
      {rows.length ? (
        <ul className="max-h-80 space-y-3 overflow-auto pr-1">{rows.map((g) => {
          const name = `${g.name || fallback}${g.code ? ` (${g.code})` : ''}`;
          const pickable = onPick && g.id > 0;
          const body = isRuns(g) ? (
            <><div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate font-semibold text-fg">{name}</span><span className="shrink-0 text-fg-muted">{g.done}/{g.expected}{g.missed ? ` · ${g.missed} missed` : ''}</span></div><Bar value={g.done} total={g.expected} /></>
          ) : (
            <div className="flex justify-between gap-2 text-xs"><span className="truncate font-semibold text-fg">{name}</span><span className="shrink-0 text-fg-muted">{(g as SubmissionCounts).submissions} filled{(g as SubmissionCounts).late ? ` · ${(g as SubmissionCounts).late} late` : ''}</span></div>
          );
          return <li key={`${g.id}`}>{pickable ? <button type="button" className="block w-full rounded-md text-left hover:bg-bg-subtle" onClick={() => onPick(g.id)}>{body}</button> : body}</li>;
        })}</ul>
      ) : <Empty text={empty} />}
    </Card>
  );
}

/** One field's answers: split for yes/no and choices, totals and a daily chart for numbers, how many answered otherwise. */
function FieldCard({ f }: { f: FieldInsight }) {
  return (
    <Card>
      <div className="mb-3 min-w-0">
        <div className="truncate text-xs font-bold text-fg" title={f.label}>{f.group ? <span className="font-semibold text-fg-muted">{f.group} › </span> : null}{f.label}</div>
        <div className="text-[11px] text-fg-subtle">{f.answered} of {f.total} answered{f.group ? ' (entries)' : ''}</div>
      </div>
      {f.kind === 'yes_no' && <Split rows={[{ label: 'Yes', count: f.yes || 0 }, { label: 'No', count: f.no || 0 }]} />}
      {(f.kind === 'choice' || f.kind === 'values') && <Split rows={f.options || []} />}
      {f.kind === 'number' && f.stats && (
        f.stats.count ? (<>
          <div className="text-2xl font-extrabold text-fg">{num(f.agg === 'count' ? f.stats.count : f.stats[f.agg || 'avg'], f.decimals)} <span className="text-sm font-semibold text-fg-muted">{f.unit}</span></div>
          <div className="text-[11px] text-fg-muted">{AGG_LABEL[f.agg || 'avg']} · low {num(f.stats.min, f.decimals)} · avg {num(f.stats.avg, f.decimals)} · high {num(f.stats.max, f.decimals)}</div>
          {(f.series?.length || 0) > 1 && (
            <div className="mt-2 h-14"><ResponsiveContainer width="100%" height="100%"><BarChart data={f.series}><Tooltip formatter={(v) => num(Number(v), f.decimals)} labelFormatter={(d) => String(d)} /><XAxis dataKey="date" hide /><RBar dataKey="value" name={AGG_LABEL[f.agg || 'avg']} fill="var(--tt-fg, #000)" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div>
          )}
        </>) : <p className="text-xs text-fg-muted">No numbers yet</p>
      )}
      {f.kind === 'filled' && <Bar value={f.answered} total={f.total} />}
    </Card>
  );
}

function Split({ rows }: { rows: { label: string; count: number }[] }) {
  const total = rows.reduce((a, r) => a + r.count, 0);
  if (!total) return <p className="text-xs text-fg-muted">No answers yet</p>;
  return (
    <ul className="space-y-2">{rows.map((r) => (
      <li key={r.label}>
        <div className="mb-0.5 flex justify-between gap-2 text-xs"><span className="truncate text-fg">{r.label}</span><span className="shrink-0 tabular-nums text-fg-muted">{r.count} · {pct(r.count, total)}</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle"><div className="h-full rounded-full bg-fg" style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} /></div>
      </li>
    ))}</ul>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex flex-col items-center py-6 text-center"><Image src="/vectors/attendancedashboard.svg" alt="" width={150} height={100} className="mb-2 h-auto max-h-24 w-auto opacity-80" /><p className="text-xs text-fg-muted">{text}</p></div>;
}
