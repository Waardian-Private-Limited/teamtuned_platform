'use client';

import { useCallback, useState } from 'react';
import { CandidateDrawer, type CandidateDrawerTab } from '../../shared/components/CandidateDrawer';
import { useRecruitmentAccess } from '../../shared/hooks/useRecruitmentAccess';
import type { ApplicationDetail } from '../../shared/types/recruitment.model';
import { OfferDialog } from '../../offers/components/OfferDialog';
import { OfferDrawer } from '../../offers/components/OfferDrawer';
import { HireDialog } from '../../offers/components/HireDialog';
import type { OfferDetailDto, OfferListItemDto } from '../../offers/types/offers.dto';
import { ScheduleInterviewDialog } from './ScheduleInterviewDialog';
import { SendTestDialog } from './tests/SendTestDialog';
import { TestAttemptDrawer } from './tests/TestAttemptDrawer';
import { TestLinkDialog } from './tests/TestLinkDialog';
import { OfferStepDialog } from '../../reviews/components/OfferStepDialog';
import { moveStage } from '../../shared/api/recruitment.api';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';

const LIVE_OFFER = new Set(['draft', 'pending_approval', 'approved', 'sent', 'accepted']);

/**
 * The shared CandidateDrawer with its schedule / test / offer callbacks wired to
 * this folder's dialogs. Drop it on any recruitment page.
 */
export function CandidateDrawerHost({
  applicationId,
  onClose,
  onChanged,
  initialTab,
}: {
  applicationId: number | null;
  onClose: () => void;
  /** After anything changed (stage, interview, test, offer). */
  onChanged?: () => void;
  initialTab?: CandidateDrawerTab;
}) {
  const access = useRecruitmentAccess();
  const [refreshKey, setRefreshKey] = useState(0);
  const [schedule, setSchedule] = useState<{ detail: ApplicationDetail; moving: boolean } | null>(null);
  const [sendTest, setSendTest] = useState<{ detail: ApplicationDetail; moving: boolean } | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [linkFor, setLinkFor] = useState<{ attemptId: number; detail: ApplicationDetail } | null>(null);
  const [offerCreate, setOfferCreate] = useState<ApplicationDetail | null>(null);
  const [offerStep, setOfferStep] = useState<ApplicationDetail | null>(null);
  const [offerEdit, setOfferEdit] = useState<{ offer: OfferDetailDto; applicationId: number; candidateName: string } | null>(null);
  const [offerItem, setOfferItem] = useState<OfferListItemDto | null>(null);
  const [offerReload, setOfferReload] = useState(0);
  const [hire, setHire] = useState<{ offerId: number; candidateName: string } | null>(null);

  const closeLink = useCallback(() => setLinkFor(null), []);

  const changed = () => {
    setRefreshKey((k) => k + 1);
    onChanged?.();
  };

  function openOffer(id: number, detail: ApplicationDetail) {
    const o = detail.offer;
    if (o && LIVE_OFFER.has(o.status)) {
      setOfferItem({
        id: o.id,
        application: { id, candidateName: detail.candidate.name, positionTitle: detail.position.title },
        status: o.status as OfferListItemDto['status'],
        designation: o.designation,
        annualCtc: o.annualCtc,
        joiningDate: o.joiningDate,
        expiresOn: o.expiresOn,
        sentAt: o.sentAt,
        respondedAt: o.respondedAt,
      });
    } else {
      setOfferCreate(detail);
    }
  }

  return (
    <>
      <CandidateDrawer
        applicationId={applicationId}
        onClose={onClose}
        onChanged={() => onChanged?.()}
        refreshKey={refreshKey}
        initialTab={initialTab}
        onScheduleInterview={(_, d, moving) => setSchedule({ detail: d, moving: Boolean(moving) })}
        onSendTest={(_, d, moving) => setSendTest({ detail: d, moving: Boolean(moving) })}
        onOpenTestAttempt={(id) => setAttemptId(id)}
        onShareTestLink={(id, d) => setLinkFor({ attemptId: id, detail: d })}
        onOffer={openOffer}
        onOfferStep={(_, d) => setOfferStep(d)}
      />

      <OfferStepDialog
        open={Boolean(offerStep)}
        onClose={() => setOfferStep(null)}
        applicationId={offerStep?.id ?? 0}
        candidateName={offerStep?.candidate.name}
        onDone={changed}
        onCreateOffer={offerStep && access.canOffer ? () => { const d = offerStep; moveStage(d.id, 'offer').catch(() => {}).finally(() => { changed(); openOffer(d.id, d); }); } : undefined}
        onSkip={offerStep ? () => { const id = offerStep.id; moveStage(id, 'offer').then(changed).catch((err) => showError(messageOf(err))); } : undefined}
      />

      <ScheduleInterviewDialog
        open={Boolean(schedule)}
        onClose={() => setSchedule(null)}
        applicationId={schedule?.detail.id ?? 0}
        positionId={schedule?.detail.position.id ?? null}
        candidateName={schedule?.detail.candidate.name}
        onDone={changed}
        onSkip={schedule?.moving ? () => { const id = schedule.detail.id; moveStage(id, 'interview').then(changed).catch((err) => showError(messageOf(err))); } : undefined}
      />

      <SendTestDialog
        open={Boolean(sendTest)}
        onClose={() => setSendTest(null)}
        applicationId={sendTest?.detail.id ?? 0}
        positionId={sendTest?.detail.position.id ?? null}
        candidateName={sendTest?.detail.candidate.name}
        candidatePhone={sendTest?.detail.candidate.phone}
        candidateEmail={sendTest?.detail.candidate.email}
        onDone={changed}
        onSkip={sendTest?.moving ? () => { const id = sendTest.detail.id; moveStage(id, 'assessment').then(changed).catch((err) => showError(messageOf(err))); } : undefined}
      />

      <TestLinkDialog
        attemptId={linkFor?.attemptId ?? null}
        onClose={closeLink}
        onChanged={changed}
        candidateName={linkFor?.detail.candidate.name}
        candidatePhone={linkFor?.detail.candidate.phone}
        candidateEmail={linkFor?.detail.candidate.email}
        testName={linkFor?.detail.tests.find((t) => t.id === linkFor.attemptId)?.testName}
      />

      <TestAttemptDrawer attemptId={attemptId} onClose={() => setAttemptId(null)} onChanged={changed} canManage={access.canManage} />

      <OfferDialog
        open={Boolean(offerCreate) || Boolean(offerEdit)}
        onClose={() => { setOfferCreate(null); setOfferEdit(null); }}
        applicationId={offerEdit?.applicationId ?? offerCreate?.id ?? 0}
        offer={offerEdit?.offer ?? null}
        positionId={offerCreate?.position.id ?? null}
        candidateName={offerEdit?.candidateName ?? offerCreate?.candidate.name}
        onDone={() => { changed(); setOfferReload((k) => k + 1); }}
      />

      <OfferDrawer
        item={offerItem}
        reloadKey={offerReload}
        onClose={() => setOfferItem(null)}
        onChanged={changed}
        onEdit={(offer, appId, name) => setOfferEdit({ offer, applicationId: appId, candidateName: name })}
        onHire={(offer, name) => setHire({ offerId: offer.id, candidateName: name })}
      />

      <HireDialog
        offerId={hire?.offerId ?? null}
        candidateName={hire?.candidateName}
        onClose={() => setHire(null)}
        onHired={() => { changed(); setOfferReload((k) => k + 1); }}
      />
    </>
  );
}
