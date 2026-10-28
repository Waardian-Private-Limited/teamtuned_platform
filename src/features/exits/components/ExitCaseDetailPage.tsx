'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarClock, FilePlus2, Gift, UserPlus } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { SelectField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { RequestDrawer } from '@/features/approvals/components/RequestDrawer';
import { inr, pct } from '@/features/compensation/utils/format';
import { usePermission } from '@/lib/hooks/usePermission';
import { EMPLOYEE_PERMISSIONS } from '@/features/employees/constants/employees.constants';
import { formatDate, formatDateTime } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import {
  DOC_TYPES, EXIT_PERMISSIONS, OFFER_KIND_LABEL, REASON_LABEL, REHIRE_LABEL, SHORTFALL_LABEL, TIMELINE_KIND_LABEL, TYPE_LABEL, isOpen,
} from '../constants/exits.constants';
import { useExitsBasePath } from '../hooks/useExitsBasePath';
import { useLoad } from '../hooks/useLoad';
import type { ExitCaseDetail, ExitDocType, ExitOffer, RehireEligibility } from '../types/exits';
import { ExitDocumentsList } from './ExitDocumentsList';
import { ExitProgress } from './ExitProgress';
import { LastDayDialog } from './LastDayDialog';
import { OfferBuilderDialog } from './OfferBuilderDialog';
import { ClearanceBoard } from './ClearanceBoard';
import { InterviewAnswersPanel } from './InterviewForm';
import { RehireDialog } from './RehireDialog';
import { SettlementPanel } from './SettlementPanel';
import { Card, ConfirmNote, Fact, OfferPill, Skeleton, StatusPill } from './parts';

function Flags({ c, canManage, onSaved }: { c: ExitCaseDetail; canManage: boolean; onSaved: () => void }) {
  const [regrettable, setRegrettable] = React.useState<'yes' | 'no' | null>(c.regrettable === null ? null : c.regrettable ? 'yes' : 'no');
  const [rehire, setRehire] = React.useState<RehireEligibility | null>(c.rehire_eligibility);
  const [note, setNote] = React.useState(c.rehire_note || '');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    try { await api.setFlags(c.id, { regrettable: regrettable === null ? undefined : regrettable === 'yes', rehire_eligibility: rehire ?? undefined, rehire_note: note.trim() }); showSuccess('Saved'); setErr(null); onSaved(); } catch (e) { setErr(messageOf(e)); } finally { setBusy(false); }
  };
  if (!canManage) return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      <Fact label="Regrettable loss" value={c.regrettable === null ? null : c.regrettable ? 'Yes' : 'No'} />
      <Fact label="Rehire eligibility" value={c.rehire_eligibility ? REHIRE_LABEL[c.rehire_eligibility] : null} />
      <Fact label="Note" value={c.rehire_note} wide />
    </dl>
  );
  return (
    <div className="space-y-3">
      {err && <Alert message={err} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField<'yes' | 'no'> label="Regrettable loss" value={regrettable} onChange={setRegrettable} placeholder="Not set" options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
        <SelectField<RehireEligibility> label="Rehire eligibility" value={rehire} onChange={setRehire} placeholder="Not set" options={(Object.keys(REHIRE_LABEL) as RehireEligibility[]).map((k) => ({ value: k, label: REHIRE_LABEL[k] }))} />
      </div>
      <Textarea label="Rehire note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      <Btn variant="primary" busy={busy} onClick={save}>Save</Btn>
    </div>
  );
}

function OfferRow({ o, canAct, onSend, onWithdraw }: { o: ExitOffer; canAct: boolean; onSend: () => void; onWithdraw: () => void }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-fg"><Gift className="h-4 w-4 text-fg-muted" /> {OFFER_KIND_LABEL[o.kind]}</p>
        <OfferPill status={o.status} />
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {o.hike && <Fact label="Hike" value={`${inr(o.hike.previous_ctc)} to ${inr(o.hike.new_ctc)} (${pct(o.hike.percent_change)}) from ${formatDate(o.hike.effective_from)}`} wide />}
        {o.bonus && <Fact label="Retention bonus" value={`${inr(o.bonus.amount)} in ${o.bonus.month}, ${o.bonus.clawback_months} month clawback`} wide />}
        {o.expires_at && <Fact label="Respond by" value={formatDate(o.expires_at.slice(0, 10))} />}
        {o.responded_at && <Fact label="Answered" value={formatDateTime(o.responded_at)} />}
        {o.note && <Fact label="Note" value={o.note} wide />}
      </dl>
      {canAct && (o.status === 'draft' || o.status === 'sent') && (
        <div className="mt-3 flex flex-wrap gap-2">
          {o.status === 'draft' && <Btn variant="primary" onClick={onSend}>Send to employee</Btn>}
          <Btn onClick={onWithdraw}>Withdraw offer</Btn>
        </div>
      )}
    </div>
  );
}

/** One exit case for HR (or the approver): decision, counter-offers, last day, flags, documents and the event timeline. */
export function ExitCaseDetailPage({ id }: { id: number }) {
  const base = useExitsBasePath();
  const { can } = usePermission();
  const canManage = can(EXIT_PERMISSIONS.MANAGE);
  const canSettle = can(EXIT_PERMISSIONS.SETTLE) || canManage;
  const canRehire = can(EMPLOYEE_PERMISSIONS.ADD);
  const q = useLoad(() => api.getExit(id), [id]);
  const events = useLoad(async () => { const t = await api.timeline(id); return Array.isArray(t) ? t : t.events; }, [id]);
  const c = q.data;
  const showClearance = Boolean(c && (c.clearance || ['accepted', 'serving_notice', 'clearance', 'settlement', 'exited'].includes(c.status)));
  const showSettlement = Boolean(c && (c.settlement || ['clearance', 'settlement', 'exited'].includes(c.status)));
  const showInterview = Boolean(c && (c.interview || ['accepted', 'serving_notice', 'clearance', 'settlement', 'exited'].includes(c.status)));
  const clr = useLoad(() => (c && showClearance && !c.clearance ? api.clearance(id) : Promise.resolve(null)), [id, c?.status, showClearance]);
  const form = useLoad(() => (showInterview && !c?.interview?.questions?.length ? api.interviewForm().catch(() => ({ questions: [] })) : Promise.resolve({ questions: [] })), [showInterview]);
  const [rehireOpen, setRehireOpen] = React.useState(false);
  const [reviewId, setReviewId] = React.useState<number | null>(null);
  const [offerOpen, setOfferOpen] = React.useState(false);
  const [lastDay, setLastDay] = React.useState(false);
  const [docType, setDocType] = React.useState<ExitDocType | null>('relieving_letter');
  const [genBusy, setGenBusy] = React.useState(false);
  const [offerAction, setOfferAction] = React.useState<{ offer: ExitOffer; kind: 'send' | 'withdraw' } | null>(null);
  const [actionBusy, setActionBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const refresh = () => { q.reload(); events.reload(); clr.reload(); };
  const open = c ? isOpen(c.status) : false;
  const pendingRequest = c?.approval && c.approval.status === 'pending' ? c.approval.requestId : c?.approval_request_id && c.status === 'submitted' ? c.approval_request_id : null;

  const generate = async () => {
    if (!docType) return;
    setGenBusy(true);
    try { await api.generateDocument(id, docType); showSuccess('Document generated'); refresh(); } catch (e) { setErr(messageOf(e)); } finally { setGenBusy(false); }
  };
  const runOffer = async (note: string) => {
    void note;
    if (!offerAction) return;
    setActionBusy(true);
    try {
      await (offerAction.kind === 'send' ? api.sendOffer(id, offerAction.offer.id) : api.withdrawOffer(id, offerAction.offer.id));
      showSuccess(offerAction.kind === 'send' ? 'Offer sent' : 'Offer withdrawn'); setOfferAction(null); refresh();
    } catch (e) { setErr(messageOf(e)); setOfferAction(null); } finally { setActionBusy(false); }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-8">
      <Link href={base} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> All exits</Link>
      {(q.error || err) && <Alert message={q.error || err || ''} />}
      {q.loading && !c ? <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-48" /></div> : c && (
        <>
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="break-words text-xl font-extrabold text-fg sm:text-2xl">{c.employee.name}</h1>
                <p className="text-sm text-fg-muted">{[c.employee.code, c.employee.designation, c.employee.department].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2"><StatusPill status={c.status} /><span className="text-sm font-semibold text-fg">{TYPE_LABEL[c.type]}</span></div>
            </div>
            <ExitProgress c={c} />
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact label="Reason" value={c.reason_category ? REASON_LABEL[c.reason_category] : null} />
              <Fact label="Resigned on" value={formatDate(c.resigned_on)} />
              <Fact label="Notice period" value={c.notice_days != null ? `${c.notice_days} days` : null} />
              <Fact label="Notice ends" value={formatDate(c.notice_end)} />
              <Fact label="Requested last day" value={formatDate(c.requested_lwd)} />
              <Fact label="Agreed last day" value={formatDate(c.agreed_lwd)} />
              <Fact label="Shortfall" value={c.shortfall_days ? `${c.shortfall_days} days${c.shortfall_action ? `, ${SHORTFALL_LABEL[c.shortfall_action].toLowerCase()}` : ''}` : 'None'} />
              <Fact label="Started by" value={c.initiated_by === 'employee' ? 'Employee' : 'HR'} />
              {c.reason_text && <Fact label="Details" value={c.reason_text} wide />}
            </dl>
            {c.withdraw_requested && <p className="mt-3 text-sm font-medium text-[var(--tt-warning)]">The employee asked to withdraw this exit; it needs a decision.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {pendingRequest && <Btn variant="primary" onClick={() => setReviewId(pendingRequest)}>Review request</Btn>}
              {open && (c.status === 'submitted' || c.status === 'retention') && <Btn icon={<Gift className="h-4 w-4" />} onClick={() => setOfferOpen(true)}>Counter-offer</Btn>}
              {c.status === 'exited' && canRehire && <Btn icon={<UserPlus className="h-4 w-4" />} onClick={() => setRehireOpen(true)}>Rehire</Btn>}
              {canManage && c.agreed_lwd && ['accepted', 'serving_notice'].includes(c.status) && <Btn icon={<CalendarClock className="h-4 w-4" />} onClick={() => setLastDay(true)}>Change last day</Btn>}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Counter-offers">
              {c.offers.length === 0 ? <p className="text-sm text-fg-muted">No offers made.</p> : (
                <div className="space-y-3">{c.offers.map((o) => <OfferRow key={o.id} o={o} canAct={open} onSend={() => setOfferAction({ offer: o, kind: 'send' })} onWithdraw={() => setOfferAction({ offer: o, kind: 'withdraw' })} />)}</div>
              )}
            </Card>
            <Card title="Flags and rehire"><Flags key={c.updated_at} c={c} canManage={canManage} onSaved={refresh} /></Card>
            {showClearance && (
              <Card title="Clearance" className="lg:col-span-2">
                <ClearanceBoard caseId={id} items={c.clearance ?? clr.data} canManage={canManage} loading={clr.loading} error={clr.error} onChanged={refresh} />
              </Card>
            )}
            {showSettlement && (
              <Card title="Full and final settlement" className="lg:col-span-2">
                <SettlementPanel caseId={id} settlement={c.settlement ?? null} canSettle={canSettle} canManage={canManage} onChanged={refresh} onReview={setReviewId} />
              </Card>
            )}
            {showInterview && (
              <Card title="Exit interview" className="lg:col-span-2">
                <InterviewAnswersPanel questions={c.interview?.questions?.length ? c.interview.questions : form.data?.questions ?? []} response={c.interview} />
              </Card>
            )}
            <Card title="Documents" className="lg:col-span-2">
              <ExitDocumentsList docs={c.documents ?? []} getUrl={(d) => api.documentUrl(id, d)} />
              {canManage && (
                <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-end">
                  <div className="sm:w-72"><SelectField<ExitDocType> label="Generate a document" value={docType} onChange={setDocType} options={DOC_TYPES} /></div>
                  <Btn variant="primary" icon={<FilePlus2 className="h-4 w-4" />} busy={genBusy} disabled={!docType} onClick={generate}>Generate</Btn>
                </div>
              )}
            </Card>
            <Card title="Timeline" className="lg:col-span-2">
              {events.error ? <Alert message={events.error} /> : events.loading ? <Skeleton className="h-20" /> : !events.data?.length ? <p className="text-sm text-fg-muted">No events yet.</p> : (
                <ol className="space-y-3 border-l border-line pl-4">
                  {events.data.map((e, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-[var(--tt-primary)]" />
                      <p className="text-sm font-semibold text-fg">{TIMELINE_KIND_LABEL[e.kind] || e.kind.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-fg-muted">{[formatDateTime(e.at), e.actor].filter(Boolean).join(' · ')}</p>
                      {e.detail && <p className="mt-0.5 break-words text-sm text-fg-muted">{e.detail}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          {rehireOpen && <RehireDialog employee={{ id: c.employee.id, name: c.employee.name, employee_code: c.employee.code }} onClose={() => setRehireOpen(false)} />}
          <OfferBuilderDialog open={offerOpen} caseId={id} onClose={() => setOfferOpen(false)} onDone={() => { setOfferOpen(false); refresh(); }} />
          <LastDayDialog open={lastDay} c={c} onClose={() => setLastDay(false)} onDone={() => { setLastDay(false); refresh(); }} />
          <ConfirmNote open={Boolean(offerAction)} busy={actionBusy} danger={offerAction?.kind === 'withdraw'} cta={offerAction?.kind === 'send' ? 'Send' : 'Withdraw'}
            title={offerAction?.kind === 'send' ? 'Send this offer to the employee?' : 'Withdraw this offer?'} onClose={() => setOfferAction(null)} onConfirm={runOffer} />
        </>
      )}
      <RequestDrawer id={reviewId} onClose={() => setReviewId(null)} onChanged={refresh} />
    </div>
  );
}
