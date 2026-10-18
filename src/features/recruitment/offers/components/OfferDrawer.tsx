'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Ban, CheckCircle2, Download, FileCheck2, FilePlus2, Mail, Paperclip, Pencil, Share2, ShieldCheck, UserPlus } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { StatusPill } from '@/components/ui/StatusPill';
import { messageOf } from '@/lib/api/errors';
import { formatDate, formatDateTime } from '@/lib/datetime';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { useRecruitmentAccess } from '../../shared/hooks/useRecruitmentAccess';
import { useRecruitmentBase } from '../../shared/hooks/useRecruitmentBase';
import { openAsync } from '../../shared/utils/format';
import { btn, formatInr } from '../../interviews/lib/ui';
import { ConfirmDialog } from '../../interviews/lib/ConfirmDialog';
import * as api from '../api/offers.api';
import type { OfferDetailDto, OfferListItemDto } from '../types/offers.dto';
import { OFFER_STATUS_LABEL, offerTone } from '../constants/offers.constants';
import { OfferLetterDialog } from './OfferLetterDialog';
import { RecordResponseDialog } from './RecordResponseDialog';

export interface OfferDrawerProps {
  /** The list row that was opened; null closes. */
  item: OfferListItemDto | null;
  onClose: () => void;
  onChanged?: () => void;
  onEdit: (offer: OfferDetailDto, applicationId: number, candidateName: string) => void;
  onHire: (offer: OfferDetailDto, candidateName: string) => void;
  onOpenCandidate?: (applicationId: number) => void;
  /** Bump to make the drawer reload (e.g. after an edit dialog saved). */
  reloadKey?: number;
}

type Named = { id?: number | null; name?: string } | string | null | undefined;
const nameOf = (r: Named) => (typeof r === 'string' ? r : r?.name) || '—';

interface TimelineRow { key: string; label: string; at: string | null; note?: string | null }

const EVENT_LABEL: Record<string, string> = {
  offer_created: 'Draft created',
  offer_drafted: 'Draft created',
  offer_updated: 'Terms edited',
  offer_submitted: 'Submitted for approval',
  offer_approved: 'Approved',
  offer_rejected: 'Approval rejected',
  offer_sent: 'Offer sent',
  offer_viewed: 'Viewed by candidate',
  offer_accepted: 'Accepted',
  offer_declined: 'Declined',
  offer_withdrawn: 'Withdrawn',
  offer_expired: 'Expired',
  hired: 'Employee created',
};

export function OfferDrawer({ item, onClose, onChanged, onEdit, onHire, onOpenCandidate, reloadKey }: OfferDrawerProps) {
  const access = useRecruitmentAccess();
  const [offer, setOffer] = useState<OfferDetailDto | null>(null);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'share' | 'withdraw' | null>(null);
  const [letter, setLetter] = useState<'download' | 'email' | null>(null);
  const [recording, setRecording] = useState(false);
  const base = useRecruitmentBase();
  const documentsHref = `${base}/documents`;

  const applicationId = item?.application.id ?? null;
  const candidateName = item?.application.candidateName || '';

  const load = useCallback(async () => {
    if (!item) return;
    setLoading(true);
    try {
      const detail = await api.getApplicationDetail(item.application.id);
      const full = { ...item, ...(detail.offer || {}), id: detail.offer?.id ?? item.id, status: (detail.offer?.status ?? item.status) } as OfferDetailDto;
      setOffer(full);
      setEmployeeId(detail.application?.employeeId ?? detail.candidate?.employeeId ?? null);
      const events = (detail.timeline || [])
        .filter((e) => /offer|hired/.test(e.type))
        .map((e) => ({
          key: String(e.id),
          label: EVENT_LABEL[e.type] || e.type.replace(/_/g, ' '),
          at: e.createdAt,
          note: (e.actorName || e.actor?.name || null) as string | null,
        }));
      setTimeline(events);
    } catch (err) {
      showError(messageOf(err));
      setOffer(item as OfferDetailDto);
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  }, [item]);

  useEffect(() => {
    if (!item) { setOffer(null); setTimeline([]); return; }
    load();
  }, [item, load, reloadKey]);

  const steps = useMemo<TimelineRow[]>(() => {
    if (timeline.length) return timeline;
    if (!offer) return [];
    const rows: TimelineRow[] = [];
    if (offer.createdAt) rows.push({ key: 'c', label: 'Draft created', at: offer.createdAt });
    if (offer.sentAt) rows.push({ key: 's', label: 'Offer sent', at: offer.sentAt });
    if (offer.respondedAt) rows.push({ key: 'r', label: offer.status === 'declined' ? 'Declined' : 'Accepted', at: offer.respondedAt, note: offer.responseNote });
    return rows;
  }, [timeline, offer]);

  async function act(kind: 'submit' | 'share' | 'withdraw') {
    if (!offer) return;
    setBusy(kind);
    try {
      if (kind === 'submit') await api.submitOffer(offer.id);
      if (kind === 'share') await api.markShared(offer.id);
      if (kind === 'withdraw') await api.withdrawOffer(offer.id);
      showSuccess(kind === 'submit' ? 'Offer submitted' : kind === 'share' ? 'Marked as shared with the candidate' : 'Offer withdrawn');
      setConfirm(null);
      await load();
      onChanged?.();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  const refresh = useCallback(async () => { await load(); onChanged?.(); }, [load, onChanged]);

  const s = offer?.status;
  const canOffer = access.canOffer;
  const live = s !== 'withdrawn';

  return (
    <Drawer open={Boolean(item)} onClose={onClose} title="Offer" maxWidthClassName="sm:max-w-lg">
      {!offer ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-subtle" />)}</div>
      ) : (
        <div className={cx('space-y-5', loading && 'opacity-70')}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {onOpenCandidate && applicationId ? (
                <button type="button" onClick={() => onOpenCandidate(applicationId)} className="truncate text-left text-base font-bold text-fg hover:underline">
                  {candidateName}
                </button>
              ) : (
                <p className="truncate text-base font-bold text-fg">{candidateName}</p>
              )}
              <p className="truncate text-xs text-fg-muted">{item?.application.positionTitle}</p>
            </div>
            <StatusPill label={OFFER_STATUS_LABEL[offer.status] || offer.status} tone={offerTone(offer.status)} />
          </div>

          <div className="flex flex-wrap gap-2">
            {canOffer && (s === 'draft' || s === 'approved') && applicationId && (
              <button type="button" className={btn.small} onClick={() => onEdit(offer, applicationId, candidateName)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            {canOffer && s === 'draft' && (
              <button type="button" className={btn.small} disabled={busy !== null} onClick={() => act('submit')}>
                <ShieldCheck className="h-3.5 w-3.5" /> {busy === 'submit' ? 'Submitting…' : 'Submit for approval'}
              </button>
            )}
            {canOffer && live && (
              <button type="button" className={btn.small} onClick={() => setLetter('download')}>
                <Download className="h-3.5 w-3.5" /> {offer.letterFinal ? 'Download letter' : 'Draft letter'}
              </button>
            )}
            {canOffer && (s === 'approved' || s === 'sent') && (
              <button type="button" className={(s === 'approved' ? btn.smallPrimary : btn.small)} disabled={busy !== null} onClick={() => setLetter('email')}>
                <Mail className="h-3.5 w-3.5" /> {s === 'sent' ? 'Email again' : 'Email to candidate'}
              </button>
            )}
            {canOffer && s === 'approved' && (
              <button type="button" className={btn.small} disabled={busy !== null} onClick={() => setConfirm('share')}>
                <Share2 className="h-3.5 w-3.5" /> Shared another way
              </button>
            )}
            {canOffer && (s === 'approved' || s === 'sent') && (
              <button type="button" className={btn.small} disabled={busy !== null} onClick={() => setRecording(true)}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Record answer
              </button>
            )}
            {access.canHire && s === 'accepted' && !employeeId && (
              <button type="button" className={btn.smallPrimary} onClick={() => onHire(offer, candidateName)}>
                <UserPlus className="h-3.5 w-3.5" /> Hire
              </button>
            )}
            {canOffer && (s === 'draft' || s === 'pending_approval' || s === 'approved' || s === 'sent') && (
              <button type="button" className={btn.small} disabled={busy !== null} onClick={() => setConfirm('withdraw')}>
                <Ban className="h-3.5 w-3.5" /> Withdraw
              </button>
            )}
          </div>

          {s === 'accepted' && !employeeId && (
            <div className="rounded-lg border border-line bg-bg-subtle px-3 py-2.5 text-xs text-fg-muted">
              <p className="font-semibold text-fg">Next: hire</p>
              <p className="mt-0.5">Hire creates the employee (status Invited) with these terms and emails the onboarding invite. They log in, fill the onboarding form and documents, and you review and activate them in Employees. The resume{offer.signedLetter ? ' and signed copy are' : ' is'} copied to their documents.</p>
            </div>
          )}
          {s === 'accepted' && (
            <SignedCopy offer={offer} canUpload={canOffer && !employeeId} onChanged={refresh} />
          )}
          {s === 'accepted' && employeeId && (
            <p className="rounded-lg border border-line bg-bg-subtle px-3 py-2 text-xs text-fg-muted">Hired — the employee record now holds these terms.</p>
          )}

          {s === 'approved' && (
            <p className="rounded-lg border border-dashed border-line-strong px-3 py-2 text-xs text-fg-muted">Ready. Nothing has been sent: download the letter, or email it with an online accept link.</p>
          )}
          {s === 'sent' && offer.sharedOffline && (
            <p className="rounded-lg border border-line bg-bg-subtle px-3 py-2 text-xs text-fg-muted">Shared outside TeamTuned, so there is no online accept link. Use Record answer when the candidate replies.</p>
          )}

          <ApprovalState offer={offer} />

          {canOffer && applicationId && (
            <Link href={`${documentsHref}?candidate=${applicationId}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg underline-offset-4 hover:underline">
              <FilePlus2 className="h-3.5 w-3.5" /> Appointment, joining and other letters
            </Link>
          )}

          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Terms</h3>
            <dl className="divide-y divide-line/60 rounded-xl border border-line px-3.5">
              <Row label="Designation" value={offer.designation || '—'} />
              <Row label="Annual CTC" value={formatInr(offer.annualCtc)} />
              <Row label="Joining date" value={formatDate(offer.joiningDate)} />
              <Row label="Department" value={nameOf(offer.department)} />
              <Row label="Role" value={nameOf(offer.role)} />
              <Row label="Employment type" value={nameOf(offer.employmentType)} />
              <Row label="Site" value={nameOf(offer.site)} />
              {offer.subOrganization && <Row label="Company" value={nameOf(offer.subOrganization)} />}
              <Row label="Probation" value={offer.probationMonths !== null && offer.probationMonths !== undefined ? `${offer.probationMonths} months` : '—'} />
              <Row label="Notice period" value={offer.noticePeriodDays !== null && offer.noticePeriodDays !== undefined ? `${offer.noticePeriodDays} days` : '—'} />
              <Row label="Expires on" value={formatDate(offer.expiresOn)} />
            </dl>
            {offer.notes && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg-muted">{offer.notes}</p>}
            {offer.signatureName && <p className="mt-2 text-xs text-fg-muted">Signed as <span className="font-semibold text-fg">{offer.signatureName}</span></p>}
            {offer.responseNote && <p className="mt-1 text-xs text-fg-muted">Candidate note: {offer.responseNote}</p>}
          </section>

          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Timeline</h3>
            {steps.length === 0 ? (
              <p className="text-xs text-fg-muted">No activity yet.</p>
            ) : (
              <ol className="relative space-y-3 border-l border-line pl-4">
                {steps.map((t) => (
                  <li key={t.key} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-fg" />
                    <p className="text-xs font-semibold text-fg sm:text-sm">{t.label}</p>
                    <p className="text-[11px] tabular-nums text-fg-muted">{formatDateTime(t.at)}{t.note ? ` · ${t.note}` : ''}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirm === 'share'}
        title="Shared another way"
        body={<>Mark the offer as given to <span className="font-semibold text-fg">{candidateName}</span> outside TeamTuned (printed, WhatsApp, someone else’s email). Nothing is sent, and the offer’s expiry starts to count.</>}
        confirmLabel="Mark as shared"
        busy={busy === 'share'}
        onClose={() => setConfirm(null)}
        onConfirm={() => act('share')}
      />
      <OfferLetterDialog offerId={letter && offer ? offer.id : null} mode={letter || 'download'} candidateName={candidateName} onClose={() => setLetter(null)} onDone={refresh} />
      <RecordResponseDialog offerId={recording && offer ? offer.id : null} candidateName={candidateName} onClose={() => setRecording(false)} onDone={refresh} />
      <ConfirmDialog
        open={confirm === 'withdraw'}
        title="Withdraw offer"
        body={s === 'sent' ? 'The candidate can no longer accept this offer. This cannot be undone.' : 'This offer will be withdrawn. This cannot be undone.'}
        confirmLabel="Withdraw"
        danger
        busy={busy === 'withdraw'}
        onClose={() => setConfirm(null)}
        onConfirm={() => act('withdraw')}
      />
    </Drawer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs sm:text-sm">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-right font-semibold tabular-nums text-fg">{value}</dd>
    </div>
  );
}

function ApprovalState({ offer }: { offer: OfferDetailDto }) {
  const a = offer.approval;
  if (offer.status === 'draft' && !a) {
    return <p className="rounded-lg border border-dashed border-line-strong px-3 py-2 text-xs text-fg-muted">Draft — submit it for approval. Until then the letter downloads as a DRAFT copy.</p>;
  }
  if (offer.status !== 'pending_approval' && !a) return null;
  return (
    <section className="rounded-xl border border-line p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-fg sm:text-sm">Approval</h3>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
          {(a?.status || (offer.status === 'pending_approval' ? 'pending' : offer.status)).replace(/_/g, ' ')}
        </span>
      </div>
      {offer.status === 'pending_approval' && <p className="mt-1 text-xs text-fg-muted">Waiting on the approval flow for offers. It can be sent once approved.</p>}
      {a?.approvers && a.approvers.length > 0 && (
        <ul className="mt-2 space-y-1">
          {a.approvers.map((p, i) => (
            <li key={`${p.name}-${i}`} className="flex items-center justify-between text-xs">
              <span className="text-fg">{p.name}</span>
              <span className="tabular-nums text-fg-muted">{(p.decision || 'pending').replace(/_/g, ' ')}{p.at ? ` · ${formatDateTime(p.at)}` : ''}</span>
            </li>
          ))}
        </ul>
      )}
      {a?.note && <p className="mt-2 text-xs text-fg-muted">{a.note}</p>}
    </section>
  );
}

/** The candidate's signed copy: view it, or upload / replace it (accepted offers, before hire). */
function SignedCopy({ offer, canUpload, onChanged }: { offer: OfferDetailDto; canUpload: boolean; onChanged: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(file: File | null) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showError('The file must be 5 MB or smaller'); return; }
    setBusy(true);
    try {
      await api.uploadSignedLetter(offer.id, file);
      showSuccess('Signed copy saved');
      onChanged();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  }
  if (!offer.signedLetter && !canUpload) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-xs">
        <FileCheck2 className="h-4 w-4 shrink-0 text-fg-muted" />
        {offer.signedLetter ? (
          <button type="button" onClick={() => openAsync(async () => (await api.getSignedLetterUrl(offer.id)).url).catch((err) => showError(messageOf(err)))} className="truncate font-semibold text-fg underline-offset-4 hover:underline">
            {offer.signedLetter.name}
          </button>
        ) : (
          <span className="text-fg-muted">No signed copy yet</span>
        )}
        {offer.signedLetter?.uploadedAt && <span className="shrink-0 text-fg-subtle">· {formatDate(offer.signedLetter.uploadedAt)}</span>}
      </span>
      {canUpload && (
        <label className={cx(btn.small, 'cursor-pointer', busy && 'opacity-60')}>
          <Paperclip className="h-3.5 w-3.5" /> {busy ? 'Uploading…' : offer.signedLetter ? 'Replace' : 'Upload signed copy'}
          <input ref={ref} type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files?.[0] || null)} />
        </label>
      )}
    </div>
  );
}
