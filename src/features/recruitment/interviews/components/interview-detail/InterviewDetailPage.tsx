'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, CalendarClock, ExternalLink, Globe, Link2, Mail, MapPin, Phone, Timer } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusPill } from '@/components/ui/StatusPill';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime, formatTime } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { ResumeViewer } from '../../../shared/components/ResumeViewer';
import { safeHref } from '../../../shared/utils/format';
import { Tabs } from '../../../shared/components/Tabs';
import { useInterviewDetail } from '../../hooks/useInterviewDetail';
import { INTERVIEW_MODE_LABEL, INTERVIEW_STATUS_LABEL } from '../../constants/interviews.constants';
import type { InterviewDetailDto } from '../../types/interviews.dto';
import { initials } from '../../lib/ui';
import { ModeIcon, statusTone } from '../InterviewsPage';
import { DetailEmpty } from './DetailEmpty';
import { EarlierRounds } from './EarlierRounds';
import { ScorecardPanel } from './ScorecardPanel';
import { TestResults } from './TestResults';

type Tab = 'resume' | 'tests' | 'rounds';

function Fact({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-fg-muted">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

function experience(years: number | null | undefined) {
  if (years === null || years === undefined) return null;
  return `${years} yr${years === 1 ? '' : 's'} experience`;
}

function Header({ d }: { d: InterviewDetailDto }) {
  const c = d.candidate;
  const name = c?.name || d.application.candidateName;
  const role = [c?.currentTitle, c?.currentCompany].filter(Boolean).join(' at ');
  const end = Date.parse(d.scheduledAt) + d.durationMinutes * 60000;
  const linkedin = safeHref(c?.linkedinUrl);
  const portfolio = safeHref(c?.portfolioUrl);
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-fg text-lg font-bold text-[var(--tt-on-primary)]">
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-bold tracking-tight text-fg sm:text-xl">{name}</h1>
            <StatusPill label={INTERVIEW_STATUS_LABEL[d.status] || d.status} tone={statusTone(d.status)} />
          </div>
          <p className="mt-0.5 text-sm text-fg-muted">
            {d.application.positionTitle} · <span className="font-semibold text-fg">{d.roundName}</span>
          </p>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {role && <Fact icon={Briefcase}>{role}</Fact>}
            {experience(c?.totalExperience) && <Fact icon={Timer}>{experience(c?.totalExperience)}</Fact>}
            {c?.city && <Fact icon={MapPin}>{c.city}</Fact>}
            {c?.noticePeriodDays !== null && c?.noticePeriodDays !== undefined && <Fact icon={CalendarClock}>{c.noticePeriodDays} days notice</Fact>}
            {c?.email && <Fact icon={Mail}>{c.email}</Fact>}
            {c?.phone && <Fact icon={Phone}>{c.phone}</Fact>}
            {linkedin && (
              <a href={linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg underline-offset-4 hover:underline">
                <Link2 className="h-3.5 w-3.5" /> LinkedIn
              </a>
            )}
            {portfolio && (
              <a href={portfolio} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg underline-offset-4 hover:underline">
                <Globe className="h-3.5 w-3.5" /> Portfolio
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 border-t border-line pt-4 sm:grid-cols-3">
        <div className="rounded-lg bg-bg-subtle px-3 py-2.5">
          <p className="text-[11px] font-medium text-fg-muted">When</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-fg">{formatDateTime(d.scheduledAt)}</p>
          <p className="text-[11px] tabular-nums text-fg-muted">to {formatTime(end)} · {d.durationMinutes} min</p>
        </div>
        <div className="rounded-lg bg-bg-subtle px-3 py-2.5">
          <p className="text-[11px] font-medium text-fg-muted">Mode</p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-bold text-fg"><ModeIcon mode={d.mode} />{INTERVIEW_MODE_LABEL[d.mode] || d.mode}</p>
          <p className="truncate text-[11px] text-fg-muted">{d.mode === 'phone' ? 'HR shares the number' : d.mode === 'video' ? 'Online' : 'Face to face'}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-bg-subtle px-3 py-2.5">
          <p className="text-[11px] font-medium text-fg-muted">{d.mode === 'video' ? 'Meeting link' : 'Location'}</p>
          {d.mode === 'video' && d.meetingUrl ? (
            <a href={d.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-bold text-fg underline-offset-4 hover:underline">
              Join meeting <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <p className="mt-0.5 break-words text-sm font-bold text-fg">{d.location || '—'}</p>
          )}
        </div>
      </div>
      {d.status === 'cancelled' && d.cancelReason && <p className="mt-3 text-xs text-fg-muted">Cancelled: {d.cancelReason}</p>}
    </section>
  );
}

function hiddenReason(mode: 'show' | 'hide' | 'ask', what: string) {
  return mode === 'hide'
    ? `Your organization does not show ${what} to interview panels.`
    : `HR did not share ${what} with this interview's panel.`;
}

/** For HR / the hiring manager: whether this round's panelists see the tab's content too. */
function PanelNote({ sees }: { sees: boolean }) {
  return (
    <p className="mb-3 rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg-muted">
      {sees ? 'The panel of this round sees this too.' : 'Only HR and the hiring manager see this; it is hidden from the panel.'}
    </p>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading interview">
      <div className="h-44 rounded-xl border border-line bg-surface" />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="h-[60vh] rounded-xl border border-line bg-surface" />
        <div className="h-96 rounded-xl border border-line bg-surface" />
      </div>
    </div>
  );
}

/**
 * The interviewer's screen for one round: who the candidate is, the resume in the page, their
 * submitted tests (per HR's sharing), every earlier round's feedback, and the scorecard beside it.
 */
export function InterviewDetailPage({ interviewId, backHref }: { interviewId: number; backHref: string }) {
  const { employee } = useAuth();
  const myId = employee?.id ?? null;
  const { detail, loading, error, notFound, reload } = useInterviewDetail(interviewId);
  const [tab, setTab] = useState<Tab | null>(null);

  const hasResume = Boolean(detail?.candidate?.hasResume);
  const tests = detail?.tests || [];
  const rounds = detail?.earlierRounds || [];
  // Contact details come back only for HR / hiring manager, so they mark a privileged reader.
  const privileged = Boolean(detail?.candidate?.email);
  const vis = detail?.visibility;
  const testsHidden = !privileged && vis && !vis.panelSeesTests ? hiddenReason(vis.testsMode, 'test results') : null;
  const roundsHidden = !privileged && vis && !vis.panelSeesRounds ? hiddenReason(vis.roundsMode, "earlier rounds' feedback") : null;

  useEffect(() => {
    if (detail && tab === null) setTab(hasResume ? 'resume' : rounds.length ? 'rounds' : 'tests');
  }, [detail, tab, hasResume, rounds.length]);

  const back = (
    <Link href={backHref} className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
      <ArrowLeft className="h-4 w-4" /> My interviews
    </Link>
  );

  if (notFound) {
    return (
      <div className="flex h-full flex-col gap-3">
        {back}
        <div className="rounded-xl border border-line bg-surface p-6">
          <EmptyState illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }} title="Interview not found" description="It may have been removed, or you are not on its panel." />
        </div>
      </div>
    );
  }

  const tabs = [
    { value: 'resume' as const, label: 'Resume' },
    { value: 'tests' as const, label: 'Tests', count: tests.length },
    { value: 'rounds' as const, label: 'Earlier rounds', count: rounds.length },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {back}
      <div className="min-h-0 flex-1 overflow-y-auto tt-scroll-hidden">
        {error && <div className="mb-3"><Alert message={error} tone="error" /></div>}
        {!detail ? (
          loading ? <PageSkeleton /> : null
        ) : (
          <div className={cx('space-y-3 pb-6 transition-opacity', loading && 'opacity-70')}>
            <Header d={detail} />
            <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="min-w-0 rounded-xl border border-line bg-surface p-3 sm:p-4">
                <Tabs tabs={tabs} value={tab ?? 'resume'} onChange={setTab} idPrefix="interview" ariaLabel="Candidate information" />
                <div role="tabpanel" id={`interview-panel-${tab ?? 'resume'}`} aria-labelledby={`interview-tab-${tab ?? 'resume'}`} className="pt-4">
                  {(tab ?? 'resume') === 'resume' && (
                    hasResume && detail.candidate ? (
                      <ResumeViewer candidateId={detail.candidate.id} fileName={detail.candidate.resumeName} className="h-[75vh]" />
                    ) : (
                      <DetailEmpty title="No resume on file" description="The candidate did not upload a resume." />
                    )
                  )}
                  {privileged && vis && tab !== 'resume' && (
                    <PanelNote sees={tab === 'tests' ? vis.panelSeesTests : vis.panelSeesRounds} />
                  )}
                  {tab === 'tests' && <TestResults tests={tests} hidden={testsHidden} />}
                  {tab === 'rounds' && <EarlierRounds rounds={rounds} hidden={roundsHidden} />}
                </div>
              </div>
              <div className="tt-scroll-hidden lg:sticky lg:top-0 lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto">
                <ScorecardPanel detail={detail} myId={myId} onSaved={reload} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
