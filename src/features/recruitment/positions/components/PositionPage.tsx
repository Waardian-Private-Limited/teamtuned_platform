'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MoreHorizontal, QrCode, UserPlus, Users } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { ActionMenu } from '../../shared/components/ActionMenu';
import { PositionStatusPill, PublishedBadge } from '../../shared/components/PositionStatusPill';
import { RejectDialog } from '../../shared/components/RejectDialog';
import { Tabs } from '../../shared/components/Tabs';
import { useApplicationActions } from '../../shared/hooks/useApplicationActions';
import { useRecruitmentAccess } from '../../shared/hooks/useRecruitmentAccess';
import { useRecruitmentBase } from '../../shared/hooks/useRecruitmentBase';
import { CareersOffNotice, CareersQrDialog } from '../../shared/components/CareersQrDialog';
import { useCareersSite } from '../../shared/hooks/useCareersSite';
import { useFeatures } from '@/lib/hooks/useFeatures';
import { PickFromPoolDialog } from '../../pool/components/PickFromPoolDialog';
import { POOL_FEATURE } from '../../pool/constants/pool.constants';
import type { ApplicationCard } from '../../shared/types/recruitment.model';
import { openingsText, positionLocation } from '../../shared/utils/format';
import { usePositionPage } from '../hooks/usePositionPage';
import { availableStatusActions, STATUS_ACTION_LABELS, usePositionStatusActions, type PositionStatusAction } from '../hooks/usePositionStatusActions';
import { AddCandidateDialog } from './AddCandidateDialog';
import { ClosePositionDialog } from './ClosePositionDialog';
import { PipelineBoard, PipelineSkeleton } from './pipeline/PipelineBoard';
import { PositionDetailsView } from './PositionDetailsView';
import { PositionEditor } from './editor/PositionEditor';
import { CandidateDrawerHost } from '../../interviews/components/CandidateDrawerHost';
import { OfferStepDialog } from '../../reviews/components/OfferStepDialog';
import { SendTestDialog } from '../../interviews/components/tests/SendTestDialog';
import { ScheduleInterviewDialog } from '../../interviews/components/ScheduleInterviewDialog';

type Tab = 'pipeline' | 'details';

export interface PositionPageProps {
  positionId: number;
}

export function PositionPage({ positionId }: PositionPageProps) {
  const access = useRecruitmentAccess();
  const base = useRecruitmentBase();
  const router = useRouter();
  const params = useSearchParams();
  const page = usePositionPage(positionId);
  const { position } = page;

  const [tab, setTab] = useState<Tab>(params?.get('tab') === 'details' ? 'details' : 'pipeline');
  const [editing, setEditing] = useState(params?.get('edit') === '1');
  const [openApp, setOpenApp] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [rejecting, setRejecting] = useState<ApplicationCard | null>(null);
  const [closing, setClosing] = useState(false);
  const [assessing, setAssessing] = useState<ApplicationCard | null>(null);
  const [interviewing, setInterviewing] = useState<ApplicationCard | null>(null);
  const [offering, setOffering] = useState<ApplicationCard | null>(null);
  const [openTab, setOpenTab] = useState<'offer' | undefined>(undefined);

  const statusActions = usePositionStatusActions(page.loadPosition);
  const appActions = useApplicationActions(useCallback((id: number, action: string) => {
    if (action === 'reject') page.removeCard(id);
    page.loadBoard();
  }, [page]));
  // The server sends the link for a published job on an enabled careers page; built here on a server that does not.
  const careersSite = useCareersSite();
  const careersLink = position?.published
    ? position.careersUrl || (careersSite.url && position.slug ? `${careersSite.url}/${position.slug}` : null)
    : null;
  const [sharing, setSharing] = useState(false);
  const [picking, setPicking] = useState(false);
  const hasPool = useFeatures().hasFeature(POOL_FEATURE);

  const canManage = access.canManage;

  const onStatus = (action: PositionStatusAction) => {
    if (!position) return;
    if (action === 'close') setClosing(true);
    else statusActions.run(position, action);
  };

  if (page.notFound) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-line bg-surface">
        <EmptyState
          illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }}
          title={page.notFound === 403 ? 'You cannot open this position' : 'Position not found'}
          description={page.notFound === 403 ? 'Only the recruiting team and the hiring manager can see it.' : 'It may have been removed, or the link is wrong.'}
          action={{ label: 'Back to positions', onClick: () => router.push(`${base}/positions`) }}
        />
      </div>
    );
  }

  const statusMenu = position ? availableStatusActions(position) : [];
  const total = page.columns.reduce((n, c) => n + c.items.length + c.more, 0);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Header */}
      <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
        <Link href={`${base}/positions`} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg">
          <ArrowLeft className="h-3.5 w-3.5" />Positions
        </Link>
        {page.isLoading && !position ? (
          <div className="animate-pulse space-y-2">
            <div className="h-6 w-64 rounded bg-bg-subtle" />
            <div className="h-4 w-80 rounded bg-bg-subtle/70" />
          </div>
        ) : position ? (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-tight text-fg sm:text-xl">{position.title}</h1>
                <PositionStatusPill status={position.status} />
                <PublishedBadge published={position.published} />
              </div>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-fg-muted">
                {position.department && <span>{position.department.name}</span>}
                <span>{positionLocation(position)}</span>
                <span className="font-semibold tabular-nums text-fg">{openingsText(position.hiredCount, position.openings)}</span>
                {position.hiringManager && <span>HM <span className="font-semibold text-fg">{position.hiringManager.name}</span></span>}
                {position.closesOn && <span>Closes {formatDate(position.closesOn)}</span>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setSharing(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm">
                <QrCode className="h-3.5 w-3.5" />Share job
              </button>
              {canManage && statusMenu.filter((a) => a !== 'close').slice(0, 2).map((a) => (
                <button
                  key={a}
                  type="button"
                  disabled={statusActions.busyId === position.id}
                  onClick={() => onStatus(a)}
                  className={cx(
                    'inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold disabled:opacity-50 sm:text-sm',
                    a === 'publish'
                      ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]'
                      : 'border border-line bg-surface text-fg hover:bg-bg-subtle'
                  )}
                >
                  {STATUS_ACTION_LABELS[a]}
                </button>
              ))}
              {canManage && statusMenu.includes('close') && (
                <ActionMenu
                  label="More position actions"
                  items={[{ key: 'close', label: STATUS_ACTION_LABELS.close, danger: true, onSelect: () => onStatus('close') }]}
                  triggerClassName="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-fg hover:bg-bg-subtle"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </ActionMenu>
              )}
            </div>
          </div>
        ) : null}
        {page.error && <div className="mt-3"><Alert message={page.error} tone="error" /></div>}
        <div className="mt-3 flex items-end justify-between gap-3">
          <Tabs
            tabs={[{ value: 'pipeline', label: 'Pipeline', count: total }, { value: 'details', label: 'Details' }] as const}
            value={tab}
            onChange={(t) => { setTab(t); if (t === 'pipeline') setEditing(false); }}
            idPrefix="position"
            className="flex-1"
          />
          {tab === 'pipeline' && canManage && position && position.status !== 'closed' && (
            <div className="mb-1.5 flex shrink-0 gap-2">
              {hasPool && position.status !== 'filled' && (
                <button type="button" onClick={() => setPicking(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:bg-bg-subtle">
                  <Users className="h-3.5 w-3.5" /><span className="hidden sm:inline">From talent pool</span><span className="sm:hidden">Pool</span>
                </button>
              )}
              <button type="button" onClick={() => setAddOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]">
                <UserPlus className="h-3.5 w-3.5" />Add candidate
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div role="tabpanel" id={`position-panel-${tab}`} aria-labelledby={`position-tab-${tab}`} className="min-h-0 flex-1">
        {tab === 'pipeline' ? (
          page.isBoardLoading ? <PipelineSkeleton /> : page.boardError ? (
            <Alert message={page.boardError} tone="error" />
          ) : (
            <PipelineBoard
              columns={page.columns}
              canManage={canManage}
              candidatesHref={`${base}/candidates?position_id=${positionId}`}
              onOpen={(c) => setOpenApp(c.id)}
              onMove={(c, to) => (to === 'assessment' ? setAssessing(c) : to === 'interview' ? setInterviewing(c) : to === 'offer' ? setOffering(c) : page.moveCard(c, to))}
              onReject={(c) => { appActions.clearRejectError(); setRejecting(c); }}
            />
          )
        ) : position ? (
          editing && canManage ? (
            <PositionEditor
              initial={position}
              onCancel={() => setEditing(false)}
              onSaved={() => { setEditing(false); page.reload(); }}
            />
          ) : (
            <div className="h-full overflow-y-auto tt-scroll-hidden">
              <PositionDetailsView position={position} canEdit={canManage} onEdit={() => setEditing(true)} />
            </div>
          )
        ) : null}
      </div>

      {/* Moving a card to Interview: schedule it (or start it now), or move without one. */}
      <ScheduleInterviewDialog
        open={Boolean(interviewing)}
        onClose={() => setInterviewing(null)}
        applicationId={interviewing?.id ?? 0}
        positionId={positionId}
        candidateName={interviewing?.candidate.name}
        onDone={() => page.loadBoard()}
        onSkip={interviewing ? () => page.moveCard(interviewing, 'interview') : undefined}
      />

      {/* Moving a card to Assessment: send any test (which moves it), or move without one. */}
      <SendTestDialog
        open={Boolean(assessing)}
        onClose={() => setAssessing(null)}
        applicationId={assessing?.id ?? 0}
        positionId={positionId}
        candidateName={assessing?.candidate.name}
        candidatePhone={assessing?.candidate.phone}
        candidateEmail={assessing?.candidate.email}
        onDone={() => page.loadBoard()}
        onSkip={assessing ? () => page.moveCard(assessing, 'assessment') : undefined}
      />

      {/* Moving a card to Offer: send for review, review pack + offline decision, create the offer, or just move. */}
      <OfferStepDialog
        open={Boolean(offering)}
        onClose={() => setOffering(null)}
        applicationId={offering?.id ?? 0}
        candidateName={offering?.candidate.name}
        onDone={() => page.loadBoard()}
        onCreateOffer={offering ? () => { const c = offering; page.moveCard(c, 'offer'); setOpenTab('offer'); setOpenApp(c.id); } : undefined}
        onSkip={offering ? () => page.moveCard(offering, 'offer') : undefined}
      />

      <CandidateDrawerHost
        applicationId={openApp}
        onClose={() => { setOpenApp(null); setOpenTab(undefined); }}
        onChanged={() => page.loadBoard()}
        initialTab={openTab}
      />

      {position && (
        <AddCandidateDialog
          open={addOpen}
          positionId={position.id}
          positionTitle={position.title}
          onClose={() => setAddOpen(false)}
          onAdded={(id) => { setAddOpen(false); page.loadBoard(); if (id) setOpenApp(id); }}
        />
      )}

      <RejectDialog
        open={Boolean(rejecting)}
        candidateName={rejecting?.candidate.name || ''}
        isSaving={appActions.busy === 'reject'}
        error={appActions.rejectError}
        onClose={() => setRejecting(null)}
        onConfirm={async (reason, notify) => {
          if (rejecting && (await appActions.reject(rejecting.id, reason, notify))) setRejecting(null);
        }}
      />

      <ClosePositionDialog
        open={closing}
        title={position?.title || ''}
        busy={statusActions.busyId === position?.id}
        onClose={() => setClosing(false)}
        onConfirm={async () => { if (position && (await statusActions.run(position, 'close'))) setClosing(false); }}
      />

      {position && hasPool && (
        <PickFromPoolDialog
          open={picking}
          positionId={position.id}
          positionTitle={position.title}
          onClose={() => setPicking(false)}
          onAdded={() => page.loadBoard()}
        />
      )}

      {position && (
        <CareersQrDialog
          open={sharing}
          onClose={() => setSharing(false)}
          url={careersLink}
          title={position.title}
          subtitle={[position.department?.name, positionLocation(position)].filter(Boolean).join(' · ')}
          unavailable={position.published
            ? <CareersOffNotice canSettings={careersSite.canSettings} base={base} />
            : <>This position is not on the careers page yet. {canManage ? 'Use Publish above, then share it.' : 'Ask the recruiter to publish it.'}</>}
          companyName={careersSite.companyName}
        />
      )}
    </div>
  );
}
