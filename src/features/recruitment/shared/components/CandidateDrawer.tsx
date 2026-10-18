'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, ChevronDown, RotateCcw, XCircle } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Alert } from '@/components/ui/Alert';
import { formatDate, orgDateOf } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { MOVABLE_STAGES, SOURCE_LABELS, STAGE_LABELS } from '../constants/recruitment.constants';
import { useApplicationDetail } from '../hooks/useApplicationDetail';
import { useApplicationActions, type ApplicationAction } from '../hooks/useApplicationActions';
import { useRecruitmentAccess } from '../hooks/useRecruitmentAccess';
import type { ApplicationDetail, Stage } from '../types/recruitment.model';
import { ActionMenu, type ActionMenuEntry } from './ActionMenu';
import { CandidateAvatar } from './CandidateAvatar';
import { EmployeePicker } from './EmployeePicker';
import { RatingStars } from './RatingStars';
import { RejectDialog } from './RejectDialog';
import { ResumeViewer } from './ResumeViewer';
import { ReviewsTab } from '../../reviews/components/ReviewsTab';
import { StageBadge } from './StageBadge';
import { Tabs } from './Tabs';
import { OverviewTab } from './candidate-drawer/OverviewTab';
import { TimelineTab } from './candidate-drawer/TimelineTab';
import { InterviewsTab } from './candidate-drawer/InterviewsTab';
import { TestsTab } from './candidate-drawer/TestsTab';
import { OfferTab } from './candidate-drawer/OfferTab';
import { NotesTab } from './candidate-drawer/NotesTab';

export type CandidateDrawerTab = 'overview' | 'resume' | 'reviews' | 'timeline' | 'interviews' | 'tests' | 'offer' | 'notes';

export interface CandidateDrawerProps {
  /** Application to show; null closes the drawer. */
  applicationId: number | null;
  onClose: () => void;
  /** Fires after any change made from the drawer (stage, reject, reopen, rating, owner, note). */
  onChanged?: (applicationId: number, action: ApplicationAction) => void;
  /** Bump to make an open drawer refetch (e.g. after a scheduling dialog saved). */
  refreshKey?: number;
  initialTab?: CandidateDrawerTab;
  /** Interviews tab button "Schedule interview" (shown when provided and the user can manage). */
  /** `moving`: opened by moving the candidate to Interview, so the dialog can also just move. */
  onScheduleInterview?: (applicationId: number, detail: ApplicationDetail, moving?: boolean) => void;
  /** Tests tab button "Send test" (shown when provided and the user can manage). */
  /** `moving`: opened by moving the candidate to Assessment, so the dialog can also just move. */
  onSendTest?: (applicationId: number, detail: ApplicationDetail, moving?: boolean) => void;
  /** Tests tab "Review answers" link per attempt. */
  onOpenTestAttempt?: (attemptId: number, detail: ApplicationDetail) => void;
  /** Shows an open test's link again (copy / QR / WhatsApp). */
  onShareTestLink?: (attemptId: number, detail: ApplicationDetail) => void;
  /** Offer tab "Create offer" / "Open offer" (shown when provided and the user can make offers). */
  onOffer?: (applicationId: number, detail: ApplicationDetail) => void;
  /** Moving to Offer: the step dialog (review, review pack, create offer, or just move). */
  onOfferStep?: (applicationId: number, detail: ApplicationDetail) => void;
  /** Replace a tab's body entirely. `reload` refetches the application. */
  renderInterviews?: (detail: ApplicationDetail, reload: () => void) => React.ReactNode;
  renderTests?: (detail: ApplicationDetail, reload: () => void) => React.ReactNode;
  renderOffer?: (detail: ApplicationDetail, reload: () => void) => React.ReactNode;
}

function HeaderSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-bg-subtle" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-bg-subtle" />
          <div className="h-3 w-56 rounded bg-bg-subtle/70" />
        </div>
      </div>
      <div className="h-8 w-full rounded bg-bg-subtle/60" />
      <div className="space-y-2 pt-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-bg-subtle/50" />)}
      </div>
    </div>
  );
}

const ghostBtn = 'inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40';

/**
 * The one candidate view, opened from the board, the candidates list,
 * interviews and offers. Data comes from GET /applications/:id; scheduling,
 * tests and offers are delegated to the opener through callbacks.
 */
export function CandidateDrawer({
  applicationId, onClose, onChanged, refreshKey, initialTab = 'overview',
  onScheduleInterview, onSendTest, onOpenTestAttempt, onShareTestLink, onOffer, onOfferStep, renderInterviews, renderTests, renderOffer,
}: CandidateDrawerProps) {
  const access = useRecruitmentAccess();
  const { detail, isLoading, error, reload } = useApplicationDetail(applicationId);
  const [tab, setTab] = useState<CandidateDrawerTab>(initialTab);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => { if (applicationId) setTab(initialTab); }, [applicationId, initialTab]);
  useEffect(() => { if (applicationId && refreshKey !== undefined) reload(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDone = useCallback((id: number, action: ApplicationAction) => {
    reload();
    onChanged?.(id, action);
  }, [reload, onChanged]);
  const actions = useApplicationActions(handleDone);

  const open = applicationId !== null;
  const manage = Boolean(detail && (detail.permissions.manage || access.canManage));
  const canOffer = Boolean(detail && (detail.permissions.offer || access.canOffer));
  const active = detail?.status === 'active';
  const ended = detail?.status === 'rejected' || detail?.status === 'withdrawn';

  const moveItems: ActionMenuEntry[] = detail
    ? [
        { key: 'h', heading: 'Move to stage' },
        ...MOVABLE_STAGES.map((s: Stage) => ({
          key: s,
          label: STAGE_LABELS[s],
          checked: s === detail.stage,
          disabled: s === detail.stage,
          // Moving to Assessment is when a test is usually sent: offer any test, or just move.
          onSelect: () => {
            if (s === 'assessment' && onSendTest) onSendTest(detail.id, detail, true);
            else if (s === 'interview' && onScheduleInterview) onScheduleInterview(detail.id, detail, true);
            else if (s === 'offer' && onOfferStep) onOfferStep(detail.id, detail);
            else actions.moveStage(detail.id, s);
          },
        })),
      ]
    : [];

  const tabs = detail
    ? [
        { value: 'overview' as const, label: 'Overview' },
        ...(detail.candidate.hasResume ? [{ value: 'resume' as const, label: 'Resume' }] : []),
        ...((manage || canOffer) ? [{ value: 'reviews' as const, label: 'Reviews' }] : []),
        { value: 'timeline' as const, label: 'Timeline', count: detail.timeline.length },
        { value: 'interviews' as const, label: 'Interviews', count: detail.interviews.length },
        { value: 'tests' as const, label: 'Tests', count: detail.tests.length },
        { value: 'offer' as const, label: 'Offer' },
        { value: 'notes' as const, label: 'Notes', count: detail.timeline.filter((e) => e.type === 'note').length },
      ]
    : [];

  const appliedOn = detail?.appliedAt ? formatDate(orgDateOf(detail.appliedAt)) : '—';

  return (
    <>
      <Drawer open={open} onClose={onClose} title={detail?.candidate.name || 'Candidate'} maxWidthClassName="sm:max-w-2xl">
        {error && !detail && <Alert message={error} tone="error" />}
        {isLoading && !detail ? (
          <HeaderSkeleton />
        ) : detail ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <CandidateAvatar name={detail.candidate.name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{detail.position.title}</p>
                <p className="mt-0.5 truncate text-xs text-fg-muted">
                  {[detail.candidate.currentTitle, detail.candidate.currentCompany].filter(Boolean).join(' at ') || detail.candidate.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
                  <StageBadge stage={detail.stage} status={detail.status} />
                  <span>{SOURCE_LABELS[detail.source]}</span>
                  <span aria-hidden>·</span>
                  <span>Applied {appliedOn}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {manage && active && (
                <ActionMenu label="Move stage" items={moveItems} align="start" triggerClassName={ghostBtn} disabled={actions.busy === 'stage'}>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Move stage
                  <ChevronDown className="h-3 w-3 text-fg-muted" />
                </ActionMenu>
              )}
              {manage && active && (
                <button type="button" onClick={() => { actions.clearRejectError(); setRejectOpen(true); }} className={cx(ghostBtn, 'hover:text-[var(--tt-danger)]')}>
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
              )}
              {manage && ended && (
                <button type="button" onClick={() => actions.reopen(detail.id)} disabled={actions.busy === 'reopen'} className={ghostBtn}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reopen
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-bg-subtle/40 p-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-medium text-fg-muted">Rating</p>
                {manage ? (
                  <RatingStars value={detail.rating} onChange={(v) => actions.rate(detail.id, v)} disabled={actions.busy === 'rating'} label="Candidate rating" />
                ) : (
                  <RatingStars value={detail.rating} label="Candidate rating" />
                )}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium text-fg-muted" title="The recruiter responsible for following up with this candidate">Assigned recruiter</p>
                {manage ? (
                  <EmployeePicker
                    value={detail.owner}
                    onChange={(v) => actions.setOwner(detail.id, v)}
                    placeholder="Assign a recruiter…"
                    ariaLabel="Assigned recruiter"
                    disabled={actions.busy === 'owner'}
                  />
                ) : (
                  <p className="text-sm font-medium text-fg">{detail.owner?.name || <span className="text-fg-subtle">Unassigned</span>}</p>
                )}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium text-fg-muted" title="The employee who referred this candidate earns the referral reward on hire">Referred by</p>
                {manage ? (
                  <EmployeePicker
                    value={detail.referredBy}
                    onChange={(v) => actions.setReferrer(detail.id, v)}
                    placeholder="Not referred"
                    ariaLabel="Referred by"
                    disabled={actions.busy === 'referrer'}
                  />
                ) : (
                  <p className="text-sm font-medium text-fg">{detail.referredBy?.name || <span className="text-fg-subtle">Not referred</span>}</p>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="sticky -top-4 z-[2] -mx-4 bg-surface px-4 pt-1 sm:-top-5 sm:-mx-6 sm:px-6">
              <Tabs tabs={tabs} value={tab} onChange={setTab} idPrefix="candidate" ariaLabel="Candidate sections" />
            </div>

            <div role="tabpanel" id={`candidate-panel-${tab}`} aria-labelledby={`candidate-tab-${tab}`} className="pb-2">
              {tab === 'overview' && <OverviewTab detail={detail} />}
              {tab === 'resume' && <ResumeViewer candidateId={detail.candidate.id} fileName={detail.candidate.resumeName} className="h-[70vh]" />}
              {tab === 'reviews' && <ReviewsTab applicationId={detail.id} candidateName={detail.candidate.name} canAct={active} onChanged={reload} />}
              {tab === 'timeline' && <TimelineTab events={detail.timeline} />}
              {tab === 'interviews' && (renderInterviews
                ? renderInterviews(detail, reload)
                : <InterviewsTab interviews={detail.interviews} onSchedule={onScheduleInterview && manage && active ? () => onScheduleInterview(detail.id, detail) : undefined} />)}
              {tab === 'tests' && (renderTests
                ? renderTests(detail, reload)
                : (
                  <TestsTab
                    tests={detail.tests}
                    onSendTest={onSendTest && manage && active ? () => onSendTest(detail.id, detail) : undefined}
                    onOpenAttempt={onOpenTestAttempt ? (attemptId) => onOpenTestAttempt(attemptId, detail) : undefined}
                    onShareLink={onShareTestLink && manage ? (t) => onShareTestLink(t.id, detail) : undefined}
                  />
                ))}
              {tab === 'offer' && (renderOffer
                ? renderOffer(detail, reload)
                : <OfferTab offer={detail.offer} onOffer={onOffer && canOffer && (detail.offer || active) ? () => onOffer(detail.id, detail) : undefined} />)}
              {tab === 'notes' && (
                <NotesTab
                  events={detail.timeline}
                  canAdd
                  isSaving={actions.busy === 'note'}
                  onAdd={(text) => actions.addNote(detail.id, text)}
                />
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      <RejectDialog
        open={rejectOpen}
        candidateName={detail?.candidate.name || 'candidate'}
        isSaving={actions.busy === 'reject'}
        error={actions.rejectError}
        onClose={() => setRejectOpen(false)}
        onConfirm={async (reason, notify) => {
          if (!detail) return;
          if (await actions.reject(detail.id, reason, notify)) setRejectOpen(false);
        }}
      />
    </>
  );
}
