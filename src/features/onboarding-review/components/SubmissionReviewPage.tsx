'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Download, ExternalLink, FileText, Flag, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { cx } from '@/theme/tokens';
import { useSubmissionReview } from '../hooks/useSubmissionReview';
import { DownloadProfilesDialog } from './components/DownloadProfilesDialog';
import type { ReviewDocumentDto } from '../types/onboarding-review.dto';

const COMPACT = '!h-10 !w-auto !text-sm';
const HEADER_BUTTON = '!h-8 !w-auto !px-3 !text-xs';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Waiting for review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
};

const DOC_STATUS_CLASS: Record<string, string> = {
  verified: 'text-[var(--tt-success)]',
  rejected: 'text-[var(--tt-danger)]',
};

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}

export function SubmissionReviewPage({ employeeId, backHref }: { employeeId: number; backHref: string }) {
  const vm = useSubmissionReview(employeeId);
  const [flagOpen, setFlagOpen] = useState<string | null>(null);
  const [changesOpen, setChangesOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  if (vm.loading && !vm.detail) {
    return <div className="h-[70vh] animate-pulse rounded-xl bg-bg-subtle" />;
  }
  if (!vm.detail) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-sm text-fg-muted">
        Submission not found. <Link href={backHref} className="font-semibold text-fg underline">Back to list</Link>
      </div>
    );
  }

  const detail = vm.detail;
  const canDecide = detail.status === 'submitted';
  const resubmission = canDecide ? detail.last_review ?? null : null;
  const wasFlagged = (key: string) => Boolean(resubmission && `field:${key}` in resubmission.remarks);
  const wasRejected = (doc: ReviewDocumentDto) =>
    Boolean(resubmission?.rejected_documents.some((r) => r.doc_type_key === doc.doc_type_key && r.side === doc.side));
  const selectedDoc = detail.documents.find((d) => d.id === vm.selectedDocId) ?? null;
  const noteCount = Object.keys(vm.allNotes).length;
  const unverified = vm.counts.total - vm.counts.verified - vm.counts.rejected;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={backHref} className="rounded-lg border border-line p-2 text-fg-muted hover:bg-bg-subtle" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-fg sm:text-lg">{detail.name || detail.employee_code}</h1>
            <p className="text-xs text-fg-muted">
              {detail.employee_code} · {STATUS_LABEL[detail.status] ?? detail.status}
              {detail.submitted_at && ` · submitted ${new Date(detail.submitted_at).toLocaleDateString()}`}
              {detail.reviewed_by_name && ` · reviewed by ${detail.reviewed_by_name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-fg-muted">
          <Button variant="secondary" className="!h-8 !w-auto !px-3 !text-xs" onClick={() => setDownloadOpen(true)}>
            <Download className="h-3.5 w-3.5" /> Download PDF
          </Button>
          <span>
            Documents <span className="font-semibold text-fg">{vm.counts.verified}/{vm.counts.total}</span> verified
          </span>
          {vm.counts.rejected > 0 && <span className="font-semibold text-[var(--tt-danger)]">{vm.counts.rejected} rejected</span>}
        </div>
      </div>

      {resubmission && (
        <div className="rounded-xl border border-[var(--tt-primary)]/40 bg-surface p-3 text-sm">
          <p className="font-semibold text-fg">
            Resubmitted after your change request of {new Date(resubmission.requested_at).toLocaleDateString()}
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Fields you flagged are highlighted with what they were before. Re-uploaded documents are marked in the document tabs.
          </p>
          {resubmission.remarks.general && (
            <p className="mt-1 text-xs text-fg-muted">Your note: “{resubmission.remarks.general}”</p>
          )}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
          {detail.config.steps.map((step) => {
            const flagged = step.fields.filter((f) => vm.notes[`field:${f.key}`] !== undefined).length;
            return (
              <section key={step.key} className={cx('rounded-xl border bg-surface p-3.5', flagged ? 'border-[var(--tt-danger)]/50' : 'border-line')}>
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-fg-muted">{step.label}</h2>
                  {flagged > 0 && <span className="text-xs font-semibold text-[var(--tt-danger)]">{flagged} flagged</span>}
                </div>
                <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
                  {step.fields.map((field) => {
                    const noteKey = `field:${field.key}`;
                    const note = vm.notes[noteKey];
                    const isFlagged = note !== undefined;
                    const isOpen = flagOpen === noteKey || isFlagged;
                    const previouslyFlagged = wasFlagged(field.key);
                    const before = previouslyFlagged ? displayValue(resubmission!.previous[field.key]) : null;
                    const changed = previouslyFlagged && before !== displayValue(field.value);
                    return (
                      <div
                        key={field.key}
                        className={cx(
                          'min-w-0 rounded-md',
                          (isOpen || previouslyFlagged) && 'sm:col-span-2',
                          previouslyFlagged && '-mx-1.5 border border-[var(--tt-primary)]/40 bg-[var(--tt-primary)]/5 px-1.5 py-1'
                        )}
                      >
                        <dt className="flex items-center justify-between gap-2 text-[11px] text-fg-muted">
                          <span className={cx(isFlagged && 'font-semibold text-[var(--tt-danger)]')}>{field.label}</span>
                          {canDecide && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isFlagged) {
                                  vm.setNote(noteKey, '');
                                  setFlagOpen(null);
                                } else {
                                  setFlagOpen(isOpen ? null : noteKey);
                                }
                              }}
                              className={cx('inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-bg-subtle', isFlagged ? 'text-[var(--tt-danger)]' : 'text-fg-subtle')}
                              title={isFlagged ? 'Remove flag' : 'Flag this field'}
                            >
                              <Flag className="h-3 w-3" />
                              {isFlagged ? 'Unflag' : 'Flag'}
                            </button>
                          )}
                        </dt>
                        <dd className={cx('flex items-center gap-1 break-words text-sm font-medium', isFlagged ? 'text-[var(--tt-danger)]' : 'text-fg')}>
                          {field.sensitive && <Lock className="h-3 w-3 shrink-0 text-fg-muted" />}
                          {displayValue(field.value)}
                          {previouslyFlagged && (
                            <span
                              className={cx(
                                'ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                changed ? 'bg-[var(--tt-success-soft)] text-[var(--tt-success)]' : 'bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]'
                              )}
                            >
                              {changed ? 'Changed' : 'Not changed'}
                            </span>
                          )}
                        </dd>
                        {previouslyFlagged && (
                          <p className="mt-0.5 text-[11px] text-fg-muted">
                            Was: <span className="line-through">{before}</span> · You asked: “{resubmission!.remarks[`field:${field.key}`]}”
                          </p>
                        )}
                        {canDecide && isOpen && (
                          <input
                            autoFocus={!isFlagged}
                            value={note ?? ''}
                            onChange={(e) => vm.setNote(noteKey, e.target.value)}
                            onBlur={() => !note && setFlagOpen(null)}
                            placeholder="What is wrong? (shown to the employee)"
                            className="mt-1 h-8 w-full rounded-md border border-[var(--tt-danger)]/50 bg-surface px-2 text-xs text-fg outline-none focus:border-[var(--tt-danger)]"
                          />
                        )}
                      </div>
                    );
                  })}
                </dl>
              </section>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {detail.documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => vm.setSelectedDocId(doc.id)}
                className={cx(
                  'flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  doc.id === vm.selectedDocId ? 'border-[var(--tt-primary)] bg-surface text-fg' : 'border-line bg-surface text-fg-muted hover:bg-bg-subtle'
                )}
              >
                {doc.status === 'verified' ? (
                  <Check className="h-3.5 w-3.5 text-[var(--tt-success)]" />
                ) : doc.status === 'rejected' ? (
                  <X className="h-3.5 w-3.5 text-[var(--tt-danger)]" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                {vm.labelFor(doc)}
                {wasRejected(doc) && (
                  <span className="rounded bg-[var(--tt-primary)]/10 px-1 text-[10px] font-bold uppercase text-[var(--tt-primary)]">Re-uploaded</span>
                )}
              </button>
            ))}
          </div>

          {selectedDoc ? (
            <DocumentPanel
              key={selectedDoc.id}
              doc={selectedDoc}
              label={vm.labelFor(selectedDoc)}
              canDecide={canDecide}
              loadUrl={() => vm.previewUrlFor(selectedDoc.id)}
              reloadUrl={() => vm.refreshPreviewUrl(selectedDoc.id)}
              onVerify={() => vm.verifyDocument(selectedDoc.id, 'verified')}
              onReject={(reason) => vm.verifyDocument(selectedDoc.id, 'rejected', reason)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line bg-surface p-6 text-sm text-fg-muted">
              No documents uploaded.
            </div>
          )}
        </div>
      </div>

      {canDecide && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
          <p className="text-xs text-fg-muted">
            {noteCount > 0
              ? `${noteCount} issue${noteCount === 1 ? '' : 's'} will be sent to the employee.`
              : unverified > 0
                ? `${unverified} document${unverified === 1 ? '' : 's'} not checked yet.`
                : 'Everything checked.'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className={COMPACT} onClick={() => setChangesOpen(true)}>
              Request changes{noteCount > 0 ? ` (${noteCount})` : ''}
            </Button>
            <Button
              className={COMPACT}
              onClick={() => setApproveOpen(true)}
              disabled={noteCount > 0}
              title={noteCount > 0 ? 'You flagged issues. Send them with Request changes, or unflag them to approve.' : undefined}
            >
              Approve
            </Button>
          </div>
        </div>
      )}

      <DownloadProfilesDialog open={downloadOpen} onClose={() => setDownloadOpen(false)} employeeIds={[employeeId]} />

      <RequestChangesDialog
        open={changesOpen}
        onClose={() => setChangesOpen(false)}
        notes={vm.allNotes}
        labelFor={vm.noteLabel}
        general={vm.notes.general ?? ''}
        onGeneral={(v) => vm.setNote('general', v)}
        busy={vm.busy}
        onSend={async () => {
          if (await vm.requestChanges()) setChangesOpen(false);
        }}
      />

      <Dialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve onboarding?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className={COMPACT} onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button
              className={COMPACT}
              loading={vm.busy}
              onClick={async () => {
                if (await vm.approve()) setApproveOpen(false);
              }}
            >
              Approve
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-muted">
          {unverified > 0
            ? `${unverified} document${unverified === 1 ? ' is' : 's are'} not marked verified. Approving copies the details into the employee record and gives the employee full access.`
            : 'The details will be copied into the employee record and the employee gets full access.'}
        </p>
      </Dialog>
    </div>
  );
}

function DocumentPanel({
  doc,
  label,
  canDecide,
  loadUrl,
  reloadUrl,
  onVerify,
  onReject,
}: {
  doc: ReviewDocumentDto;
  label: string;
  canDecide: boolean;
  loadUrl: () => Promise<string>;
  reloadUrl: () => Promise<string>;
  onVerify: () => void;
  onReject: (reason: string) => Promise<void> | void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [failed, setFailed] = useState(false);
  const isPdf = doc.mime === 'application/pdf';

  useEffect(() => {
    let alive = true;
    loadUrl()
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  const retry = () => {
    setFailed(false);
    reloadUrl().then(setUrl).catch(() => setFailed(true));
  };

  return (
    <div className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{label}</p>
          <p className={cx('text-xs capitalize text-fg-muted', DOC_STATUS_CLASS[doc.status])}>
            {doc.status}
            {doc.number_last4 ? ` · number •••• ${doc.number_last4}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-fg-muted hover:bg-bg-subtle">
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
          )}
          {canDecide && !rejecting && (
            <>
              <Button
                variant="secondary"
                className={HEADER_BUTTON}
                onClick={() => {
                  setReason(doc.remarks ?? '');
                  setRejecting(true);
                }}
              >
                <X className="h-3.5 w-3.5" /> {doc.status === 'rejected' ? 'Edit reason' : 'Reject'}
              </Button>
              <Button className={HEADER_BUTTON} onClick={onVerify} disabled={doc.status === 'verified'}>
                <Check className="h-3.5 w-3.5" /> {doc.status === 'verified' ? 'Verified' : 'Verify'}
              </Button>
            </>
          )}
        </div>
      </div>

      {canDecide && rejecting && (
        <div className="space-y-2 border-b border-line p-3">
          <Textarea
            label="Why is this document wrong? (shown to the employee)"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Photo is blurry, name not readable, wrong document"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className={HEADER_BUTTON} onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className={HEADER_BUTTON}
              disabled={!reason.trim()}
              onClick={async () => {
                await onReject(reason.trim());
                setRejecting(false);
              }}
            >
              <X className="h-3.5 w-3.5" /> Reject &amp; ask to re-upload
            </Button>
          </div>
        </div>
      )}

      {doc.status === 'rejected' && doc.remarks && !rejecting && (
        <p className="border-b border-line bg-[var(--tt-danger-soft)] px-3 py-2 text-xs text-[var(--tt-danger)]">
          Rejected: {doc.remarks}
        </p>
      )}

      <div className="relative flex h-[min(52vh,calc(100dvh-20rem))] min-h-[260px] items-center justify-center bg-bg-subtle">
        {failed ? (
          <button type="button" onClick={retry} className="text-sm font-semibold text-fg underline">
            Could not load the file. Retry
          </button>
        ) : !url ? (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-[var(--tt-primary)]" />
        ) : isPdf ? (
          <iframe src={url} title={label} className="absolute inset-0 h-full w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} onError={retry} className="max-h-full max-w-full object-contain" />
        )}
      </div>
    </div>
  );
}

function RequestChangesDialog({
  open,
  onClose,
  notes,
  general,
  onGeneral,
  busy,
  onSend,
  labelFor,
}: {
  open: boolean;
  onClose: () => void;
  notes: Record<string, string>;
  labelFor: (key: string) => string | null;
  general: string;
  onGeneral: (v: string) => void;
  busy: boolean;
  onSend: () => void;
}) {
  const listed = Object.entries(notes).filter(([key]) => key !== 'general');
  const canSend = listed.length > 0 || general.trim() !== '';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Send back for changes"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" className={COMPACT} onClick={onClose}>Cancel</Button>
          <Button className={COMPACT} loading={busy} disabled={!canSend} onClick={onSend}>Send to employee</Button>
        </div>
      }
    >
      <div className="space-y-3">
        {listed.length > 0 && (
          <ul className="space-y-1.5 rounded-lg border border-line p-3 text-sm text-fg">
            {listed.map(([key, message]) => (
              <li key={key}>
                • {labelFor(key) ? <span className="font-semibold">{labelFor(key)}: </span> : null}
                {message}
              </li>
            ))}
          </ul>
        )}
        <Textarea label="Anything else? (optional)" rows={3} value={general} onChange={(e) => onGeneral(e.target.value)} />
      </div>
    </Dialog>
  );
}
