'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { formatDate } from '@/lib/datetime';
import { SelectField } from '@/components/ui/FormControls';
import { Card, PageHead, Stat, Table, td } from '@/features/performance/components/ui';
import * as api from '../api/surveys.api';
import type { QuestionResult, Results } from '../api/surveys.api';

const bar = (n: number, total: number) => <div className="h-2 rounded-full bg-bg-subtle"><div className="h-2 rounded-full bg-[var(--tt-primary)]" style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></div>;

/** Anonymous results of one survey: response rate, eNPS, engagement index, each question, and teams big enough to show. */
export function ResultsPage({ id, basePath }: { id: number; basePath: string }) {
  const [data, setData] = React.useState<Results | null>(null);
  const [dept, setDept] = React.useState<number | null>(null);
  const [departments, setDepartments] = React.useState<{ id: number; name: string }[]>([]);
  const [trend, setTrend] = React.useState<{ id: number; title: string; date: string; enps: number | null; engagement: number | null }[]>([]);
  const [error, setError] = React.useState('');
  React.useEffect(() => { setData(null); api.results(id, dept).then(setData).catch((e) => setError(messageOf(e))); }, [id, dept]);
  React.useEffect(() => { api.list().then((l) => setDepartments(l.departments)).catch(() => undefined); api.trend().then((t) => setTrend(t.points)).catch(() => undefined); }, []);

  const o = data?.overall;
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead help={HELP.surveys} title={<><Link href={`${basePath}/surveys?tab=manage`} aria-label="All surveys" className="rounded-[var(--tt-radius-sm)] p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>{data?.survey.title || 'Results'}</>}
        subtitle={data ? `Closes ${formatDate(data.survey.closes_on)} · shown only for groups of ${data.survey.min_group} or more` : undefined}
        actions={departments.length > 0 ? <div className="w-56"><SelectField<number> label="" numeric value={dept} placeholder="Whole company" onChange={setDept} options={departments.map((d) => ({ value: d.id, label: d.name }))} /></div> : undefined} />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto tt-scroll-hidden">
        {error && <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p>}
        {!data && !error && <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />}
        {data && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Answered" value={`${data.survey.responded} of ${data.survey.invited}`} note={`${data.response_rate}% response rate`} />
            <Stat label="eNPS" value={o?.visible && o.enps !== null && o.enps !== undefined ? (o.enps > 0 ? `+${o.enps}` : o.enps) : '—'} note="-100 to +100" />
            <Stat label="Engagement" value={o?.visible && o.engagement !== null && o.engagement !== undefined ? `${o.engagement}%` : '—'} note="Average agreement, 0 to 100" />
            <Stat label={dept ? 'In this department' : 'Answers'} value={o?.count ?? 0} />
          </div>
        )}
        {o && !o.visible && <Card title={<span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Hidden to protect anonymity</span>}><p className="text-sm text-fg-muted">{o.count} answers so far. Results show once at least {data?.survey.min_group} people {dept ? 'in this department ' : ''}have answered.</p></Card>}
        {o?.visible && o.questions?.map((q) => <QuestionCard key={q.id} q={q} />)}
        {data?.departments && data.departments.rows.length > 0 && (
          <Card title="By department" note={data.departments.hidden ? `${data.departments.hidden} answers from small teams are not shown` : 'small teams are pooled or left out'}>
            <div className="overflow-hidden rounded-lg border border-line">
              <Table minWidth={480} head={[{ label: 'Department' }, { label: 'Answers', className: 'w-24' }, { label: 'eNPS', className: 'w-24' }, { label: 'Engagement', className: 'w-32' }]}>
                {data.departments.rows.map((r) => (
                  <tr key={`${r.name}-${r.department_id}`}><td className={td}>{r.name}{r.pooled && <span className="ml-1 text-[11px] text-fg-muted">(pooled)</span>}</td><td className={td}>{r.count}</td><td className={td}>{r.enps ?? '—'}</td><td className={td}>{r.engagement !== null ? `${r.engagement}%` : '—'}</td></tr>
                ))}
              </Table>
            </div>
          </Card>
        )}
        {trend.length > 1 && (
          <Card title="Over time" note="surveys with enough answers">
            <div className="overflow-hidden rounded-lg border border-line">
              <Table minWidth={480} head={[{ label: 'Survey' }, { label: 'Closed', className: 'w-32' }, { label: 'eNPS', className: 'w-24' }, { label: 'Engagement', className: 'w-32' }]}>
                {trend.map((p) => <tr key={p.id} className={p.id === id ? 'bg-bg-subtle/60' : ''}><td className={td}>{p.title}</td><td className={`${td} text-fg-muted`}>{formatDate(p.date)}</td><td className={td}>{p.enps ?? '—'}</td><td className={td}>{p.engagement !== null ? `${p.engagement}%` : '—'}</td></tr>)}
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function QuestionCard({ q }: { q: QuestionResult }) {
  return (
    <Card title={q.text} note={`${q.count} answers`}>
      {q.type === 'rating' && q.distribution && (
        <div className="space-y-1.5">
          <p className="text-sm text-fg"><span className="text-xl font-extrabold">{q.average}</span> / 5 · <span className="font-semibold">{q.favourable}%</span> agree</p>
          {q.distribution.map((n, i) => <div key={i} className="grid grid-cols-[1.5rem_1fr_2.5rem] items-center gap-2 text-xs text-fg-muted"><span>{i + 1}</span>{bar(n, q.count)}<span>{n}</span></div>)}
        </div>
      )}
      {q.type === 'enps' && q.enps && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-line p-2"><p className="text-lg font-bold text-fg">{q.enps.promoters}</p>Promoters (9-10)</div>
          <div className="rounded-lg border border-line p-2"><p className="text-lg font-bold text-fg">{q.enps.passives}</p>Passives (7-8)</div>
          <div className="rounded-lg border border-line p-2"><p className="text-lg font-bold text-fg">{q.enps.detractors}</p>Detractors (0-6)</div>
        </div>
      )}
      {q.type === 'choice' && q.options?.map((o) => <div key={o.option} className="grid grid-cols-[10rem_1fr_2.5rem] items-center gap-2 text-xs text-fg"><span className="truncate">{o.option}</span>{bar(o.count, q.count)}<span className="text-fg-muted">{o.count}</span></div>)}
      {q.type === 'text' && (q.comments?.length ? <ul className="max-h-80 space-y-1.5 overflow-y-auto">{q.comments.map((c, i) => <li key={i} className="rounded-lg bg-bg-subtle px-3 py-2 text-sm text-fg">{c}</li>)}</ul> : <p className="text-xs text-fg-muted">No comments.</p>)}
    </Card>
  );
}
