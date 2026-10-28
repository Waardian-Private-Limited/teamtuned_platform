'use client';

import React from 'react';
import { CalendarClock, Gift } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { inr, pct } from '@/features/compensation/utils/format';
import { daysBetween, formatDate, orgToday } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import { OFFER_KIND_LABEL, REASON_LABEL, TYPE_LABEL, isOpen } from '../constants/exits.constants';
import { useLoad } from '../hooks/useLoad';
import type { ExitCase, ExitOffer } from '../types/exits';
import { MyClearanceCard } from './MyClearanceCard';
import { MyInterviewCard } from './InterviewForm';
import { ExitDocumentsList } from './ExitDocumentsList';
import { ExitProgress } from './ExitProgress';
import { Card, ConfirmNote, Fact, OfferPill, Skeleton, StatusPill } from './parts';
import { ResignDialog } from './ResignDialog';

function OfferCard({ offer, onRespond }: { offer: ExitOffer; onRespond: (o: ExitOffer, a: 'accept' | 'decline') => void }) {
  const live = offer.status === 'sent';
  return (
    <div className="rounded-lg border border-line p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-fg"><Gift className="h-4 w-4 text-fg-muted" /> {OFFER_KIND_LABEL[offer.kind]}</p>
        <OfferPill status={offer.status} />
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {offer.hike && <Fact label="New annual CTC" value={<>{inr(offer.hike.new_ctc)} <span className="text-xs font-medium text-fg-muted">({pct(offer.hike.percent_change)}, from {formatDate(offer.hike.effective_from)})</span></>} wide />}
        {offer.bonus && <Fact label="Retention bonus" value={`${inr(offer.bonus.amount)} in ${offer.bonus.month}, repayable if you leave within ${offer.bonus.clawback_months} months`} wide />}
        {offer.note && <Fact label="Note from your manager" value={offer.note} wide />}
        {offer.expires_at && live && <Fact label="Respond by" value={formatDate(offer.expires_at.slice(0, 10))} />}
      </dl>
      {live && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn variant="primary" onClick={() => onRespond(offer, 'accept')}>Accept and stay</Btn>
          <Btn onClick={() => onRespond(offer, 'decline')}>Decline</Btn>
        </div>
      )}
    </div>
  );
}

function Countdown({ c }: { c: ExitCase }) {
  if (!c.agreed_lwd || !['accepted', 'serving_notice'].includes(c.status)) return null;
  const left = daysBetween(orgToday(), c.agreed_lwd);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-bg-subtle/60 p-3">
      <CalendarClock className="h-5 w-5 shrink-0 text-fg-muted" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-fg">{left > 0 ? `${left} ${left === 1 ? 'day' : 'days'} to go` : left === 0 ? 'Today is your last working day' : 'Your last working day has passed'}</p>
        <p className="text-xs text-fg-muted">Last working day {formatDate(c.agreed_lwd)}. You keep full access until then.</p>
      </div>
    </div>
  );
}

/** The employee's own exit: progress, the counter-offer to answer, the last day countdown and their documents. */
export function MyExitPage() {
  const mine = useLoad(() => api.getMine(), []);
  const c = mine.data?.case ?? null;
  const docs = useLoad(() => (c ? api.myDocuments() : Promise.resolve([])), [c?.id, c?.status]);
  const [resign, setResign] = React.useState(false);
  const [withdraw, setWithdraw] = React.useState(false);
  const [response, setResponse] = React.useState<{ offer: ExitOffer; action: 'accept' | 'decline' } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const act = async (fn: () => Promise<unknown>, ok: string, close: () => void) => {
    setBusy(true);
    try { await fn(); showSuccess(ok); close(); mine.reload(); } catch (e) { setBusy(false); return alertErr(e); } setBusy(false);
  };
  const [err, setErr] = React.useState<string | null>(null);
  const alertErr = (e: unknown) => setErr(messageOf(e));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-8">
      <header className="min-w-0">
        <h1 className="text-xl font-extrabold text-fg sm:text-2xl">My exit</h1>
        <p className="text-sm text-fg-muted">Your resignation, notice period and exit documents in one place.</p>
      </header>
      {(mine.error || err) && <Alert message={mine.error || err || ''} />}
      {mine.loading ? (
        <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-40" /></div>
      ) : !c ? (
        <Card>
          <EmptyState compact title="You have no exit in progress"
            description={mine.data?.eligible ? `If you decide to leave, you can resign here. Your notice period is ${mine.data.notice_days} days.` : mine.data?.blocked_reason || 'Resignation is not available for you right now.'}
            action={mine.data?.eligible ? { label: 'Resign', onClick: () => setResign(true) } : undefined} />
        </Card>
      ) : (
        <>
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={c.status} />
                <span className="text-sm font-semibold text-fg">{TYPE_LABEL[c.type]}</span>
                {c.withdraw_requested && <span className="text-xs font-medium text-[var(--tt-warning)]">Withdrawal waiting for HR</span>}
              </div>
              {isOpen(c.status) && !c.withdraw_requested && c.initiated_by === 'employee' && <Btn onClick={() => setWithdraw(true)}>Withdraw resignation</Btn>}
            </div>
            <ExitProgress c={c} />
            <div className="mt-4 space-y-4">
              <Countdown c={c} />
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
                <Fact label="Reason" value={c.reason_category ? REASON_LABEL[c.reason_category] : null} />
                <Fact label="Notice period" value={c.notice_days != null ? `${c.notice_days} days` : null} />
                <Fact label="Notice ends" value={formatDate(c.notice_end)} />
                <Fact label="Requested last day" value={formatDate(c.requested_lwd)} />
                <Fact label="Agreed last day" value={formatDate(c.agreed_lwd)} />
                {c.reason_text && <Fact label="Your note" value={c.reason_text} wide />}
              </dl>
            </div>
          </Card>
          {c.offers.length > 0 && (
            <Card title="Counter-offer">
              <div className="space-y-3">{c.offers.filter((o) => o.status !== 'draft').map((o) => <OfferCard key={o.id} offer={o} onRespond={(offer, action) => setResponse({ offer, action })} />)}</div>
            </Card>
          )}
          {['accepted', 'serving_notice', 'clearance', 'settlement', 'exited'].includes(c.status) && <MyClearanceCard caseId={c.id} />}
          {['accepted', 'serving_notice', 'clearance', 'settlement', 'exited'].includes(c.status) && <MyInterviewCard />}
          <Card title="Documents">
            {docs.error ? <Alert message={docs.error} /> : docs.loading ? <Skeleton className="h-16" /> :
              <ExitDocumentsList docs={docs.data ?? []} getUrl={api.myDocumentUrl} empty="Your letters appear here once HR has generated them." />}
            <p className="mt-3 text-xs text-fg-muted">After your last day you will get an email with a link to download your letters without signing in.</p>
          </Card>
        </>
      )}

      <ResignDialog open={resign} onClose={() => setResign(false)} onDone={() => { setResign(false); mine.reload(); }} />
      <ConfirmNote open={withdraw} title="Withdraw your resignation?" busy={busy} cta="Withdraw" danger noteLabel="Note (optional)"
        body={c && !['submitted', 'retention'].includes(c.status) ? 'Your resignation is already accepted, so HR has to approve the withdrawal.' : 'You will continue as before.'}
        onClose={() => setWithdraw(false)} onConfirm={(note) => act(() => api.withdrawMine(note || undefined), 'Withdrawal sent', () => setWithdraw(false))} />
      <ConfirmNote open={Boolean(response)} title={response?.action === 'accept' ? 'Accept the counter-offer?' : 'Decline the counter-offer?'} busy={busy}
        cta={response?.action === 'accept' ? 'Accept and stay' : 'Decline'} noteLabel="Note (optional)"
        body={response?.action === 'accept' ? 'Your resignation will be withdrawn and you stay with the company.' : 'Your resignation goes back to your manager to accept.'}
        onClose={() => setResponse(null)} onConfirm={(note) => response && act(() => api.respondToOffer(response.offer.id, response.action, note || undefined), response.action === 'accept' ? 'Welcome back, you are staying' : 'Offer declined', () => setResponse(null))} />
    </div>
  );
}
