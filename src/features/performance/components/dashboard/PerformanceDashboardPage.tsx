'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowUpRight, BarChart3, Coins, HeartHandshake, MessageSquare, ShieldAlert, Sparkles, Target, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { EmptyState } from '@/components/ui/EmptyState';
import { cx } from '@/theme/tokens';
import * as api from '../../api/perf.api';
import { HELP } from '../../constants/help';
import { CYCLE_STATUS_LABEL } from '../../constants/perf.constants';
import { fmt } from '../../lib';
import type { DashPayCycle, PerformanceDashboard } from '../../types/perf.types';
import { btnClass, Card, PageHead, StageStepper, Stat, Table, td } from '../ui';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const pctText = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${fmt(n, 1)}%`);
const share = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);

/** Ink heat: darker = more. Plain ink on paper, no colour scale to learn. */
const heat = (strength: number) => ({ background: `color-mix(in srgb, var(--tt-primary) ${Math.round(Math.max(0, Math.min(1, strength)) * 28)}%, transparent)` });

const ISSUE_LABEL = { goals: 'Goals not approved', review: 'Final review not approved', acknowledgement: 'Rating not acknowledged' } as const;
const CHANGE_LABEL = { manager_override: 'Manager override', calibration: 'Calibration', dispute_adjustment: 'After dispute' } as const;
const ACK_LABEL: Record<string, string> = { disputed: 'Disputed (open)', dispute_upheld: 'Upheld, rating changed', dispute_rejected: 'Rejected, rating kept' };

function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-xl bg-bg-subtle', className)} />;
}

/** One row of the funnel: label, count and an ink bar of its share of everyone in the cycle. */
function Funnel({ steps }: { steps: NonNullable<PerformanceDashboard['funnel']> }) {
  return (
    <ol className="space-y-2.5">
      {steps.map((s) => (
        <li key={s.key}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-fg">{s.label}</span>
            <span className="tabular-nums text-fg-muted"><strong className="font-bold text-fg">{s.count}</strong> · {pctText(s.percent)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-subtle" role="meter" aria-label={s.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent ?? 0}>
            <div className="h-full rounded-full bg-[var(--tt-primary)] transition-[width] duration-500" style={{ width: `${Math.min(100, s.percent ?? 0)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function SpreadTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { code: string; count: number; percent: number; target: number | null } }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--tt-shadow-md)]">
      <p className="font-bold text-fg">Rating {p.code}</p>
      <p className="mt-1 tabular-nums text-fg">{p.count} people · {pctText(p.percent)}</p>
      {p.target !== null && <p className="tabular-nums text-fg-muted">Guide {pctText(p.target)}</p>}
    </div>
  );
}

/** Actual share per band as ink bars; the guide (when set) as hollow bars beside them. */
function Spread({ d }: { d: NonNullable<PerformanceDashboard['distribution']> }) {
  const rows = d.overall.rows;
  if (!d.overall.total) return <p className="flex h-56 items-center justify-center text-sm text-fg-muted">No ratings yet.</p>;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--tt-border)" />
          <XAxis dataKey="code" tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: 'var(--tt-fg-muted)' }} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<SpreadTooltip />} cursor={{ fill: 'var(--tt-bg-subtle)' }} />
          <Bar dataKey="percent" name="Actual" fill="var(--tt-primary)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          {d.guide && <Bar dataKey="target" name="Guide" fill="transparent" stroke="var(--tt-border-strong)" strokeDasharray="3 3" radius={[4, 4, 0, 0]} isAnimationActive={false} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PulseTile({ icon: Icon, label, value, lines }: { icon: LucideIcon; label: string; value: React.ReactNode; lines: React.ReactNode[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-3 shadow-[var(--tt-shadow-sm)]">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg"><Icon className="h-3.5 w-3.5" /></span>
        <span className="truncate text-[11px] font-semibold text-fg-muted">{label}</span>
      </div>
      <div className="text-xl font-extrabold leading-none text-fg">{value}</div>
      <ul className="space-y-0.5 text-[11px] text-fg-muted">{lines.map((l, i) => <li key={i} className="truncate">{l}</li>)}</ul>
    </div>
  );
}

function PayCycle({ c, base }: { c: DashPayCycle; base: string }) {
  const s = c.summary;
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`${base}/compensation/cycles/${c.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-fg hover:underline">{c.name}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
        <span className="rounded-md border border-line px-2 py-0.5 text-[11px] font-semibold capitalize text-fg-muted">{c.status.replace('_', ' ')}</span>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div><p className="text-[11px] text-fg-muted">Proposals</p><p className="text-sm font-bold text-fg">{s.proposals}</p><p className="text-[11px] text-fg-muted">{s.approved + s.applied} approved · {s.promotions} promotions</p></div>
        <div><p className="text-[11px] text-fg-muted">Increment</p><p className="text-sm font-bold text-fg">{pctText(s.increase_percent)}</p><p className="text-[11px] text-fg-muted">{inr(s.increase)} a year</p></div>
        <div><p className="text-[11px] text-fg-muted">Budget used</p><p className={cx('text-sm font-bold', (s.budget_used_percent ?? 0) > 100 ? 'text-[var(--tt-danger)]' : 'text-fg')}>{s.budget_used_percent === null ? 'No budget' : pctText(s.budget_used_percent)}</p></div>
        <div><p className="text-[11px] text-fg-muted">Bonus</p><p className="text-sm font-bold text-fg">{c.bonus.payouts ? inr(c.bonus.amount) : c.bonus_configured ? 'Not created' : 'No bonus guide'}</p><p className="text-[11px] text-fg-muted">{c.bonus.payouts ? `${c.bonus.employees} people · ${c.bonus.by_status.map((b) => `${b.payouts} ${b.status}`).join(', ')}` : ' '}</p></div>
      </div>
      <p className="mt-2 truncate text-[11px] text-fg-muted">Guide: {c.rating_scale.map((r) => `${r.rating} → +${r.percent}%${r.bonus_percent ? `, ${r.bonus_percent}% bonus` : ''}`).join(' · ')}</p>
    </div>
  );
}

type AuditTab = 'missing' | 'changes' | 'disputes';

/**
 * HR's one-page view of a performance cycle: stage, funnel, rating spread against the guide, departments, top and bottom
 * performers, the audit trail (missing work, rating changes with reasons, disputes), the habits around it (1:1s, kudos,
 * feedback, PIPs, OKRs) and what the ratings turned into in pay. Numbers are the cycle report's, so they never disagree.
 */
export function PerformanceDashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const area = pathname.startsWith('/employee') ? '/employee' : '/org-admin';
  const perfBase = `${area}/performance`;
  const wanted = Number(params.get('cycle')) || null;
  const [data, setData] = React.useState<PerformanceDashboard | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<AuditTab>('missing');

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    api.dashboard(wanted).then((d) => { if (live) setData(d); }).catch((e) => { if (live) setError(messageOf(e)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [wanted]);

  const pick = (id: number) => router.replace(`${pathname}?cycle=${id}`);
  const d = data;
  const c = d?.cycle;

  const head = (
    <PageHead
      help={HELP.dashboard}
      title="Performance dashboard"
      subtitle={c ? `${CYCLE_STATUS_LABEL[c.status]} · ${c.period_start} to ${c.period_end} · ${d?.headcount ?? 0} people` : 'Where every review cycle stands, and what it turned into in pay'}
      actions={d && d.cycles.length > 0 ? (
        <>
          <select aria-label="Cycle" value={c?.id ?? ''} onChange={(e) => pick(Number(e.target.value))} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-fg outline-none focus:border-[var(--tt-primary)]">
            {d.cycles.map((x) => <option key={x.id} value={x.id}>{x.name} · {CYCLE_STATUS_LABEL[x.status]}</option>)}
          </select>
          {c && <Link href={`${perfBase}/cycles/${c.id}`} className={btnClass('secondary')}>Open cycle</Link>}
          {c && <Link href={`${perfBase}/cycles/${c.id}/report`} className={btnClass('secondary')}><BarChart3 className="h-4 w-4" />Full report</Link>}
        </>
      ) : undefined}
    >
      {c && <StageStepper status={c.status} />}
    </PageHead>
  );

  if (error) return <div className="flex flex-col gap-3">{head}<p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p></div>;
  if (loading && !d) {
    return (
      <div className="flex flex-col gap-3">
        {head}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[84px]" />)}</div>
        <div className="grid gap-3 xl:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      </div>
    );
  }
  if (!d) return null;

  const culture = d.culture;
  const pulseTiles = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {d.pulse && (
        <>
          <PulseTile icon={ShieldAlert} label="Improvement plans" value={d.pulse.pips.active} lines={[`active · ${d.pulse.pips.pending_start + d.pulse.pips.pending_outcome} waiting approval`, `In this cycle: ${d.pulse.pips.passed} passed · ${d.pulse.pips.failed} failed`]} />
          <PulseTile icon={MessageSquare} label="360 feedback" value={pctText(d.pulse.feedback.response_rate)} lines={[`${d.pulse.feedback.submitted} of ${d.pulse.feedback.asked} answered`, `${d.pulse.feedback.waiting} waiting · ${d.pulse.feedback.declined} declined`]} />
        </>
      )}
      <PulseTile icon={Users} label="One-on-ones" value={culture.one_on_ones.done_30} lines={[`held in 30 days · ${culture.one_on_ones.done_90} in 90`, `${culture.one_on_ones.upcoming} upcoming · ${culture.one_on_ones.overdue} past and not marked done`]} />
      <PulseTile icon={HeartHandshake} label="Kudos" value={culture.kudos.given_30} lines={['given in 30 days', `${culture.kudos.givers_30} gave · ${culture.kudos.receivers_30} received`]} />
      <PulseTile icon={Target} label="OKR progress" value={pctText(culture.okrs.average_progress)} lines={[`${culture.okrs.objectives} active objectives · company ${pctText(culture.okrs.company_progress)}`, `${culture.okrs.confidence.on_track} on track · ${culture.okrs.confidence.at_risk} at risk · ${culture.okrs.confidence.off_track} off`]} />
    </div>
  );

  if (!c) {
    return (
      <div className="flex flex-col gap-3">
        {head}
        <div className="rounded-xl border border-line bg-surface p-6">
          <EmptyState illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }} title="No review cycle yet" description="Create a cycle under Performance → Cycles. This page then shows its progress, ratings, audit trail and pay outcome." action={{ label: 'Go to cycles', onClick: () => router.push(`${perfBase}/cycles`) }} />
        </div>
        {pulseTiles}
      </div>
    );
  }

  const p = d.progress!;
  const ack = d.acknowledgements!;
  const perf = d.performers!;
  const audit = d.audit!;
  const dist = d.distribution!;
  const cal = d.calibration!;
  const codes = dist.codes;
  const maxBand = Math.max(1, ...dist.departments.flatMap((x) => codes.map((code) => x.bands[code] || 0)));
  const kpiRows = d.heatmap!.rows.filter((r) => r.kind === 'kpi').slice(0, 10);
  const sheetHref = (id: number) => `${perfBase}/sheets/${id}`;
  const person = (x: { sheet_id: number; employee_name: string; employee_code: string | null; department_name?: string | null }) => (
    <Link href={sheetHref(x.sheet_id)} className="group block min-w-0">
      <span className="block truncate font-semibold group-hover:underline">{x.employee_name}</span>
      <span className="block truncate text-[11px] text-fg-muted">{[x.employee_code, x.department_name].filter(Boolean).join(' · ')}</span>
    </Link>
  );
  const tabs: { key: AuditTab; label: string; count: number }[] = [
    { key: 'missing', label: 'Missing work', count: audit.missing.length },
    { key: 'changes', label: 'Rating changes', count: audit.changes.length },
    { key: 'disputes', label: 'Disputes', count: audit.disputes.length },
  ];

  return (
    <div className={cx('flex flex-col gap-3 pb-8 transition-opacity', loading && 'opacity-70')}>
      {head}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="People in cycle" value={d.headcount} note={`${p.departments.length} departments`} />
        <Stat label="Goals approved" value={`${share(p.goals_approved, p.total)}%`} note={`${p.goals_approved} of ${p.total}`} />
        <Stat label="Reviews approved" value={`${share(p.reviews_approved, p.total)}%`} note={`${p.reviews_approved} of ${p.total}`} />
        <Stat label="Average score" value={fmt(perf.average, 1)} note={`${perf.scored} scored${p.released ? ' · frozen at release' : ' · live'}`} />
        <Stat label="Released" value={p.released} note={`${ack.acknowledged} acknowledged · ${ack.pending} pending`} />
        <Stat label="Disputes" value={ack.disputed} note={ack.released ? `Acknowledgement ${pctText(ack.rate)}` : 'Nothing released yet'} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card title="Cycle funnel" note="How many got through each step">
          <Funnel steps={d.funnel!} />
        </Card>
        <Card
          title="Rating spread"
          note={dist.guide ? 'ink = actual, dashed = calibration guide' : 'no calibration guide set'}
          right={cal.guide ? (
            <span className={cx('rounded-md border px-2 py-0.5 text-[11px] font-semibold', cal.within || !['review', 'calibration', 'released', 'closed'].includes(c.status) ? 'border-line text-fg-muted' : 'border-[var(--tt-danger)] text-[var(--tt-danger)]')}>
              {cal.within ? 'Within guide' : `Off guide: ${cal.off_guide.map((o) => `${o.code} ${o.flag}`).join(', ')}`}
            </span>
          ) : undefined}
        >
          <Spread d={dist} />
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {([['Top performers', perf.top], ['Needs attention', perf.bottom]] as const).map(([title, list]) => (
          <Card key={title} title={title} note={p.released ? 'final scores' : 'live scores, can still change'}>
            {list.length === 0 ? <p className="py-6 text-center text-sm text-fg-muted">No scores yet.</p> : (
              <ul className="divide-y divide-line/60">
                {list.map((x, i) => (
                  <li key={x.sheet_id} className="flex items-center gap-3 py-2">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-fg-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">{person(x)}</div>
                    {x.band && <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] font-bold text-fg">{x.band}</span>}
                    <span className="w-14 text-right text-sm font-extrabold tabular-nums text-fg">{fmt(x.score, 1)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <Card title="Departments" note="progress and rating spread; darker = more people">
        <div className="overflow-auto rounded-lg border border-line tt-scroll-hidden">
          <Table minWidth={640 + codes.length * 56} head={[
            { label: 'Department' }, { label: 'People', className: 'text-right' }, { label: 'Goals', className: 'text-right' }, { label: 'Reviews', className: 'text-right' }, { label: 'Released', className: 'text-right' },
            ...codes.map((code) => ({ label: code, className: 'text-center' })),
          ]}>
            {p.departments.map((x) => {
              const bands = dist.departments.find((b) => b.department_id === x.department_id)?.bands || {};
              return (
                <tr key={x.department_id}>
                  <td className={td}>{x.name}</td>
                  <td className={`${td} text-right tabular-nums`}>{x.total}</td>
                  <td className={`${td} text-right tabular-nums`}>{share(x.goals_approved, x.total)}%</td>
                  <td className={`${td} text-right tabular-nums`}>{share(x.reviews_approved, x.total)}%</td>
                  <td className={`${td} text-right tabular-nums`}>{x.released}</td>
                  {codes.map((code) => <td key={code} className={`${td} text-center font-semibold tabular-nums`} style={bands[code] ? heat(bands[code] / maxBand) : undefined}>{bands[code] || '—'}</td>)}
                </tr>
              );
            })}
          </Table>
        </div>
        {kpiRows.length > 0 && (
          <div className="overflow-auto rounded-lg border border-line tt-scroll-hidden">
            <Table minWidth={560} head={[{ label: 'KPI' }, { label: 'All', className: 'text-center' }, ...d.heatmap!.departments.map((x) => ({ label: x.name, className: 'text-center' }))]}>
              {kpiRows.map((r) => (
                <tr key={`${r.group}-${r.name}`}>
                  <td className={td}><span className="block font-semibold">{r.name}</span>{r.group && <span className="block text-[11px] text-fg-muted">{r.group}</span>}</td>
                  {[{ average: r.average, key: 'all' }, ...r.cells.map((cell) => ({ average: cell.average, key: String(cell.department_id) }))].map((cell) => (
                    <td key={cell.key} className={`${td} text-center font-semibold tabular-nums`} style={cell.average === null ? undefined : heat(cell.average / 100)}>{cell.average === null ? '—' : fmt(cell.average, 1)}</td>
                  ))}
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>

      <Card title="Audit" note="what is late for this stage, every rating change with its reason, and disputes">
        <div role="tablist" aria-label="Audit" className="flex gap-1 overflow-x-auto border-b border-line tt-scroll-hidden">
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={cx('-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors', tab === t.key ? 'border-[var(--tt-primary)] text-fg' : 'border-transparent text-fg-muted hover:text-fg')}>
              {t.label}<span className="rounded-md bg-bg-subtle px-1.5 text-[11px] tabular-nums">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="max-h-[420px] overflow-auto tt-scroll-hidden">
          {tab === 'missing' && (audit.missing.length === 0 ? <p className="py-6 text-center text-sm text-fg-muted">Nothing is late for this stage.</p> : (
            <Table minWidth={640} head={[{ label: 'Employee' }, { label: 'Missing' }, { label: 'Now' }, { label: 'Reviewer' }]}>
              {audit.missing.map((m) => (
                <tr key={`${m.sheet_id}-${m.issue}`}>
                  <td className={td}>{person(m)}</td>
                  <td className={td}>{ISSUE_LABEL[m.issue]}</td>
                  <td className={`${td} capitalize text-fg-muted`}>{String(m.detail || '').replace(/_/g, ' ')}</td>
                  <td className={`${td} text-fg-muted`}>{m.reviewer_name || '—'}</td>
                </tr>
              ))}
            </Table>
          ))}
          {tab === 'changes' && (audit.changes.length === 0 ? <p className="py-6 text-center text-sm text-fg-muted">No rating was changed from the score.</p> : (
            <Table minWidth={760} head={[{ label: 'Employee' }, { label: 'Change' }, { label: 'Rating' }, { label: 'Reason' }, { label: 'By' }]}>
              {audit.changes.map((x, i) => (
                <tr key={`${x.kind}-${x.sheet_id}-${i}`}>
                  <td className={td}>{person(x)}</td>
                  <td className={td}>{CHANGE_LABEL[x.kind]}{x.session_name && <span className="block text-[11px] text-fg-muted">{x.session_name}</span>}</td>
                  <td className={`${td} whitespace-nowrap font-semibold`}>{x.from_band || '—'} → {x.to_band || '—'}</td>
                  <td className={`${td} max-w-[320px] text-fg-muted`}>{x.reason || '—'}</td>
                  <td className={`${td} text-fg-muted`}>{x.changed_by_name || '—'}{x.changed_at && <span className="block text-[11px]">{String(x.changed_at).slice(0, 10)}</span>}</td>
                </tr>
              ))}
            </Table>
          ))}
          {tab === 'disputes' && (audit.disputes.length === 0 ? <p className="py-6 text-center text-sm text-fg-muted">No disputes.</p> : (
            <Table minWidth={560} head={[{ label: 'Employee' }, { label: 'Rating' }, { label: 'Dispute' }]}>
              {audit.disputes.map((x) => (
                <tr key={x.sheet_id}>
                  <td className={td}>{person(x)}</td>
                  <td className={`${td} font-semibold`}>{x.band || '—'}</td>
                  <td className={td}>{ACK_LABEL[x.ack_status] || x.ack_status}</td>
                </tr>
              ))}
            </Table>
          ))}
        </div>
      </Card>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-fg"><Sparkles className="h-3.5 w-3.5" />Pulse <span className="font-normal text-fg-muted">· the habits around the rating</span></p>
        {pulseTiles}
      </div>

      <Card title={<span className="inline-flex items-center gap-1.5"><Coins className="h-3.5 w-3.5" />Pay outcome</span>} note="increments and bonus from appraisal cycles linked to this cycle">
        {(d.pay || []).length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-4 text-xs text-fg-muted">
            <p className="font-semibold text-fg">No appraisal cycle uses these ratings yet.</p>
            <p className="mt-1">In Compensation, open an appraisal cycle and pick “{c.name}” under Performance ratings. Released ratings then set each person’s increment % from the guide, and a bonus % per rating creates one-time bonus payouts paid with payroll.</p>
            <Link href={`${area}/compensation`} className={cx(btnClass('secondary', 'sm'), 'mt-3')}>Open Compensation</Link>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">{d.pay!.map((x) => <PayCycle key={x.id} c={x} base={area} />)}</div>
        )}
      </Card>
    </div>
  );
}
