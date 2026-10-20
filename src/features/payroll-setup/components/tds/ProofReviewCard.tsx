'use client';

import React from 'react';
import { Check, ChevronDown, ExternalLink, Loader2, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { useProofReview } from '../../hooks/useProofReview';
import type { TaxProofDocument } from '../../types/payroll-setup.model';
import { PROOF_SECTION_LABELS, PROOF_SECTION_ORDER } from '../../constants/payroll-setup.constants';
import { formatDate } from '../../utils/validators';
import { TdsCard } from './TdsCard';
import { errorInputClass, fieldErrorClass, inputClass, selectClass, smallButton } from './fields';

const STATUS_TEXT = { pending: 'Waiting', accepted: 'Accepted', rejected: 'Rejected' } as const;

function ProofRow({
  doc,
  canEdit,
  review,
}: {
  doc: TaxProofDocument;
  canEdit: boolean;
  review: ReturnType<typeof useProofReview>;
}) {
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const busy = review.busy === doc.id;
  const error = review.docError?.id === doc.id ? review.docError : null;

  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => review.open(doc)}
          className="inline-flex min-w-0 max-w-full items-center gap-1 text-xs font-semibold text-fg underline-offset-2 hover:underline"
          title="Open"
        >
          <span className="truncate">{doc.fileName}</span>
          <ExternalLink className="h-3 w-3 shrink-0 text-fg-muted" />
        </button>
        <span className={cx('text-[11px]', doc.status === 'rejected' ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>
          {STATUS_TEXT[doc.status]}
          {doc.status === 'rejected' && doc.remarks ? `: ${doc.remarks}` : ''} · {formatDate(doc.uploadedAt)}
        </span>
        {canEdit && !rejecting && (
          <span className="ml-auto flex items-center gap-1.5">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-fg-muted" />}
            {doc.status !== 'accepted' && (
              <button type="button" disabled={busy} onClick={() => review.review(doc, 'accepted')} className={smallButton}>
                <Check className="h-3.5 w-3.5" />
                <span>Accept</span>
              </button>
            )}
            {doc.status !== 'rejected' && (
              <button type="button" disabled={busy} onClick={() => { setRejecting(true); review.clearDocError(); }} className={smallButton}>
                <X className="h-3.5 w-3.5" />
                <span>Reject</span>
              </button>
            )}
          </span>
        )}
      </div>
      {rejecting && (
        <form
          noValidate
          className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await review.review(doc, 'rejected', reason)) {
              setRejecting(false);
              setReason('');
            }
          }}
        >
          <div className="min-w-0 flex-1">
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason, e.g. receipt is not signed"
              maxLength={300}
              className={error?.field === 'remarks' ? errorInputClass : inputClass}
            />
            {error?.field === 'remarks' && <p className={fieldErrorClass}>{error.message}</p>}
          </div>
          <div className="flex gap-1.5">
            <button type="submit" disabled={busy} className={smallButton + ' h-10'}>Reject</button>
            <button type="button" onClick={() => { setRejecting(false); review.clearDocError(); }} className={smallButton + ' h-10'}>Cancel</button>
          </div>
        </form>
      )}
      {error && error.field !== 'remarks' && <p className={fieldErrorClass}>{error.message}</p>}
    </li>
  );
}

export function ProofReviewCard({
  canEdit,
  fyOptions,
  onEnterAmounts,
}: {
  canEdit: boolean;
  fyOptions: string[];
  /** Opens the employee's tax profile at its verified-proofs section. */
  onEnterAmounts: (employee: { id: number; name: string }, financialYear: string) => void;
}) {
  const [fy, setFy] = React.useState(fyOptions[0]);
  const review = useProofReview(fy);

  return (
    <TdsCard
      title="Proofs to review"
      intent="Rent receipts and investment proofs employees uploaded. Accept or reject each file, then enter the verified amounts."
      action={
        <select value={fy} onChange={(e) => setFy(e.target.value)} aria-label="Financial year" className={selectClass}>
          {fyOptions.map((option) => (
            <option key={option} value={option}>FY {option}</option>
          ))}
        </select>
      }
    >
      {review.isLoading ? (
        <div className="h-16 animate-pulse rounded-lg bg-bg-subtle" />
      ) : review.error ? (
        <p className={fieldErrorClass}>{review.error}</p>
      ) : review.employees.length === 0 ? (
        <p className="text-xs text-fg-muted">No proofs uploaded for FY {fy} yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {review.employees.map((emp) => {
            const open = review.openId === emp.employeeId;
            const groups = PROOF_SECTION_ORDER
              .map((section) => ({ section, docs: review.documents.filter((d) => d.section === section) }))
              .filter((g) => g.docs.length > 0);
            return (
              <li key={emp.employeeId} className="rounded-lg border border-line">
                <button
                  type="button"
                  onClick={() => review.toggle(emp.employeeId)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-fg sm:text-sm">{emp.name}</span>
                    <span className="block text-[11px] text-fg-muted">
                      {[emp.code, `${emp.accepted} accepted`, emp.rejected ? `${emp.rejected} rejected` : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {emp.pending > 0 ? (
                      <span className="rounded-full bg-fg px-2 py-0.5 text-[11px] font-semibold text-fg-inverted">{emp.pending} to review</span>
                    ) : (
                      <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-fg-muted">Reviewed</span>
                    )}
                    <ChevronDown className={cx('h-4 w-4 text-fg-subtle transition-transform', open && 'rotate-180')} />
                  </span>
                </button>
                {open && (
                  <div className="space-y-3 border-t border-line px-3 py-3">
                    {review.docsLoading ? (
                      <div className="h-10 animate-pulse rounded-lg bg-bg-subtle" />
                    ) : (
                      groups.map((g) => (
                        <div key={g.section}>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{PROOF_SECTION_LABELS[g.section]}</p>
                          <ul className="divide-y divide-line">
                            {g.docs.map((doc) => (
                              <ProofRow key={doc.id} doc={doc} canEdit={canEdit} review={review} />
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                    {review.docError?.id === 0 && <p className={fieldErrorClass}>{review.docError.message}</p>}
                    {canEdit && (
                      <button type="button" onClick={() => onEnterAmounts({ id: emp.employeeId, name: emp.name }, fy)} className={smallButton}>
                        Enter verified amounts
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </TdsCard>
  );
}
