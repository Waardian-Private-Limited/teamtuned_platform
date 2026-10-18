'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarClock, ChevronRight, Plus } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatDayTime } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { useState } from 'react';
import { INTERVIEW_MODE_LABELS, MOVABLE_STAGES, STAGE_LABELS } from '../../shared/constants/recruitment.constants';
import { useRecruitmentAccess } from '../../shared/hooks/useRecruitmentAccess';
import { useRecruitmentBase } from '../../shared/hooks/useRecruitmentBase';
import { CandidateDrawerHost } from '../../interviews/components/CandidateDrawerHost';
import { CandidateAvatar } from '../../shared/components/CandidateAvatar';
import type { InterviewMode, RecruitmentOverview } from '../../shared/types/recruitment.model';
import { useRecruitmentOverview, type AttentionItem } from '../hooks/useRecruitmentOverview';

function Card({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('flex min-w-0 flex-col rounded-xl border border-line bg-surface', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-bold text-fg">{title}</h2>
        {aside}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}

function Kpi({ label, value, hint, href }: { label: string; value: number; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-fg 2xl:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-fg-subtle">{hint}</p>}
    </>
  );
  const cls = 'block rounded-xl border border-line bg-surface p-3.5 sm:p-4';
  return href ? <Link href={href} className={cx(cls, 'transition-colors hover:border-line-strong hover:bg-bg-subtle/40')}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Funnel({ overview }: { overview: RecruitmentOverview }) {
  const rows = MOVABLE_STAGES.map((s) => ({ stage: s, value: overview.byStage[s] }));
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5" aria-label="Active candidates by stage">
      {rows.map((r) => (
        <li key={r.stage} className="grid grid-cols-[88px_1fr_40px] items-center gap-3 text-xs sm:grid-cols-[110px_1fr_48px]">
          <span className="font-medium text-fg-muted">{STAGE_LABELS[r.stage]}</span>
          <span className="h-5 overflow-hidden rounded bg-bg-subtle">
            <span className="block h-full rounded bg-fg transition-[width] duration-500" style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 4 : 0 }} />
          </span>
          <span className="text-right font-semibold tabular-nums text-fg">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-xl border border-line bg-bg-subtle/60" />)}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="h-64 rounded-xl border border-line bg-bg-subtle/50" />
        <div className="h-64 rounded-xl border border-line bg-bg-subtle/50" />
      </div>
    </div>
  );
}

export function RecruitmentOverviewPage() {
  const access = useRecruitmentAccess();
  const base = useRecruitmentBase();
  const { overview, attention, isLoading, error, forbidden, reload } = useRecruitmentOverview();
  const [openApp, setOpenApp] = useState<number | null>(null);
  const router = useRouter();

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto tt-scroll-hidden">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5 2xl:p-4">
        <div>
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Recruitment</h1>
          <p className="text-xs text-fg-muted">Open roles, pipeline health and what is coming up.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`${base}/candidates`} className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm">Candidates</Link>
          {access.canManage && (
            <Link href={`${base}/positions/new`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] sm:text-sm">
              <Plus className="h-3.5 w-3.5" />New position
            </Link>
          )}
        </div>
      </div>

      {error && <Alert message={error} tone="error" />}

      {forbidden ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState
            illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }}
            title="No recruitment access"
            description="Ask an admin for recruitment permissions. Hiring managers can open their positions from Positions."
            action={{ label: 'Go to positions', onClick: () => router.push(`${base}/positions`) }}
          />
        </div>
      ) : isLoading && !overview ? (
        <Skeleton />
      ) : overview ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Open positions" value={overview.openPositions} href={`${base}/positions`} />
            <Kpi label="Active candidates" value={overview.activeCandidates} href={`${base}/candidates`} />
            <Kpi label="Interviews today" value={overview.interviewsToday} href={`${base}/interviews`} />
            <Kpi label="This week" value={overview.interviewsThisWeek} hint="Interviews" href={`${base}/interviews`} />
            <Kpi label="Offers pending" value={overview.offersPending} href={`${base}/offers`} />
            <Kpi label="Hired" value={overview.hiredThisMonth} hint="This month" />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card title="Pipeline" aside={<span className="text-[11px] tabular-nums text-fg-muted">{overview.activeCandidates} active</span>}>
              <Funnel overview={overview} />
            </Card>

            <Card title="Upcoming interviews" aside={<Link href={`${base}/interviews`} className="text-xs font-semibold text-fg hover:underline">All</Link>}>
              {overview.upcomingInterviews.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <CalendarClock className="h-6 w-6 text-fg-subtle" />
                  <p className="mt-2 text-sm font-semibold text-fg">Nothing scheduled</p>
                  <p className="text-xs text-fg-muted">Interviews you schedule appear here.</p>
                </div>
              ) : (
                <ul className="-my-1 divide-y divide-line">
                  {overview.upcomingInterviews.map((i) => (
                    <li key={i.id}>
                      <button
                        type="button"
                        disabled={!i.applicationId}
                        onClick={() => i.applicationId && setOpenApp(i.applicationId)}
                        className="flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-left hover:bg-bg-subtle/50 disabled:cursor-default"
                      >
                        <CandidateAvatar name={i.candidateName || '?'} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-fg">{i.candidateName}</span>
                          <span className="block truncate text-xs text-fg-muted">
                            {[i.positionTitle, i.roundName, INTERVIEW_MODE_LABELS[i.mode as InterviewMode]].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-xs font-semibold text-fg">{formatDayTime(i.scheduledAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Positions needing attention" aside={<span className="text-[11px] tabular-nums text-fg-muted">{attention.length}</span>}>
            {attention.length === 0 ? (
              <p className="py-4 text-center text-xs text-fg-muted">Every open position has applicants and is within its closing date.</p>
            ) : (
              <ul className="-my-1 divide-y divide-line">
                {attention.map((a: AttentionItem) => (
                  <li key={a.position.id}>
                    <Link href={`${base}/positions/${a.position.id}`} className="flex items-center gap-3 rounded-md px-1 py-2.5 hover:bg-bg-subtle/50">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-fg-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-fg">{a.position.title}</span>
                        <span className="block truncate text-xs text-fg-muted">
                          {a.reason === 'past_close' ? `Closing date passed (${formatDate(a.position.closesOn)})` : 'No applicants yet'}
                          {a.position.department ? ` · ${a.position.department.name}` : ''}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}

      <CandidateDrawerHost applicationId={openApp} onClose={() => setOpenApp(null)} onChanged={() => reload()} />
    </div>
  );
}
