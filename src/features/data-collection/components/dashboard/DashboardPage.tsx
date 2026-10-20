'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Area, AreaChart, Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock, Hourglass, ListChecks } from 'lucide-react';
import * as api from '../../api/dc.api';
import { useAsync } from '../../hooks/useAsync';
import { SUBMISSION_LABEL } from '../../constants/dc.constants';
import { addDaysIso, todayIso } from '../../utils/schema';
import { Bar, Card, PageHeader, Pill, Skeleton, Tile, inputCls, statusTone } from '../shared/Ui';

const RANGES = [{ label: '7 days', days: 6 }, { label: '14 days', days: 13 }, { label: '30 days', days: 29 }];

export function DashboardPage({ basePath }: { basePath: string }) {
  const [days, setDays] = useState(13);
  const [formId, setFormId] = useState<number | null>(null);
  const [siteId, setSiteId] = useState<number | null>(null);
  const to = todayIso();
  const from = addDaysIso(to, -days);
  const forms = useAsync(() => api.listForms({ status: 'active', pageSize: 100 }), []);
  const { data, loading, error } = useAsync(() => api.getDashboard({ from, to, formId, siteId }), [days, formId, siteId]);
  // The site filter lists the sites that appear in the data so it needs no site permission.
  const sites = useMemo(() => data?.by_site.map((s) => ({ id: s.site_id, name: s.site_name || `Site ${s.site_id}` })) || [], [data]);
  const t = data?.tiles;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <PageHeader title="Data Collection" subtitle="What was due, what came in, and what was missed."
        actions={<>
          <select aria-label="Form" className={`${inputCls()} !w-44`} value={formId ?? ''} onChange={(e) => setFormId(e.target.value ? Number(e.target.value) : null)}><option value="">All forms</option>{forms.data?.items.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          <select aria-label="Site" className={`${inputCls()} !w-40`} value={siteId ?? ''} onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : null)}><option value="">All sites</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <div className="inline-flex overflow-hidden rounded-lg border border-line">{RANGES.map((r) => <button key={r.days} type="button" onClick={() => setDays(r.days)} className={`h-10 px-3 text-xs font-semibold ${days === r.days ? 'bg-fg text-[var(--tt-on-primary)]' : 'bg-surface text-fg-muted hover:bg-bg-subtle'}`}>{r.label}</button>)}</div>
        </>} />
      {error && <p className="mb-3 text-sm text-[var(--tt-danger)]">{error}</p>}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
        <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-[var(--tt-shadow-sm)]">
          <div><div className="text-xs font-semibold text-fg-muted">Compliance</div>
            {loading && !t ? <Skeleton className="mt-2 h-12 w-28" /> : <div className="mt-1 text-5xl font-extrabold leading-none text-fg">{t?.compliance === null || t?.compliance === undefined ? '–' : `${t.compliance}%`}</div>}
            <p className="mt-2 text-xs text-fg-muted">{t ? `${t.submitted} of ${t.expected} due forms were filled` : ' '}</p></div>
          <div className="mt-4"><Bar value={t?.submitted || 0} total={t?.expected || 0} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {loading && !t ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />) : (<>
            <Tile icon={ListChecks} label="Due in range" value={t?.total ?? 0} />
            <Tile icon={CheckCircle2} label="Filled" value={t?.submitted ?? 0} />
            <Tile icon={Hourglass} label="In review" value={t?.in_review ?? 0} />
            <Tile icon={AlertTriangle} label="Overdue" value={t?.overdue ?? 0} note="Still open, past due" />
            <Tile icon={ClipboardCheck} label="Missed" value={t?.missed ?? 0} note="Closed unfilled" />
            <Tile icon={Clock} label="Still to come" value={t?.pending ?? 0} />
          </>)}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Daily trend" subtitle="Forms due and filled each day">
          {data && data.trend.length > 0 ? (
            <div className="h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.trend} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--tt-line)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip /><Area type="monotone" dataKey="expected" name="Due" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.15} /><Area type="monotone" dataKey="done" name="Filled" stroke="#000" fill="#000" fillOpacity={0.12} />
            </AreaChart></ResponsiveContainer></div>
          ) : <Empty text="No forms were due in this period" loading={loading} />}
        </Card>
        <Card title="By site" subtitle="Lowest compliance first">
          {data && data.by_site.length > 0 ? (
            <ul className="space-y-3">{data.by_site.slice(0, 8).map((s) => (
              <li key={s.site_id}><div className="mb-1 flex justify-between text-xs"><span className="truncate font-semibold text-fg">{s.site_name || `Site ${s.site_id}`}</span><span className="text-fg-muted">{s.done}/{s.expected}</span></div><Bar value={s.done} total={s.expected} /></li>
            ))}</ul>
          ) : <Empty text="No site data yet" loading={loading} />}
        </Card>
      </div>

      {data && data.metrics.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 text-sm font-bold text-fg">Tracked numbers</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.metrics.map((m) => (
              <Card key={`${m.form_id}:${m.field_key}`}>
                <div className="text-xs font-semibold text-fg-muted">{m.label}</div>
                <div className="truncate text-[11px] text-fg-subtle">{m.form_name} · {m.agg}</div>
                <div className="mt-1 text-2xl font-extrabold text-fg">{Math.round(m.value * 100) / 100} <span className="text-sm font-semibold text-fg-muted">{m.unit}</span></div>
                {m.target !== null && <div className="mt-0.5 text-[11px] text-fg-muted">Target {m.target}</div>}
                <div className="mt-2 h-14"><ResponsiveContainer width="100%" height="100%"><BarChart data={m.points}><RBar dataKey="value" fill="#000" radius={[2, 2, 0, 0]} /></BarChart></ResponsiveContainer></div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card title="Recent submissions" className="mt-4" action={<a href={`${basePath}/submissions`} className="text-xs font-semibold text-fg underline-offset-4 hover:underline">See all</a>}>
        {data && data.recent.length > 0 ? (
          <ul className="divide-y divide-line">{data.recent.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5"><div className="min-w-0"><div className="truncate text-sm font-semibold text-fg">{r.form_name}</div><div className="truncate text-xs text-fg-muted">{r.employee_name}{r.site_name ? ` · ${r.site_name}` : ''} · {new Date(r.submitted_at).toLocaleString()}</div></div>
              <div className="flex shrink-0 gap-1.5">{r.is_late ? <Pill label="Late" tone="bad" /> : null}<Pill label={SUBMISSION_LABEL[r.status] || r.status} tone={statusTone(r.status)} /></div></li>
          ))}</ul>
        ) : <Empty text="Nothing submitted yet" loading={loading} />}
      </Card>
    </div>
  );
}

function Empty({ text, loading }: { text: string; loading: boolean }) {
  if (loading) return <Skeleton className="h-40" />;
  return <div className="flex flex-col items-center py-6 text-center"><Image src="/vectors/attendancedashboard.svg" alt="" width={150} height={100} className="mb-2 h-auto max-h-24 w-auto opacity-80" /><p className="text-xs text-fg-muted">{text}</p></div>;
}
